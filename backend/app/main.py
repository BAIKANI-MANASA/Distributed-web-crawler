from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from app.api.routes import router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.database.session import init_db, seed_default_admin
from app.services.elasticsearch_client import close_es
from app.services.kafka_client import close_producer
from app.services.redis_client import close_redis


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    init_db()
    seed_default_admin()
    yield
    await close_producer()
    await close_es()
    await close_redis()


settings = get_settings()
app = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan)
Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(status_code=500, content={"detail": "Unexpected server error", "path": str(request.url.path)})


app.include_router(router, prefix=settings.api_prefix)
