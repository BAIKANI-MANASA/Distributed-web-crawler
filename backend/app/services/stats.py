from app.services.elasticsearch_client import get_es
from app.services.redis_client import get_redis
from app.core.config import get_settings
from app.services.kafka_client import kafka_health


async def collect_stats() -> dict:
    settings = get_settings()
    redis = await get_redis()
    es = await get_es()

    total_pages = 0
    es_health = "unavailable"
    if es is not None:
        try:
            total_pages = (await es.count(index=settings.elasticsearch_index)).get("count", 0)
            es_health = (await es.cluster.health()).get("status", "unknown")
        except Exception:
            es_health = "error"

    queue_size = active_workers = searches_24h = 0
    redis_status = "unavailable"
    trending: list[str] = []
    logs: list[dict] = []
    failed_urls: list[str] = []
    kafka_details = await kafka_health()
    kafka_status = kafka_details["status"]
    redis_cache_hits = 0
    if redis is not None:
        try:
            redis_status = "ok" if await redis.ping() else "error"
            queue_size = await redis.scard("crawl:queued")
            active_workers = len(await redis.keys("worker:*:heartbeat"))
            trending = await redis.zrevrange("analytics:trending", 0, 7)
            searches_24h = int(await redis.get("analytics:searches:24h") or 0)
            redis_cache_hits = int(await redis.get("analytics:cache:hits") or 0)
            raw_logs = await redis.lrange("crawl:logs", 0, 25)
            logs = [{"message": item} for item in raw_logs]
            failed_urls = await redis.lrange("crawl:failed", 0, 25)
        except Exception:
            redis_status = "error"

    return {
        "total_crawled_pages": total_pages,
        "queue_size": queue_size,
        "active_workers": active_workers,
        "elasticsearch_health": es_health,
        "redis_status": redis_status,
        "kafka_status": kafka_status,
        "trending_searches": trending,
        "recent_crawl_logs": logs,
        "failed_urls": failed_urls,
        "searches_last_24h": searches_24h,
        "redis_cache_hits": redis_cache_hits,
        "kafka_details": kafka_details,
    }
