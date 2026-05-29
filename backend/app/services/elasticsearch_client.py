import logging
from elasticsearch import AsyncElasticsearch
from app.core.config import get_settings

logger = logging.getLogger(__name__)
_client: AsyncElasticsearch | None = None


async def get_es() -> AsyncElasticsearch | None:
    global _client
    if _client is not None:
        return _client
    settings = get_settings()
    try:
        _client = AsyncElasticsearch(settings.elasticsearch_url)
        await _client.info()
        return _client
    except Exception as exc:
        logger.warning("Elasticsearch unavailable: %s", exc)
        _client = None
        return None


async def close_es() -> None:
    global _client
    if _client is not None:
        await _client.close()
        _client = None
