from pydantic_settings import BaseSettings
from typing import Optional, List
from functools import lru_cache


class Settings(BaseSettings):
    # Project Metadata
    PROJECT_NAME: str = "Talenta API"
    VERSION: str = "1.0.0"
    APP_ENV: str = "dev"  # dev, prod, test

    # Database
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/talenta_db"
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10

    # JWT
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Cookie
    COOKIE_SECURE: bool = False          # Set True in production (HTTPS)
    COOKIE_SAMESITE: str = "lax"         # "lax" | "strict" | "none"
    COOKIE_DOMAIN: Optional[str] = None  # Set to your root domain in production

    # CORS
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    # Stripe
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    # Admin seed credentials
    ADMIN_EMAIL: str = "hariharan8351@gmail.com"
    ADMIN_PASSWORD: str = "Bhari007@1"
    ADMIN_FULL_NAME: str = "Hariharan"

    # SMTP Email settings
    SMTP_EMAIL: str = ""
    SMTP_APP_PASSWORD: str = ""
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    
    # Ticket Tailor
    TT_BASE_URL: str = "https://api.tickettailor.com/v1"

    class Config:
        env_file = ".env"
        extra = "allow"



@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
