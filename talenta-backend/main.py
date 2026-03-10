from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from api import auth, clients, tickettailor, dashboard, site, checkout

app = FastAPI(
    title="Talenta Admin API",
    description="Multi-tenant ticketing platform backend",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(clients.router)
app.include_router(tickettailor.router)
app.include_router(dashboard.router)
app.include_router(site.router)
app.include_router(checkout.router)


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "service": "Talenta Backend"}
