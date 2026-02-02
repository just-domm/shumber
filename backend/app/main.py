import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import analysis, auth, inventory
from .db import Base, SessionLocal, engine
from .seed import seed_data

APP_NAME = os.getenv("APP_NAME", "ShambaSmart API")

app = FastAPI(title=APP_NAME)

origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins if o.strip()],
    allow_credentials=True,
    allow_methods=["*"] ,
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    # Keep the demo DB ready on boot so the UI has something to render.
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_data(db)


@app.get("/health")
def health() -> dict[str, str]:
    # Tiny liveness check for deploys.
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(inventory.router)
app.include_router(analysis.router)
