from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, WebSocket, WebSocketDisconnect, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.auth.dependencies import get_current_user, require_admin
from app.auth.security import create_access_token, hash_password, verify_password
from app.core.rate_limit import rate_limit
from app.database.session import get_db
from app.core.config import get_settings
from app.models.db_models import CrawlJob, Favorite, SearchHistory, User, UserRole
from app.models.schemas import (
    CrawlRequest,
    CrawlResponse,
    FavoriteCreate,
    FavoriteOut,
    HealthResponse,
    ProfileUpdate,
    SearchHistoryOut,
    SearchResponse,
    StatsResponse,
    SuggestionResponse,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserOut,
)
from app.services.crawl_queue import enqueue_crawl
from app.services.elasticsearch_client import get_es
from app.services.redis_client import get_redis
from app.services.search import search_pages, suggestions
from app.services.stats import collect_stats

router = APIRouter(dependencies=[Depends(rate_limit)])


@router.post("/auth/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> User:
    if payload.role == UserRole.ADMIN and db.query(User).filter(User.role == UserRole.ADMIN).count() > 0:
        raise HTTPException(status_code=403, detail="Only the first admin can self-register")

    user = User(
        name=payload.name.strip(),
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Email already registered") from None
    db.refresh(user)
    return user


@router.post("/auth/login", response_model=TokenResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.query(User).filter(func.lower(User.email) == payload.email.lower()).first()
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(str(user.id), user.role.value)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenResponse)
def login_alias(payload: UserLogin, db: Session = Depends(get_db)) -> TokenResponse:
    return login(payload, db)


@router.post("/auth/logout")
def logout(_: User = Depends(get_current_user)) -> dict[str, str]:
    return {"message": "Logged out"}


@router.post("/logout")
def logout_alias(_: User = Depends(get_current_user)) -> dict[str, str]:
    return {"message": "Logged out"}


@router.get("/auth/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> User:
    return user


@router.post("/crawl/start", response_model=CrawlResponse)
async def crawl_start(request: CrawlRequest, _: User = Depends(require_admin), db: Session = Depends(get_db)) -> CrawlResponse:
    redis = await get_redis()
    if redis is not None:
        await redis.delete("crawler:paused")
    await enqueue_crawl(str(request.url), request.depth, request.priority)
    db.add(CrawlJob(url=str(request.url), depth=request.depth, priority=request.priority, status="QUEUED"))
    db.commit()
    return CrawlResponse(queued=True, url=str(request.url), depth=request.depth, message="URL queued for crawling")


@router.post("/crawl", response_model=CrawlResponse)
async def crawl_alias(request: CrawlRequest, _: User = Depends(require_admin), db: Session = Depends(get_db)) -> CrawlResponse:
    return await crawl_start(request, _, db)


@router.post("/crawl/stop")
async def crawl_stop(_: User = Depends(require_admin)) -> dict[str, str]:
    redis = await get_redis()
    if redis is not None:
        await redis.set("crawler:paused", "1")
        await redis.lpush("crawl:logs", "crawler paused by admin")
    return {"message": "Crawler stop requested"}


@router.get("/search", response_model=SearchResponse)
async def search(
    query: str = Query(None, min_length=1),
    q: str | None = Query(None, min_length=1),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    domain: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SearchResponse:
    query = (query or q or "").strip()
    if not query:
        raise HTTPException(status_code=422, detail="Missing search query")
    response = await search_pages(query=query, page=page, page_size=page_size, domain=domain)
    db.add(SearchHistory(user_id=user.id, query=query.strip(), results_count=response.total))
    db.commit()
    return response


@router.get("/suggestions", response_model=SuggestionResponse)
async def suggest(q: str = Query("", max_length=80), _: User = Depends(get_current_user)) -> SuggestionResponse:
    return SuggestionResponse(suggestions=await suggestions(q))


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    stats = await collect_stats()
    services = {
        "elasticsearch": stats["elasticsearch_health"],
        "redis": stats["redis_status"],
        "kafka": stats["kafka_status"],
        "crawler_workers": "online" if stats["active_workers"] > 0 else "offline",
    }
    status = "ok" if services["redis"] == "ok" and services["elasticsearch"] not in {"error", "unavailable"} and services["kafka"] == "online" else "degraded"
    return HealthResponse(status=status, services=services, details=stats["kafka_details"], timestamp=datetime.now(timezone.utc))


@router.get("/stats", response_model=StatsResponse)
async def stats(_: User = Depends(require_admin)) -> StatsResponse:
    return StatsResponse(**await collect_stats())


@router.get("/profile", response_model=UserOut)
def profile(user: User = Depends(get_current_user)) -> User:
    return user


@router.put("/profile", response_model=UserOut)
def update_profile(payload: ProfileUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> User:
    if payload.name is not None:
        user.name = payload.name.strip()
    if payload.profile_picture is not None:
        user.profile_picture = payload.profile_picture
    if payload.bio is not None:
        user.bio = payload.bio.strip()
    if payload.location is not None:
        user.location = payload.location.strip()
    db.commit()
    db.refresh(user)
    return user


@router.post("/profile/avatar", response_model=UserOut)
async def upload_profile_avatar(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    if file.content_type not in {"image/jpeg", "image/png", "image/webp", "image/gif"}:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP, and GIF images are supported")

    contents = await file.read()
    if len(contents) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Profile images must be 2 MB or smaller")

    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
        suffix = ".png"

    settings = get_settings()
    target_dir = Path(settings.upload_dir) / "profiles"
    target_dir.mkdir(parents=True, exist_ok=True)
    filename = f"user-{user.id}-{uuid4().hex}{suffix}"
    target = target_dir / filename
    target.write_bytes(contents)

    user.profile_picture = f"/uploads/profiles/{filename}"
    db.commit()
    db.refresh(user)
    return user


@router.get("/profile/summary")
async def profile_summary(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    stats = await collect_stats()
    return {
        "user": UserOut.model_validate(user),
        "saved_searches": db.query(SearchHistory).filter(SearchHistory.user_id == user.id).count(),
        "favorites": db.query(Favorite).filter(Favorite.user_id == user.id).count(),
        "active_workers": stats["active_workers"],
        "total_crawled_pages": stats["total_crawled_pages"],
        "elasticsearch_status": stats["elasticsearch_health"],
    }


@router.get("/search/history", response_model=list[SearchHistoryOut])
def search_history(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[SearchHistory]:
    return (
        db.query(SearchHistory)
        .filter(SearchHistory.user_id == user.id)
        .order_by(SearchHistory.created_at.desc())
        .limit(25)
        .all()
    )


@router.get("/history", response_model=list[SearchHistoryOut])
def search_history_alias(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[SearchHistory]:
    return search_history(user, db)


@router.delete("/history/{history_id}")
def delete_history(history_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict[str, str]:
    item = db.query(SearchHistory).filter(SearchHistory.id == history_id, SearchHistory.user_id == user.id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="History item not found")
    db.delete(item)
    db.commit()
    return {"message": "History item deleted"}


@router.get("/favorites", response_model=list[FavoriteOut])
def favorites(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[Favorite]:
    return db.query(Favorite).filter(Favorite.user_id == user.id).order_by(Favorite.created_at.desc()).all()


@router.post("/favorites", response_model=FavoriteOut, status_code=status.HTTP_201_CREATED)
def add_favorite(payload: FavoriteCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Favorite:
    favorite = Favorite(user_id=user.id, title=payload.title, url=str(payload.url), snippet=payload.snippet)
    db.add(favorite)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Favorite already saved") from None
    db.refresh(favorite)
    return favorite


@router.delete("/favorites")
def delete_favorite_by_url(url: str = Query(..., min_length=1), user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict[str, str]:
    favorite = db.query(Favorite).filter(Favorite.user_id == user.id, Favorite.url == url).first()
    if favorite is None:
        raise HTTPException(status_code=404, detail="Favorite not found")
    db.delete(favorite)
    db.commit()
    return {"message": "Favorite deleted"}


@router.delete("/favorites/{favorite_id}")
def delete_favorite(favorite_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict[str, str]:
    favorite = db.query(Favorite).filter(Favorite.id == favorite_id, Favorite.user_id == user.id).first()
    if favorite is None:
        raise HTTPException(status_code=404, detail="Favorite not found")
    db.delete(favorite)
    db.commit()
    return {"message": "Favorite deleted"}


@router.get("/analytics")
async def analytics(_: User = Depends(require_admin)) -> dict:
    return await collect_stats()


@router.get("/admin/users", response_model=list[UserOut])
def admin_users(_: User = Depends(require_admin), db: Session = Depends(get_db)) -> list[User]:
    return db.query(User).order_by(User.created_at.desc()).all()


@router.delete("/admin/users/{user_id}")
def delete_user(user_id: int, current: User = Depends(require_admin), db: Session = Depends(get_db)) -> dict[str, str]:
    if current.id == user_id:
        raise HTTPException(status_code=400, detail="Admins cannot delete themselves")
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": "User deleted"}


@router.delete("/admin/indexed-pages")
async def delete_indexed_pages(_: User = Depends(require_admin)) -> dict[str, str]:
    es = await get_es()
    if es is not None:
        from app.core.config import get_settings

        settings = get_settings()
        exists = await es.indices.exists(index=settings.elasticsearch_index)
        if exists:
            await es.delete_by_query(index=settings.elasticsearch_index, body={"query": {"match_all": {}}}, refresh=True)
    redis = await get_redis()
    if redis is not None:
        await redis.delete("crawl:seen", "crawl:queued")
        await redis.lpush("crawl:logs", "indexed pages deleted by admin")
    return {"message": "Indexed pages deleted"}


@router.websocket("/ws/stats")
async def stats_socket(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        while True:
            await websocket.send_json(await collect_stats())
            await websocket.receive_text()
    except WebSocketDisconnect:
        return
