# Distributed Web Crawler Backend

A scalable backend for a distributed web crawler built with Python, FastAPI, Kafka, Redis, Elasticsearch, and Docker.

The backend accepts crawl requests, distributes URLs through Kafka, processes pages with worker services, deduplicates URLs using Redis, and indexes extracted content in Elasticsearch for search.

---

## Live API

- Backend API: https://distributed-web-crawler-api.onrender.com

---

## Features

- Distributed crawling architecture with Kafka
- URL deduplication using Redis
- Full-text search indexing in Elasticsearch
- Asynchronous crawling with aiohttp
- FastAPI REST endpoints
- Search suggestions and highlighted results
- Dockerized development and production setup
- Health monitoring endpoint

---

## Tech Stack

- Python 3.11
- FastAPI
- Kafka
- Redis
- Elasticsearch
- aiohttp
- BeautifulSoup4
- Docker
- Render

---

## Architecture Overview

```text
Client
  │
  ▼
FastAPI API
  │
  ▼
Kafka Queue
  │
  ▼
Crawler Workers
  │  ├─ Redis Deduplication
  │  ├─ BeautifulSoup Parsing
  │  └─ Elasticsearch Indexing
  ▼
Elasticsearch
```

---

## Getting Started

### Clone the repository

```bash
git clone https://github.com/BAIKANI-MANASA/Distributed-web-crawler.git
cd Distributed-web-crawler/backend
```

### Create a virtual environment

Windows:

```bash
python -m venv venv
venv\Scripts\activate
```

Linux / Mac:

```bash
python3 -m venv venv
source venv/bin/activate
```

### Install dependencies

```bash
pip install -r requirements.txt
```

---

## Environment Variables

Create a `.env` file in the backend folder with the following values:

```env
ELASTICSEARCH_URL=http://localhost:9200
REDIS_HOST=localhost
REDIS_PORT=6379
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
INDEX_NAME=crawler_pages
```

---

## Run Services

### Elasticsearch

```bash
docker run -d -p 9200:9200 -e discovery.type=single-node elasticsearch:8.12.0
```

### Redis

```bash
docker run -d -p 6379:6379 redis
```

### Kafka

```bash
docker compose up kafka
```

---

## Run the Backend

```bash
uvicorn app.main:app --reload
```

## Run the Worker

```bash
python worker.py
```

---

## API Endpoints

### Crawl Website

```http
POST /api/crawl
```

### Search Pages

```http
GET /api/search?q=keyword
```

### Suggestions

```http
GET /api/suggestions?q=java
```

### Health Check

```http
GET /health
```

---

## Docker Deployment

Build the services:

```bash
docker compose build
```

Start the application:

```bash
docker compose up -d
```

View logs:

```bash
docker compose logs -f
```

Stop the services:

```bash
docker compose down
```

---

## Render Deployment

### Push code

```bash
git add .
git commit -m "deploy"
git push origin main
```

### Render configuration

- Create a new Web Service on Render
- Connect your GitHub repository
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Add environment variables in Render:
  - `ELASTICSEARCH_URL`
  - `REDIS_HOST`
  - `REDIS_PORT`
  - `KAFKA_BOOTSTRAP_SERVERS`

---

## Author

BAIKANI MANASA

GitHub: https://github.com/BAIKANI-MANASA

Project: Distributed Web Crawler – Google Search Engine Inspired System.
