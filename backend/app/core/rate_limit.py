import time
from fastapi import HTTPException, Request, status
from app.core.config import get_settings
from app.services.redis_client import get_redis


async def rate_limit(request: Request) -> None:
    settings = get_settings()
    redis = await get_redis()
    if redis is None:
        return
    client = request.client.host if request.client else "unknown"
    bucket = int(time.time() // 60)
    key = f"rate:{client}:{bucket}"
    count = await redis.incr(key)
    if count == 1:
        await redis.expire(key, 70)
    if count > settings.rate_limit_per_minute:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please slow down and try again.",
        )
