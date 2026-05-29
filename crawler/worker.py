import asyncio
import json
import logging
import signal
from datetime import datetime, timezone
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

import aiohttp
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
from elasticsearch import AsyncElasticsearch
from redis.asyncio import Redis

from config import get_settings
from extractor import extract_page
from indexer import index_page

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s"
)

logger = logging.getLogger("crawler.worker")

settings = get_settings()
stop_event = asyncio.Event()


class RobotsCache:
    def __init__(self) -> None:
        self._cache: dict[str, RobotFileParser] = {}

    async def can_fetch(
        self,
        session: aiohttp.ClientSession,
        url: str
    ) -> bool:

        parsed = urlparse(url)
        base = f"{parsed.scheme}://{parsed.netloc}"

        if base not in self._cache:
            parser = RobotFileParser()
            parser.set_url(f"{base}/robots.txt")

            try:
                async with session.get(parser.url, timeout=6) as response:
                    if response.status < 400:
                        parser.parse(
                            (await response.text()).splitlines()
                        )
                    else:
                        parser.parse([])

            except Exception as exc:
                logger.warning(
                    "Failed loading robots.txt for %s : %s",
                    base,
                    exc
                )
                parser.parse([])

            self._cache[base] = parser

        return self._cache[base].can_fetch(
            settings.user_agent,
            url
        )


async def heartbeat(redis: Redis) -> None:
    while not stop_event.is_set():
        await redis.setex(
            f"worker:{settings.worker_id}:heartbeat",
            20,
            datetime.now(timezone.utc).isoformat()
        )

        await asyncio.sleep(8)


async def enqueue_links(
    producer: AIOKafkaProducer,
    redis: Redis,
    links: list[str],
    depth: int
) -> None:

    if depth <= 0:
        logger.info("Depth limit reached")
        return

    for link in links[:50]:

        if await redis.sismember("crawl:seen", link):
            logger.info("Already seen link: %s", link)
            continue

        logger.info("Queueing link: %s", link)

        await producer.send_and_wait(
            settings.crawl_topic,
            {
                "url": link,
                "depth": depth - 1,
                "priority": 5
            }
        )

        await redis.sadd("crawl:queued", link)


async def fetch(
    session: aiohttp.ClientSession,
    url: str
) -> str | None:

    headers = {
        "User-Agent": settings.user_agent
    }

    logger.info("Fetching URL: %s", url)

    async with session.get(
        url,
        headers=headers,
        timeout=settings.request_timeout_seconds,
        allow_redirects=True
    ) as response:

        logger.info(
            "Response status for %s : %s",
            url,
            response.status
        )

        content_type = response.headers.get(
            "content-type",
            ""
        )

        logger.info(
            "Content-Type for %s : %s",
            url,
            content_type
        )

        if response.status >= 400:
            logger.warning("Bad response for %s", url)
            return None

        if "text/html" not in content_type:
            logger.warning(
                "Skipping non-HTML page: %s",
                url
            )
            return None

        html = await response.text(errors="ignore")

        logger.info(
            "Fetched %s bytes from %s",
            len(html),
            url
        )

        return html


