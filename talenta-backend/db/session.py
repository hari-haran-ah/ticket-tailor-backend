from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from core.config import settings
from db.base import Base

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_db_and_tables():
    from models import admin, client, payment
    Base.metadata.create_all(bind=engine)
