"""
Dashboard Routes — Endpoint untuk halaman utama
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database.db import get_session
from backend.core.capital_manager import CapitalManager
from backend.core.risk_manager import RiskManager
from backend.core.stop_controller import StopController
from backend.core.polymarket_client import PolymarketClient
from backend.core.price_feed import price_feed

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/capital")
async def get_capital(session: AsyncSession = Depends(get_session)):
    """Dapatkan status modal saat ini"""
    from backend.database.models import Settings
    from sqlalchemy import select

    result = await session.execute(select(Settings).where(Settings.id == 1))
    settings = result.scalar_one_or_none()
    mode = settings.mode if settings else "testnet"

    manager = CapitalManager(session)
    return await manager.get_capital_state(mode)


@router.get("/risk")
async def get_risk_status(session: AsyncSession = Depends(get_session)):
    """Dapatkan status risiko saat ini"""
    from backend.database.models import Settings
    from sqlalchemy import select

    result = await session.execute(select(Settings).where(Settings.id == 1))
    settings = result.scalar_one_or_none()
    mode = settings.mode if settings else "testnet"

    manager = RiskManager(session)
    return await manager.check_risk(mode)


@router.get("/bot-status")
async def get_bot_status(session: AsyncSession = Depends(get_session)):
    """Dapatkan status bot"""
    controller = StopController(session)
    return await controller.get_status()


@router.post("/bot/start")
async def start_bot(session: AsyncSession = Depends(get_session)):
    """Mulai bot"""
    controller = StopController(session)
    await controller.start_bot()
    return {"status": "scanning", "message": "Bot dimulai"}


@router.post("/bot/stop")
async def stop_bot(session: AsyncSession = Depends(get_session)):
    """Hentikan bot"""
    controller = StopController(session)
    await controller.stop_bot(reason="manual")
    return {"status": "idle", "message": "Bot dihentikan"}


@router.get("/prices")
async def get_crypto_prices():
    """Dapatkan harga crypto terkini"""
    return price_feed.get_prices()


@router.get("/markets")
async def get_markets():
    """Dapatkan daftar market Polymarket"""
    client = PolymarketClient()
    try:
        markets = await client.get_simplified_markets()
        return {"markets": markets, "count": len(markets)}
    finally:
        await client.close()
