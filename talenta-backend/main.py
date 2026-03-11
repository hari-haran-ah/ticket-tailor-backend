import traceback
import logging

from fastapi import FastAPI, Request, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from core.config import settings
from api import auth, clients, tickettailor, dashboard, site, checkout
from db.session import engine, get_db, SessionLocal
from models.client import Client

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

# ─── Dynamic CORS Middleware ────────────────────────────────────────────────
# Allows any origin that is registered in our 'clients' database table
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

def clean_origin_for_cors(origin: str) -> str:
    if not origin: return ""
    return origin.replace("https://", "").replace("http://", "").split(":")[0].rstrip("/").lower()

class DynamicCORSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin")
        allowed_origin = False
        
        # 1. Check if the origin is a Static Admin Origin
        if origin and origin in [str(o).rstrip("/") for o in settings.BACKEND_CORS_ORIGINS]:
            allowed_origin = True
            
        # 2. If not an Admin Origin, check if it's a Dynamic Client Origin from the DB
        if origin and not allowed_origin:
            cleaned = clean_origin_for_cors(origin)
            db = SessionLocal()
            try:
                client = db.query(Client).filter(
                    (Client.domain_name.ilike(f"%{cleaned}%")) & (Client.is_active == True)
                ).first()
                if client:
                    allowed_origin = True
            finally:
                db.close()
                
        # Handle Preflight (OPTIONS) requests
        if request.method == "OPTIONS":
            response = Response()
            if allowed_origin:
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
                response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
                response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Client-ID, X-Requested-With"
                response.headers["Access-Control-Expose-Headers"] = "X-Client-ID"
            return response

        # Handle regular requests
        response = await call_next(request)
        if allowed_origin:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Expose-Headers"] = "X-Client-ID"
            
        return response

app.add_middleware(DynamicCORSMiddleware)


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
