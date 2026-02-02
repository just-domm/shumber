# ShambaSmart Backend (FastAPI)

Minimal API to power auth + inventory/heatmap data for the frontend.

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Set `GEMINI_API_KEY` in `.env` to enable the `/analysis` endpoint, and make sure
`DATABASE_URL` points at Postgres.

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

## Docker

From the repo root:

```bash
docker compose up --build
```

## Auth

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

## Inventory

- `GET /inventory` (filters: `crop_name`, `status`, `location`)
- `POST /inventory` (farmer-only, requires Bearer token)
- `GET /inventory/heatmap` (filters: `crop_name`, `status`)

## Analysis

- `POST /analysis`

## Chat

- `GET /chat/{inventory_id}/messages`
- `POST /chat/{inventory_id}/messages`

## Escrow

- `GET /escrow/{inventory_id}`
- `POST /escrow/{inventory_id}/start`
- `POST /escrow/{inventory_id}/verify`
- `POST /escrow/{inventory_id}/release`

## Quick Test

```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"mzee@example.com","password":"password123"}'
```