async def handle_message(
    message: dict,
    session: aiohttp.ClientSession,
    robots: RobotsCache,
    redis: Redis,
    es: AsyncElasticsearch,
    producer: AIOKafkaProducer
) -> None:

    logger.info("Received Kafka message: %s", message)

    if await redis.get("crawler:paused"):
        await redis.lpush("crawl:logs", "crawler paused; message skipped")
        return

    url = message["url"]
    depth = int(message.get("depth", 0))
    retry_count = int(message.get("retry_count", 0))

    if await redis.sismember("crawl:seen", url):
        logger.info("Already processed: %s", url)
        return

    allowed = await robots.can_fetch(session, url)

    if not allowed:
        logger.warning("Blocked by robots.txt: %s", url)

        await redis.lpush(
            "crawl:logs",
            f"robots blocked {url}"
        )
        await redis.srem("crawl:queued", url)

        return

    try:
        html = await fetch(session, url)

    except Exception as exc:
        logger.exception(
            "Fetch failed for %s : %s",
            url,
            exc
        )

        html = None

    if not html:

        logger.warning("No HTML returned for %s", url)

        if retry_count < 2:

            logger.info(
                "Retrying %s (attempt %s)",
                url,
                retry_count + 1
            )

            await producer.send_and_wait(
                settings.crawl_topic,
                {
                    **message,
                    "retry_count": retry_count + 1
                }
            )

            await redis.lpush(
                "crawl:logs",
                f"retry {retry_count + 1} {url}"
            )

        else:
            logger.error(
                "Failed permanently: %s",
                url
            )

            await redis.sadd("crawl:seen", url)
            await redis.srem("crawl:queued", url)
            await redis.lpush("crawl:failed", url)
            await redis.ltrim("crawl:failed", 0, 99)

            await redis.lpush(
                "crawl:logs",
                f"failed {url}"
            )

        return

    logger.info("Extracting page data from %s", url)

    try:
        page = extract_page(url, html)

        logger.info(
            "Extracted title: %s",
            page.get("title")
        )

        logger.info(
            "Found %s links",
            len(page.get("links", []))
        )

    except Exception as exc:
        logger.exception(
            "Page extraction failed for %s : %s",
            url,
            exc
        )
        return

    logger.info("Indexing page into Elasticsearch: %s", url)

    try:
        await index_page(es, page)

        logger.info(
            "Successfully indexed: %s",
            url
        )

    except Exception as exc:
        logger.exception(
            "Elasticsearch indexing failed for %s : %s",
            url,
            exc
        )
        await redis.lpush("crawl:failed", url)
        await redis.ltrim("crawl:failed", 0, 99)

        return

    await redis.sadd("crawl:seen", url)
    await redis.srem("crawl:queued", url)
    await redis.zrem("crawl:priority", url)

    logger.info("Enqueueing discovered links")

    await enqueue_links(
        producer,
        redis,
        page["links"],
        depth
    )

    await redis.lpush(
        "crawl:logs",
        f"indexed {url}"
    )

    await redis.ltrim(
        "crawl:logs",
        0,
        99
    )

    logger.info("Finished processing %s", url)


async def main() -> None:

    logger.info("Starting worker...")

    redis = Redis.from_url(
        settings.redis_url,
        decode_responses=True
    )

    es = AsyncElasticsearch(
        settings.elasticsearch_url
    )

    consumer = AIOKafkaConsumer(
        settings.crawl_topic,
        bootstrap_servers=settings.kafka_bootstrap_servers,
        group_id="crawler-workers",
        value_deserializer=lambda raw: json.loads(
            raw.decode("utf-8")
        ),
        enable_auto_commit=True,
    )

    producer = AIOKafkaProducer(
        bootstrap_servers=settings.kafka_bootstrap_servers,
        value_serializer=lambda value: json.dumps(
            value
        ).encode("utf-8"),
    )

    logger.info("Starting Kafka consumer...")
    await consumer.start()

    logger.info("Starting Kafka producer...")
    await producer.start()

    hb = asyncio.create_task(
        heartbeat(redis)
    )

    robots = RobotsCache()

    connector = aiohttp.TCPConnector(
        limit=settings.max_concurrency
    )

    async with aiohttp.ClientSession(
        connector=connector
    ) as session:

        try:
            logger.info("Worker is now listening for messages...")

            async for record in consumer:

                logger.info(
                    "Kafka record received: %s",
                    record.value
                )

                await redis.set(
                    "kafka:last_message",
                    datetime.now(timezone.utc).isoformat(),
                    ex=60
                )

                asyncio.create_task(
                    handle_message(
                        record.value,
                        session,
                        robots,
                        redis,
                        es,
                        producer
                    )
                )

                if stop_event.is_set():
                    break

        finally:

            logger.info("Shutting down worker...")

            hb.cancel()

            await consumer.stop()
            await producer.stop()

            await es.close()

            await redis.aclose()


def shutdown(*_: object) -> None:
    logger.info("Shutdown signal received")
    stop_event.set()


if __name__ == "__main__":

    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)

    asyncio.run(main())
