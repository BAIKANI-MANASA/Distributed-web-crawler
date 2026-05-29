import hashlib
import html
import json
import logging
import time
from datetime import datetime, timezone
from urllib.parse import urlparse

import aiohttp
from elasticsearch import NotFoundError

from app.core.config import get_settings
from app.models.schemas import SearchResponse, SearchResult
from app.services.elasticsearch_client import get_es
from app.services.kafka_client import publish_event
from app.services.redis_client import get_redis

logger = logging.getLogger(__name__)


def _related(query: str) -> list[str]:
    terms = [term for term in query.lower().split() if len(term) > 2]

    if not terms:
        return []

    return [
        f"{' '.join(terms)} examples",
        f"{' '.join(terms)} guide",
        f"best {' '.join(terms)} resources",
    ]


async def ensure_index_exists():
    es = await get_es()

    if es is None:
        return

    settings = get_settings()

    exists = await es.indices.exists(index=settings.elasticsearch_index)

    if not exists:
        logger.info("Creating Elasticsearch index: %s", settings.elasticsearch_index)

        await es.indices.create(
            index=settings.elasticsearch_index,
            body={
                "settings": {
                    "analysis": {
                        "analyzer": {
                            "autocomplete": {
                                "tokenizer": "autocomplete_tokenizer",
                                "filter": ["lowercase"],
                            },
                            "autocomplete_search": {"tokenizer": "lowercase"},
                        },
                        "tokenizer": {
                            "autocomplete_tokenizer": {
                                "type": "edge_ngram",
                                "min_gram": 2,
                                "max_gram": 20,
                                "token_chars": ["letter", "digit"],
                            }
                        },
                    }
                },
                "mappings": {
                    "properties": {
                        "url": {"type": "keyword"},
                        "title": {"type": "text", "fields": {"keyword": {"type": "keyword"}, "autocomplete": {"type": "text", "analyzer": "autocomplete", "search_analyzer": "autocomplete_search"}}},
                        "description": {"type": "text"},
                        "content": {"type": "text"},
                        "headings": {"type": "text"},
                        "summary": {"type": "text"},
                        "domain": {"type": "keyword"},
                        "favicon": {"type": "keyword"},
                        "source": {"type": "keyword"},
                        "suggest": {
                            "type": "completion"
                        },
                        "timestamp": {"type": "date"},
                        "indexed_at": {"type": "date"},
                    }
                }
            }
        )

        logger.info("Elasticsearch index created successfully")


async def record_search(query: str) -> None:
    redis = await get_redis()

    if redis is None or not query.strip():
        return

    pipe = redis.pipeline()

    pipe.zincrby("analytics:trending", 1, query.lower().strip())
    pipe.incr("analytics:searches:24h")
    pipe.expire("analytics:searches:24h", 24 * 60 * 60)

    await pipe.execute()


def _favicon(url: str) -> str | None:
    parsed = urlparse(url)
    if not parsed.scheme or not parsed.netloc:
        return None
    return f"{parsed.scheme}://{parsed.netloc}/favicon.ico"


def _normalize_url(value: str) -> str:
    value = value.strip()
    if value.startswith(("http://", "https://")):
        return value
    if "." in value and " " not in value:
        return f"https://{value}"
    return value


def _domain(url: str) -> str:
    return urlparse(url).netloc.lower()


def _external_icon(value: str | None, fallback_url: str) -> str | None:
    if not value:
        return _favicon(fallback_url)
    if value.startswith("//"):
        return f"https:{value}"
    if value.startswith("/"):
        return f"https://duckduckgo.com{value}"
    return value


def _flatten_related(items: list[dict]) -> list[dict]:
    flattened: list[dict] = []
    for item in items:
        if item.get("FirstURL"):
            flattened.append(item)
        if isinstance(item.get("Topics"), list):
            flattened.extend(_flatten_related(item["Topics"]))
    return flattened


