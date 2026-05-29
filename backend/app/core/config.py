from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "AI WebCrawler Search"
    api_prefix: str = "/api"
    environment: str = "development"
    cors_origins: str = "http://localhost:5173,http://localhost:8080"

    elasticsearch_url: str = "http://elasticsearch:9200"
    elasticsearch_index: str = "web_pages"
    redis_url: str = "redis://redis:6379/0"
    kafka_bootstrap_servers: str = "kafka:9092"
    crawl_topic: str = "crawl-requests"
    search_topic: str = "search-events"
    external_search_url: str = "https://api.duckduckgo.com/"
    database_url: str = "postgresql://crawler:crawler@postgres:5432/crawler"
    jwt_secret_key: str = "change-this-secret-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    default_admin_email: str = "manasa@gmail.com"
    default_admin_password: str = "12345678"
    default_admin_name: str = "Manasa Admin"
    upload_dir: str = "uploads"

    crawl_max_depth: int = 2
    crawl_default_limit: int = 25
    rate_limit_per_minute: int = 90
    admin_token: str = "change-me"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
