from functools import lru_cache
import socket
from pydantic_settings import BaseSettings, SettingsConfigDict


class CrawlerSettings(BaseSettings):
    elasticsearch_url: str = "http://elasticsearch:9200"
    elasticsearch_index: str = "web_pages"
    redis_url: str = "redis://redis:6379/0"
    kafka_bootstrap_servers: str = "kafka:9092"
    crawl_topic: str = "crawl-requests"
    worker_id: str = socket.gethostname()
    max_concurrency: int = 10
    request_timeout_seconds: int = 12
    user_agent: str = "AI-WebCrawler/1.0 (+https://localhost)"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


@lru_cache
def get_settings() -> CrawlerSettings:
    return CrawlerSettings()