async def external_search(query: str, page: int, page_size: int) -> list[SearchResult]:
    if page != 1:
        return []

    settings = get_settings()
    params = {
        "q": query,
        "format": "json",
        "no_html": "1",
        "skip_disambig": "1",
    }

    results: list[SearchResult] = []
    normalized_url = _normalize_url(query)
    parsed_query = urlparse(normalized_url)
    if parsed_query.scheme in {"http", "https"} and parsed_query.netloc:
        results.append(
            SearchResult(
                title=parsed_query.netloc,
                url=normalized_url,
                snippet=f"Direct URL result for {normalized_url}",
                favicon=_favicon(normalized_url),
                score=1,
                domain=_domain(normalized_url),
                source="Direct URL",
            )
        )

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(settings.external_search_url, params=params, timeout=8) as response:
                response.raise_for_status()
                payload = await response.json(content_type=None)
    except Exception as exc:
        logger.warning("External search failed for %s: %s", query, exc)
        return results

    if payload.get("AbstractURL"):
        url = payload["AbstractURL"]
        results.append(
            SearchResult(
                title=payload.get("Heading") or _domain(url) or query,
                url=url,
                snippet=payload.get("AbstractText") or payload.get("Abstract") or "External search result",
                favicon=_external_icon(payload.get("Image"), url),
                score=1,
                domain=_domain(url),
                source="DuckDuckGo",
            )
        )

    for item in _flatten_related(payload.get("RelatedTopics", [])):
        url = item.get("FirstURL")
        text = item.get("Text", "")
        if not url or any(existing.url == url for existing in results):
            continue
        title = text.split(" - ", 1)[0].strip() or _domain(url) or url
        results.append(
            SearchResult(
                title=title,
                url=url,
                snippet=text or "External search result",
                favicon=_external_icon(item.get("Icon", {}).get("URL"), url),
                score=0.9,
                domain=_domain(url),
                source="DuckDuckGo",
            )
        )
        if len(results) >= page_size:
            break

    return results[:page_size]


async def index_external_results(query: str, results: list[SearchResult]) -> None:
    es = await get_es()
    if es is None or not results:
        return

    settings = get_settings()
    await ensure_index_exists()
    now = datetime.now(timezone.utc).isoformat()
    for result in results:
        document = {
            "url": result.url,
            "title": result.title,
            "description": result.snippet,
            "content": result.snippet,
            "headings": [],
            "summary": result.snippet,
            "domain": result.domain or _domain(result.url),
            "favicon": result.favicon,
            "source": result.source,
            "suggest": {"input": [query, result.title, result.domain or ""], "weight": 8},
            "timestamp": now,
            "indexed_at": now,
        }
        await es.index(index=settings.elasticsearch_index, id=result.url, document=document, refresh=True)


async def suggestions(q: str) -> list[str]:
    redis = await get_redis()

    if redis is not None and q:
        values = await redis.zrevrangebyscore(
            "analytics:trending",
            "+inf",
            0,
            start=0,
            num=25
        )

        filtered = [
            value for value in values
            if q.lower() in value.lower()
        ]

        if filtered:
            return filtered[:8]

    es = await get_es()
    settings = get_settings()

    if es is None or not q:
        return []

    await ensure_index_exists()

    body = {
        "suggest": {
            "title-suggest": {
                "prefix": q,
                "completion": {
                    "field": "suggest",
                    "size": 8,
                    "skip_duplicates": True,
                },
            }
        }
    }

    try:
        response = await es.search(
            index=settings.elasticsearch_index,
            body=body
        )

        options = (
            response.get("suggest", {})
            .get("title-suggest", [{}])[0]
            .get("options", [])
        )

        return [option["text"] for option in options]

    except NotFoundError:
        return []

    except Exception as exc:
        logger.warning("Suggestion query failed: %s", exc)
        return []


