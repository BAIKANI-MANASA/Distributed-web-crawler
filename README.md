# AI WebCrawler Search

A full-stack, AI-flavored distributed web search engine built with React, Vite, Tailwind CSS, FastAPI, Elasticsearch, Kafka, Redis, aiohttp, and BeautifulSoup.

## Features

- Google-style home search with suggestions, debounce, keyboard submit, loading states, and voice-search style UI.
- Search results with title, URL, favicon, snippets, highlighted matches, result counts, timing, related searches, pagination, empty states, and errors.
- Responsive dark/light UI with sticky search header, skeleton cards, reusable components, React Router, Axios, and Context-based theme state.
- FastAPI backend with async routes for `/api/crawl`, `/api/search`, `/api/suggestions`, `/api/health`, `/api/stats`, and `/api/ws/stats`.
- Distributed crawler worker using Kafka, Redis URL deduplication, robots.txt checks, concurrent aiohttp fetching, BeautifulSoup extraction, retries via requeue-capable Kafka flow, and Elasticsearch indexing.
- Elasticsearch full-text ranking, fuzzy search, snippets/highlighting, completion suggestions, and domain filtering.
- Admin dashboard with queueing, crawl logs, worker counts, service health, and analytics.
- Docker Compose for Elasticsearch, Redis, Kafka, Zookeeper, backend, crawler, frontend, and Nginx reverse proxy.

## Project Structure

```text
frontend/   React + Vite + Tailwind application
backend/    FastAPI API service
crawler/    Kafka crawler worker and indexing pipeline
docker/     Elasticsearch mapping and sample data
nginx/      Reverse proxy config
```

## Quick Start

1. Copy environment examples if you want to customize values:

```bash
cp backend/.env.example backend/.env
cp crawler/.env.example crawler/.env
cp frontend/.env.example frontend/.env
```

2. Start the stack:

```bash
docker compose up --build
```

3. Open the app:

- Frontend through Nginx: http://localhost:8080
- Frontend container directly: http://localhost:5173
- API docs: http://localhost:8000/docs
- Elasticsearch: http://localhost:9200

## Seed Sample Data

After Elasticsearch is healthy, load the included sample documents:

```bash
curl -X PUT "http://localhost:9200/web_pages" \
  -H "Content-Type: application/json" \
  --data-binary @docker/elasticsearch-mapping.json

curl -X POST "http://localhost:9200/_bulk" \
  -H "Content-Type: application/x-ndjson" \
  --data-binary @docker/sample-data.ndjson
```

Then search for `AI search` or `WebCrawler`.

## API Examples

```bash
curl "http://localhost:8000/api/search?query=distributed%20search"
curl "http://localhost:8000/api/suggestions?q=web"
curl -X POST "http://localhost:8000/api/crawl" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","depth":1,"priority":5}'
curl "http://localhost:8000/api/stats"
```

## Development

Backend:

```bash
cd backend
python -m venv .venv
. .venv/Scripts/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Crawler:

```bash
cd crawler
pip install -r requirements.txt
python worker.py
```

## Production Notes

- Change `ADMIN_TOKEN`, tighten CORS, and add real auth before exposing admin operations publicly.
- Run multiple crawler replicas for higher throughput.
- Put Elasticsearch, Kafka, and Redis behind managed services for production resilience.
- The current summarization is extractive and local; plug an LLM summarizer into `crawler/extractor.py` if abstractive summaries are required.
- Add HTTPS termination, observability, and persistent backups for production deployments.
