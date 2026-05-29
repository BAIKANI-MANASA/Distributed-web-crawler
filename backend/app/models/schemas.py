from datetime import datetime
from typing import Any
from pydantic import BaseModel, EmailStr, Field, HttpUrl

from app.models.db_models import UserRole


class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    role: UserRole = UserRole.USER


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: UserRole
    profile_picture: str | None = None
    bio: str | None = None
    location: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ProfileUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    profile_picture: str | None = Field(default=None, max_length=500)
    bio: str | None = Field(default=None, max_length=500)
    location: str | None = Field(default=None, max_length=120)


class CrawlRequest(BaseModel):
    url: HttpUrl
    depth: int = Field(default=1, ge=0, le=5)
    priority: int = Field(default=5, ge=1, le=10)


class CrawlResponse(BaseModel):
    queued: bool
    url: str
    depth: int
    message: str


class SearchResult(BaseModel):
    title: str
    url: str
    snippet: str
    favicon: str | None = None
    score: float = 0
    domain: str | None = None
    source: str = "Elasticsearch"
    summary: str | None = None
    highlights: list[str] = []


class SearchResponse(BaseModel):
    query: str
    total: int
    took_ms: int
    page: int
    page_size: int
    results: list[SearchResult]
    related_searches: list[str] = []
    cached: bool = False


class FavoriteCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    url: HttpUrl
    snippet: str | None = None


class FavoriteOut(BaseModel):
    id: int
    title: str
    url: str
    snippet: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SearchHistoryOut(BaseModel):
    id: int
    query: str
    results_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class SuggestionResponse(BaseModel):
    suggestions: list[str]


class HealthResponse(BaseModel):
    status: str
    services: dict[str, str]
    details: dict[str, Any] = {}
    timestamp: datetime


class StatsResponse(BaseModel):
    total_crawled_pages: int
    queue_size: int
    active_workers: int
    elasticsearch_health: str
    redis_status: str
    kafka_status: str
    trending_searches: list[str]
    recent_crawl_logs: list[dict[str, Any]]
    failed_urls: list[str] = []
    searches_last_24h: int
    redis_cache_hits: int = 0
    kafka_details: dict[str, Any] = {}