async def search_pages(
    query: str,
    page: int = 1,
    page_size: int = 10,
    domain: str | None = None
) -> SearchResponse:

    started = time.perf_counter()

    settings = get_settings()

    redis = await get_redis()

    cache_key = hashlib.sha256(
        f"{query}:{page}:{page_size}:{domain}".encode()
    ).hexdigest()

    if redis is not None:
        cached = await redis.get(f"search:{cache_key}")

        if cached:
            await redis.incr("analytics:cache:hits")
            payload = json.loads(cached)
            payload["cached"] = True
            return SearchResponse(**payload)

    external_results = await external_search(query, page, page_size)
    if external_results:
        await index_external_results(query, external_results)
        await record_search(query)
        await publish_event(
            settings.search_topic,
            {
                "query": query,
                "results_count": len(external_results),
                "source": "external",
                "searched_at": datetime.now(timezone.utc).isoformat(),
            },
        )
        payload = SearchResponse(
            query=query,
            total=len(external_results),
            took_ms=int((time.perf_counter() - started) * 1000),
            page=page,
            page_size=page_size,
            results=external_results,
            related_searches=_related(query),
        )
        if redis is not None:
            await redis.setex(f"search:{cache_key}", 90, payload.model_dump_json())
        return payload

    es = await get_es()

    if es is None:
        return SearchResponse(
            query=query,
            total=0,
            took_ms=int((time.perf_counter() - started) * 1000),
            page=page,
            page_size=page_size,
            results=[],
            related_searches=_related(query),
        )

    await ensure_index_exists()

    filters = []

    if domain:
        filters.append({
            "term": {
                "domain": domain.lower()
            }
        })

    body = {
        "from": (page - 1) * page_size,
        "size": page_size,
        "query": {
            "bool": {
                "must": [
                    {
                        "bool": {
                            "should": [
                                {
                                    "multi_match": {
                                        "query": query,
                                        "fields": ["title^5", "headings^2", "description^2", "content"],
                                        "fuzziness": "AUTO",
                                    }
                                },
                                {
                                    "multi_match": {
                                        "query": query,
                                        "type": "bool_prefix",
                                        "fields": ["title.autocomplete^4", "title^3", "content"],
                                    }
                                },
                                {"wildcard": {"title.keyword": {"value": f"*{query.lower()}*", "case_insensitive": True, "boost": 1.5}}},
                            ],
                            "minimum_should_match": 1,
                        }
                    }
                ],
                "filter": filters,
            }
        },
        "highlight": {
            "pre_tags": ["<mark>"],
            "post_tags": ["</mark>"],
            "encoder": "html",
            "fields": {
                "content": {
                    "fragment_size": 170,
                    "number_of_fragments": 2
                },
                "description": {}
                ,
                "title": {}
            },
        },
    }

    try:
        response = await es.search(
            index=settings.elasticsearch_index,
            body=body
        )

    except NotFoundError:
        logger.warning("Index not found")

        return SearchResponse(
            query=query,
            total=0,
            took_ms=int((time.perf_counter() - started) * 1000),
            page=page,
            page_size=page_size,
            results=[],
            related_searches=_related(query),
        )

    results: list[SearchResult] = []

    for hit in response["hits"]["hits"]:
        source = hit["_source"]

        highlight = hit.get("highlight", {})

        snippets = (
            highlight.get("content")
            or highlight.get("description")
            or [html.escape(source.get("description", ""))]
        )

        url = source.get("url", "")

        domain_name = (
            source.get("domain")
            or urlparse(url).netloc
        )

        results.append(
            SearchResult(
                title=source.get("title")
                or domain_name
                or "Untitled",

                url=url,

                snippet=" ... ".join(snippets).strip(),

                favicon=source.get("favicon"),

                score=hit.get("_score", 0),

                domain=domain_name,

                source=source.get("source") or "Elasticsearch",

                summary=source.get("summary"),

                highlights=snippets,
            )
        )

    await record_search(query)

    payload = SearchResponse(
        query=query,
        total=response["hits"]["total"]["value"],
        took_ms=response.get(
            "took",
            int((time.perf_counter() - started) * 1000)
        ),
        page=page,
        page_size=page_size,
        results=results,
        related_searches=_related(query),
    )

    await publish_event(
        settings.search_topic,
        {
            "query": query,
            "results_count": payload.total,
            "source": "elasticsearch",
            "searched_at": datetime.now(timezone.utc).isoformat(),
        },
    )

    if redis is not None:
        await redis.setex(
            f"search:{cache_key}",
            90,
            payload.model_dump_json()
        )

    return payload
