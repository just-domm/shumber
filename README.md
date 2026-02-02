Shumber is a marketplace experience for surplus harvests with real-time chat, escrow, and AI produce analysis. It includes a Next.js frontend and a FastAPI backend backed by Postgres.

## Features

- Marketplace heatmap and hub drilldowns
- Farmer onboarding with AI quality grading
- Buyer–farmer chat and escrow flow
- Postgres-backed inventory and messages

## Quick Start (Docker)

```bash
cp backend/.env.example backend/.env
# set GEMINI_API_KEY in backend/.env
docker compose up --build
```

Frontend: `http://localhost:3000`  
Backend: `http://localhost:8000`

## Local Dev (no Docker)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000 --env-file .env
```

### Frontend

```bash
npm install
npm run dev
```

## Environment

Set these in `backend/.env`:

- `DATABASE_URL` (Postgres)
- `GEMINI_API_KEY`
- `GEMINI_MODEL` (default: `gemini-2.5-flash`)
- `JWT_SECRET`

## Notes

- Use a buyer account to start escrow; farmers can open chats from the Farmer Inbox.
- The app persists route/selection state across reloads.

## Troubleshooting

- If `/analysis` fails, verify `GEMINI_API_KEY` and model availability.
- If inventory image uploads fail, confirm Postgres is running and reachable.

## Scripts

- Frontend: `npm run dev`, `npm run build`
- Backend: `uvicorn app.main:app --reload --port 8000 --env-file .env`

## Project Structure

- `app/` Next.js UI
- `backend/` FastAPI service
- `services/` frontend API client
