import traceback
import logging

from fastapi import FastAPI, Request, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from core.config import settings
from db.session import engine, get_db
from api import auth, clients, tickettailor, dashboard, site, checkout

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Talenta Admin API",
    description="Multi-tenant ticketing platform backend",
    version="1.0.0",
)

# ─── Global Exception Handler ────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_msg = traceback.format_exc()
    logger.error(f"UNHANDLED EXCEPTION: {error_msg}")
    
    # Return 500 with details in development, or generic error in production
    return JSONResponse(
        status_code=500,
        content={
            "detail": str(exc),
            "traceback": error_msg if settings.APP_ENV == "dev" else None,
            "path": request.url.path
        },
    )

# ─── CORS ───────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
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
    return {"status": "ok", "service": "Talenta Backend", "env": settings.APP_ENV}


@app.get("/health", tags=["Health"])
def health_check(db: Session = Depends(get_db)):
    try:
        # Check database connection
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        logger.error(f"HEALTH CHECK FAILED: {e}")
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "database": str(e)}
        )
