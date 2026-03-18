from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import Optional, List, Union
from functools import lru_cache


class Settings(BaseSettings):
    # Project Metadata
    PROJECT_NAME: str = "Talenta API"
    VERSION: str = "1.0.0"
    APP_ENV: str = "dev"  

    # Database
    DATABASE_URL: str
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10

    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Cookie
    COOKIE_SECURE: bool = True          
    COOKIE_SAMESITE: str = "none"         
    COOKIE_DOMAIN: Optional[str] = None  

    # Frontend
    FRONTEND_URL: str

    # CORS
    BACKEND_CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://localhost:3000"
    ]


    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    # Stripe
    STRIPE_SECRET_KEY: str
    STRIPE_WEBHOOK_SECRET: str

    # Admin seed credentials
    ADMIN_EMAIL: str
    ADMIN_PASSWORD: str
    ADMIN_FULL_NAME: str = "User Admin"

    # SMTP Email settings
    SMTP_EMAIL: str
    SMTP_APP_PASSWORD: str
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    
    # Ticket Tailor
    TT_BASE_URL: str = "https://api.tickettailor.com/v1"

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="allow",
        case_sensitive=True,
        env_parse_list_separator=",",
    )



@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
