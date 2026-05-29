import logging
from datetime import datetime, timezone
from app.core.config import get_settings
from app.services.kafka_client import get_producer
from app.services.redis_client import get_redis

logger = logging.getLogger(__name__)


async def enqueue_crawl(url: str, depth: int, priority: int) -> bool:
    settings = get_settings()
    redis = await get_redis()
    if redis is not None:
        already_queued = await redis.sismember("crawl:queued", url)
        already_seen = await redis.sismember("crawl:seen", url)
        if already_queued or already_seen:
            return True

    producer = await get_producer()
    payload = {
        "url": url,
        "depth": depth,
        "priority": priority,
        "queued_at": datetime.now(timezone.utc).isoformat(),
    }
    if producer is not None:
        await producer.send_and_wait(settings.crawl_topic, payload)
    else:
        logger.warning("Kafka unavailable; recording crawl request in Redis only")

    if redis is not None:
        await redis.sadd("crawl:queued", url)
        await redis.zadd("crawl:priority", {url: priority})
        await redis.lpush("crawl:logs", f"queued {url}")
        await redis.ltrim("crawl:logs", 0, 99)
    return True
