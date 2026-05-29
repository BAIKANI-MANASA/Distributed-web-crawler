import json
import logging
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
from aiokafka.admin import AIOKafkaAdminClient, NewTopic
from app.core.config import get_settings

logger = logging.getLogger(__name__)
_producer: AIOKafkaProducer | None = None


async def get_producer() -> AIOKafkaProducer | None:
    global _producer
    if _producer is not None:
        return _producer
    settings = get_settings()
    try:
        _producer = AIOKafkaProducer(
            bootstrap_servers=settings.kafka_bootstrap_servers,
            value_serializer=lambda value: json.dumps(value).encode("utf-8"),
        )
        await _producer.start()
        return _producer
    except Exception as exc:
        logger.warning("Kafka producer unavailable: %s", exc)
        _producer = None
        return None


async def close_producer() -> None:
    global _producer
    if _producer is not None:
        await _producer.stop()
        _producer = None


async def publish_event(topic: str, payload: dict) -> bool:
    producer = await get_producer()
    if producer is None:
        return False
    try:
        await producer.send_and_wait(topic, payload)
        return True
    except Exception as exc:
        logger.warning("Kafka publish failed for topic %s: %s", topic, exc)
        return False


async def kafka_health() -> dict:
    settings = get_settings()
    details = {
        "broker": "offline",
        "topics": "offline",
        "producer": "offline",
        "consumer": "offline",
        "status": "offline",
        "available_topics": [],
    }

    admin = AIOKafkaAdminClient(bootstrap_servers=settings.kafka_bootstrap_servers)
    try:
        await admin.start()
        topics = await admin.list_topics()
        details["broker"] = "online"
        details["available_topics"] = sorted(topics)
        required_topics = {settings.crawl_topic, settings.search_topic}
        missing_topics = required_topics.difference(topics)
        if missing_topics:
            await admin.create_topics(
                [NewTopic(name=topic, num_partitions=1, replication_factor=1) for topic in missing_topics],
                validate_only=False,
            )
            topics = await admin.list_topics()
        details["available_topics"] = sorted(topics)
        details["topics"] = "online" if required_topics.issubset(topics) else "reconnecting"
    except Exception as exc:
        logger.warning("Kafka broker/topic health check failed: %s", exc)
        return details
    finally:
        try:
            await admin.close()
        except Exception:
            pass

    producer = await get_producer()
    details["producer"] = "online" if producer is not None else "offline"

    consumer = AIOKafkaConsumer(
        settings.crawl_topic,
        bootstrap_servers=settings.kafka_bootstrap_servers,
        group_id="health-check",
        enable_auto_commit=False,
    )
    try:
        await consumer.start()
        details["consumer"] = "online"
    except Exception as exc:
        logger.warning("Kafka consumer health check failed: %s", exc)
        details["consumer"] = "offline"
    finally:
        try:
            await consumer.stop()
        except Exception:
            pass

    checks = [details["broker"], details["topics"], details["producer"], details["consumer"]]
    if all(value == "online" for value in checks):
        details["status"] = "online"
    elif any(value == "online" for value in checks):
        details["status"] = "reconnecting"
    return details
