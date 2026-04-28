"""
FastAPI Entry Point — Server utama Polymarket Smart Sniper Bot
"""
import logging
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database.db import init_db
from backend.api.routes import auth, dashboard, trades, settings, analytics
from backend.api.websocket import websocket_endpoint, ws_manager
from backend.core.price_feed import price_feed

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# Background task reference
price_task = None


async def start_price_feed():
    """Mulai price feed di background"""
    async def on_price_update(prices):
        await ws_manager.broadcast("price_update", prices)

    price_feed.on_price_update(on_price_update)

    try:
        await price_feed.start()
    except asyncio.CancelledError:
        await price_feed.stop()
    except Exception as e:
        logger.error(f"Price feed error: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle — jalankan saat startup dan shutdown"""
    global price_task

    # Startup
    logger.info("Memulai Polymarket Smart Sniper Bot...")
    await init_db()
    logger.info("Database diinisialisasi")

    # Buat default settings jika belum ada
    from backend.database.db import async_session
    from backend.database.models import Settings
    from sqlalchemy import select

    async with async_session() as session:
        result = await session.execute(select(Settings).where(Settings.id == 1))
        if not result.scalar_one_or_none():
            session.add(Settings(id=1))
            await session.commit()
            logger.info("Default settings dibuat")

    # Mulai price feed
    price_task = asyncio.create_task(start_price_feed())
    logger.info("Price feed dimulai")

    yield

    # Shutdown
    logger.info("Menghentikan server...")
    if price_task:
        price_task.cancel()
        try:
            await price_task
        except asyncio.CancelledError:
            pass
    await price_feed.stop()


# Buat app
app = FastAPI(
    title="Polymarket Smart Sniper Bot",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(trades.router)
app.include_router(settings.router)
app.include_router(analytics.router)

# WebSocket
app.add_api_route("/ws", websocket_endpoint, methods=["GET"])
app.add_websocket_route("/ws", websocket_endpoint)


@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "version": "2.0.0",
        "name": "Polymarket Smart Sniper Bot",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
