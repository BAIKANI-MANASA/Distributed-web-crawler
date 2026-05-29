from datetime import datetime, timezone
from elasticsearch import AsyncElasticsearch
from config import get_settings


async def ensure_index(es: AsyncElasticsearch) -> None:
    settings = get_settings()
    exists = await es.indices.exists(index=settings.elasticsearch_index)
    if exists:
        return
    mapping = {
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
                "domain": {"type": "keyword"},
                "title": {"type": "text", "fields": {"keyword": {"type": "keyword"}, "autocomplete": {"type": "text", "analyzer": "autocomplete", "search_analyzer": "autocomplete_search"}}},
                "description": {"type": "text"},
                "headings": {"type": "text"},
                "content": {"type": "text"},
        "summary": {"type": "text"},
        "favicon": {"type": "keyword", "index": False},
        "links": {"type": "keyword"},
        "suggest": {"type": "completion"},
        "timestamp": {"type": "date"},
        "indexed_at": {"type": "date"},
            }
        },
    }
    await es.indices.create(index=settings.elasticsearch_index, body=mapping)


async def index_page(es: AsyncElasticsearch, page: dict) -> None:
    await ensure_index(es)
    document = {
        **page,
        "suggest": {"input": [page["title"], page["domain"], *page["headings"][:5]], "weight": 10},
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "indexed_at": datetime.now(timezone.utc).isoformat(),
    }
    await es.index(index=get_settings().elasticsearch_index, id=page["url"], document=document, refresh=True)
