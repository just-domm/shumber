# Software Requirements Specification (SRS) — Shumber

Date: 2026-02-12

## 1. Purpose
Shumber is a marketplace for surplus harvests connecting farmers and buyers with features for inventory listing, bidding, buyer–farmer chat, escrow workflow, and AI-driven produce analysis.

## 2. Scope
- Frontend: Next.js (React) app served on port 3000.
- Backend: FastAPI service exposing REST endpoints on port 8000.
- Persistence: Postgres via SQLAlchemy.
- AI: Google GenAI (Gemini) for image/audio analysis.

## 3. Actors
- Farmer: uploads photos, lists inventory, opens chats, receives bids.
- Buyer: browses/filters inventory, bids, starts escrow, chats.
- Operator/Admin: deploys and monitors services.

## 4. High-level Capabilities
- Auth: register/login and JWT-based session (`/auth/*`).
- Inventory: create, list, heatmap aggregation (`/inventory/*`).
- Chat: message history per inventory (`/chat/{inventory_id}/messages`).
- Escrow: start, verify, release escrow (`/escrow/*`).
- AI Analysis: server-side image analysis (`/analysis`) using Gemini.

## 5. Functional Requirements (concise mapping)
- FR1: `POST /auth/register` — create user; returns JWT token.
- FR2: `POST /auth/login` — authenticate; returns JWT token.
- FR3: `GET /auth/me` — return current user profile.
- FR4: `GET /inventory` — list inventory with filters `crop_name`, `status`, `location`.
- FR5: `POST /inventory` — (farmer-only) create inventory listing.
- FR6: `GET /inventory/heatmap` — aggregated heat points for mapping.
- FR7: `GET /chat/{inventory_id}/messages` — list messages.
- FR8: `POST /chat/{inventory_id}/messages` — (auth) create message.
- FR9: `GET /escrow/{inventory_id}` — get escrow record.
- FR10: `POST /escrow/{inventory_id}/start` — (buyer-only) start/update escrow.
- FR11: `POST /escrow/{inventory_id}/verify` — mark escrow verified.
- FR12: `POST /escrow/{inventory_id}/release` — mark escrow released and inventory SOLD.
- FR13: `POST /analysis` — accept `{ image_base64 }`, return `{ cropName, freshnessScore, estimatedShelfLife, marketInsight }`.

## 6. API Examples
All authenticated endpoints require header: `Authorization: Bearer <token>`.

- Register (example request/response)

Request

POST /auth/register

Body

{
  "name": "Mzee Juma",
  "email": "juma@example.com",
  "password": "secret123",
  "role": "FARMER",
  "location": "Molo"
}

Response (201)

{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "expires_in": 3600
}

- Create inventory (farmer)

POST /inventory

Body (JSON)

{
  "crop_name": "Potatoes",
  "quantity": 500,
  "quality_score": 88,
  "base_price": 45,
  "current_bid": 45,
  "location": { "name": "Njoro", "lat": -0.3411, "lng": 35.94 },
  "image_url": "data:image/jpeg;base64,...",
  "listing_type": "BIDDING"
}

Response (201): `CropInventoryOut` object with `id` and `timestamp`.

- Analyze image

POST /analysis

Body

{ "image_base64": "data:image/jpeg;base64,..." }

Response (200)

{
  "cropName": "Potatoes",
  "freshnessScore": 88.5,
  "estimatedShelfLife": "7 days",
  "marketInsight": "Local demand rising; consider listing larger lots."
}

- Chat send message

POST /chat/{inventory_id}/messages

Body

{ "text": "Is this still available?" }

Response (201): `MessageOut` with `id`, `sender_id`, `timestamp`.

- Escrow start

POST /escrow/{inventory_id}/start

Body (optional)

{ "amount": 20000 }

Response (201): `EscrowOut` with `status: PENDING`.

## 7. Data Models (summary)
- User: `id`, `name`, `email`, `role` (FARMER|BUYER), `location`, `rating`, `hashed_password`, `created_at`.
- Inventory: `id`, `farmer_id`, `farmer_name`, `crop_name`, `quantity`, `quality_score`, `base_price`, `current_bid`, `highest_bidder_id`, `location_name`, `location_lat`, `location_lng`, `image_url`, `timestamp`, `status` (AVAILABLE|NEGOTIATING|SOLD), `listing_type` (BIDDING|FIXED).
- Message: `id`, `inventory_id`, `sender_id`, `text`, `timestamp`.
- Escrow: `id`, `inventory_id` (unique), `buyer_id`, `amount`, `status` (PENDING|VERIFIED|RELEASED), `created_at`, `updated_at`.

(See `backend/app/models.py` and `backend/app/schemas.py` for full definitions.)

## 8. Non-functional Requirements (expanded)
- Performance: API list/filters return < 500ms for moderate datasets; heatmap aggregation < 1s for typical demo.
- Latency: AI analysis expected 1–10s depending on external service; UI must show progress state.
- Scalability: Stateless backend; scale via multiple FastAPI workers behind load-balancer; Postgres for persistence.
- Security: TLS for all external traffic; strong secret management for `JWT_SECRET` and `GEMINI_API_KEY`.
- Reliability: Health endpoint `/health` for liveness checks; DB migrations and seed on startup.

## 9. Security (detailed)
- Authentication: JWT bearer tokens created with `create_access_token` and signed by `JWT_SECRET`. Tokens include `user_id` and expiry.
- Authorization rules enforced server-side:
  - Only `FARMER` may `POST /inventory`.
  - Only `BUYER` may `POST /escrow/{inventory_id}/start`.
- Passwords hashed using a secure hashing method (see `backend/app/core/security.py`).
- Input validation: Pydantic models validate and coerce request payloads.
- CORS: Configurable via `CORS_ORIGINS` (default `http://localhost:3000`).
- Secrets: `GEMINI_API_KEY`, `JWT_SECRET` must be set via environment variables and not checked into source control.

## 10. Deployment & Operations (expanded)
- Development (local)

Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate  # on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000 --env-file .env
```

Frontend

```bash
npm install
npm run dev
```

- Docker: `docker compose up --build` (root contains `docker-compose.yml`).
- Ports: Frontend 3000, Backend 8000.
- Health checks: probe `GET /health`.
- Environment variables required (backend):
  - `DATABASE_URL` (Postgres)
  - `JWT_SECRET`
  - `GEMINI_API_KEY`
  - `GEMINI_MODEL` (optional)
- Scaling: run multiple FastAPI workers (e.g., Gunicorn + Uvicorn workers) and use a managed Postgres. Use a queue for long-running AI tasks if latency becomes problematic.

## 11. Assumptions & Limitations
- Escrow is an application-level record—no integrated payment processor.
- Chat is REST-polling (no websocket/real-time push implemented yet).
- AI analysis depends on availability and quota of the Gemini model.

## 12. Appendix — Key files
- [README.md](README.md)
- [backend/app/main.py](backend/app/main.py)
- [backend/app/models.py](backend/app/models.py)
- [backend/app/schemas.py](backend/app/schemas.py)
- [backend/app/api/auth.py](backend/app/api/auth.py)
- [backend/app/api/inventory.py](backend/app/api/inventory.py)
- [backend/app/api/chat.py](backend/app/api/chat.py)
- [backend/app/api/escrow.py](backend/app/api/escrow.py)
- [services/api.ts](services/api.ts)
- [services/geminiService.ts](services/geminiService.ts)


