"""
Inisialisasi database SQLite async dengan SQLAlchemy
"""
import os
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker,
)
from sqlalchemy.orm import DeclarativeBase

DATABASE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
DATABASE_URL = f"sqlite+aiosqlite:///{DATABASE_DIR}/bot.db"


class Base(DeclarativeBase):
    pass


# Buat engine async
engine = create_async_engine(DATABASE_URL, echo=False)

# Session factory
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def init_db():
    """Inisialisasi database — buat tabel jika belum ada"""
    os.makedirs(DATABASE_DIR, exist_ok=True)
    async with engine.begin() as conn:
        from database.models import Base  # noqa: F811
        await conn.run_sync(Base.metadata.create_all)


async def get_session() -> AsyncSession:
    """Dependency untuk FastAPI — dapatkan session database"""
    async with async_session() as session:
        yield session
