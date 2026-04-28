"""
Settings Routes — Endpoint untuk manajemen pengaturan
Semua konfigurasi (API keys, wallet, telegram, dll) via UI
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database.db import get_session
from backend.database.models import Settings, AIProvider
from backend.core.ai_analyzer import AIAnalyzer
from backend.notifications.telegram_bot import TelegramNotifier

router = APIRouter(prefix="/api/settings", tags=["settings"])


# === Request Models ===

class ModeUpdate(BaseModel):
    mode: str  # testnet | mainnet
    confirmation: Optional[str] = None


class RiskSettingsUpdate(BaseModel):
    protected_capital: Optional[float] = None
    trading_capital: Optional[float] = None
    min_edge: Optional[float] = None
    max_position_pct: Optional[float] = None
    daily_target: Optional[float] = None
    kill_switch_pct: Optional[float] = None
    trading_duration_days: Optional[int] = None
    max_concurrent: Optional[int] = None
    consecutive_loss_limit: Optional[int] = None


class VirtualBalanceReset(BaseModel):
    amount: float = 10.0


class WalletConfig(BaseModel):
    private_key: str


class AIProviderCreate(BaseModel):
    provider: str
    api_key: Optional[str] = None
    model: str
    is_primary: bool = False
    priority_order: int = 0
    base_url: Optional[str] = None


class AIProviderUpdate(BaseModel):
    api_key: Optional[str] = None
    model: Optional[str] = None
    is_active: Optional[bool] = None
    is_primary: Optional[bool] = None
    priority_order: Optional[int] = None
    base_url: Optional[str] = None


class TelegramConfig(BaseModel):
    bot_token: Optional[str] = None
    chat_id: Optional[str] = None
    notify_trade: Optional[bool] = None
    notify_error: Optional[bool] = None
    notify_daily: Optional[bool] = None
    notify_killswitch: Optional[bool] = None


class ReorderProviders(BaseModel):
    order: list[int]  # list provider IDs dalam urutan baru


# === Settings General ===

@router.get("/")
async def get_settings(session: AsyncSession = Depends(get_session)):
    """Dapatkan semua pengaturan"""
    settings = await _get_or_create_settings(session)
    return {
        "mode": settings.mode,
        "protected_capital": settings.protected_capital,
        "trading_capital": settings.trading_capital,
        "virtual_balance": settings.virtual_balance,
        "min_edge": settings.min_edge,
        "max_position_pct": settings.max_position_pct,
        "daily_target": settings.daily_target,
        "kill_switch_pct": settings.kill_switch_pct,
        "trading_duration_days": settings.trading_duration_days,
        "max_concurrent": settings.max_concurrent,
        "consecutive_loss_limit": settings.consecutive_loss_limit,
        "wallet_address": settings.wallet_address,
        "has_wallet_key": bool(settings.wallet_private_key),
        "telegram_bot_token": settings.telegram_bot_token or "",
        "telegram_chat_id": settings.telegram_chat_id or "",
        "telegram_notify_trade": settings.telegram_notify_trade,
        "telegram_notify_error": settings.telegram_notify_error,
        "telegram_notify_daily": settings.telegram_notify_daily,
        "telegram_notify_killswitch": settings.telegram_notify_killswitch,
        "bot_status": settings.bot_status,
        "dark_mode": settings.dark_mode,
        "start_date": settings.start_date.isoformat() if settings.start_date else None,
    }


# === Mode Operasi ===

@router.post("/mode")
async def update_mode(
    data: ModeUpdate,
    session: AsyncSession = Depends(get_session),
):
    """Ubah mode operasi (testnet/mainnet)"""
    if data.mode not in ("testnet", "mainnet"):
        raise HTTPException(400, "Mode harus 'testnet' atau 'mainnet'")

    if data.mode == "mainnet":
        if data.confirmation != "SAYA MENGERTI":
            raise HTTPException(
                400,
                "Untuk mainnet, konfirmasi dengan 'SAYA MENGERTI'"
            )

    await session.execute(
        update(Settings).where(Settings.id == 1).values(mode=data.mode)
    )
    await session.commit()
    return {"mode": data.mode, "message": f"Mode diubah ke {data.mode}"}


# === Risk Settings ===

@router.put("/risk")
async def update_risk_settings(
    data: RiskSettingsUpdate,
    session: AsyncSession = Depends(get_session),
):
    """Update pengaturan risiko"""
    values = {k: v for k, v in data.model_dump().items() if v is not None}
    if values:
        await session.execute(
            update(Settings).where(Settings.id == 1).values(**values)
        )
        await session.commit()
    return {"message": "Pengaturan risiko diperbarui", "updated": list(values.keys())}


# === Virtual Balance ===

@router.post("/virtual-balance/reset")
async def reset_virtual_balance(
    data: VirtualBalanceReset,
    session: AsyncSession = Depends(get_session),
):
    """Reset virtual balance untuk testnet"""
    await session.execute(
        update(Settings).where(Settings.id == 1).values(virtual_balance=data.amount)
    )
    await session.commit()
    return {"virtual_balance": data.amount, "message": "Virtual balance direset"}


# === Wallet ===

@router.post("/wallet")
async def configure_wallet(
    data: WalletConfig,
    session: AsyncSession = Depends(get_session),
):
    """Konfigurasi wallet Polygon"""
    # Simpan private key (dalam produksi, enkripsi dengan Fernet)
    # Untuk sekarang, simpan langsung
    wallet_address = f"0x{'0' * 40}"  # Placeholder — di prod, derive dari key

    await session.execute(
        update(Settings).where(Settings.id == 1).values(
            wallet_private_key=data.private_key,
            wallet_address=wallet_address,
        )
    )
    await session.commit()
    return {"wallet_address": wallet_address, "message": "Wallet dikonfigurasi"}


@router.delete("/wallet")
async def remove_wallet(session: AsyncSession = Depends(get_session)):
    """Hapus konfigurasi wallet"""
    await session.execute(
        update(Settings).where(Settings.id == 1).values(
            wallet_private_key=None, wallet_address=None
        )
    )
    await session.commit()
    return {"message": "Wallet dihapus"}


# === AI Providers ===

@router.get("/ai-providers")
async def get_ai_providers(session: AsyncSession = Depends(get_session)):
    """Dapatkan semua AI provider"""
    result = await session.execute(
        select(AIProvider).order_by(
            AIProvider.is_primary.desc(), AIProvider.priority_order.asc()
        )
    )
    providers = result.scalars().all()

    return [
        {
            "id": p.id,
            "provider": p.provider,
            "model": p.model,
            "is_active": p.is_active,
            "is_primary": p.is_primary,
            "priority_order": p.priority_order,
            "base_url": p.base_url,
            "status": p.status,
            "has_key": bool(p.api_key),
            "total_requests": p.total_requests,
            "total_wins": p.total_wins,
            "last_checked": p.last_checked.isoformat() if p.last_checked else None,
        }
        for p in providers
    ]


@router.post("/ai-providers")
async def add_ai_provider(
    data: AIProviderCreate,
    session: AsyncSession = Depends(get_session),
):
    """Tambah AI provider baru"""
    # Jika primary, unset provider lain
    if data.is_primary:
        await session.execute(
            update(AIProvider).values(is_primary=False)
        )

    provider = AIProvider(
        provider=data.provider,
        api_key=data.api_key,
        model=data.model,
        is_primary=data.is_primary,
        priority_order=data.priority_order,
        base_url=data.base_url,
        status="unchecked",
    )
    session.add(provider)
    await session.commit()

    return {"id": provider.id, "message": f"Provider {data.provider} ditambahkan"}


@router.put("/ai-providers/{provider_id}")
async def update_ai_provider(
    provider_id: int,
    data: AIProviderUpdate,
    session: AsyncSession = Depends(get_session),
):
    """Update AI provider"""
    values = {k: v for k, v in data.model_dump().items() if v is not None}

    if "is_primary" in values and values["is_primary"]:
        await session.execute(update(AIProvider).values(is_primary=False))

    if values:
        await session.execute(
            update(AIProvider).where(AIProvider.id == provider_id).values(**values)
        )
        await session.commit()

    return {"message": "Provider diperbarui"}


@router.delete("/ai-providers/{provider_id}")
async def delete_ai_provider(
    provider_id: int,
    session: AsyncSession = Depends(get_session),
):
    """Hapus AI provider"""
    await session.execute(
        delete(AIProvider).where(AIProvider.id == provider_id)
    )
    await session.commit()
    return {"message": "Provider dihapus"}


@router.post("/ai-providers/{provider_id}/test")
async def test_ai_provider(
    provider_id: int,
    session: AsyncSession = Depends(get_session),
):
    """Test koneksi AI provider"""
    analyzer = AIAnalyzer(session)
    try:
        result = await analyzer.test_provider(provider_id)
        return result
    finally:
        await analyzer.close()


@router.put("/ai-providers/reorder")
async def reorder_providers(
    data: ReorderProviders,
    session: AsyncSession = Depends(get_session),
):
    """Ubah urutan prioritas provider"""
    for idx, provider_id in enumerate(data.order):
        await session.execute(
            update(AIProvider)
            .where(AIProvider.id == provider_id)
            .values(priority_order=idx)
        )
    await session.commit()
    return {"message": "Urutan provider diperbarui"}


# === Telegram ===

@router.put("/telegram")
async def update_telegram(
    data: TelegramConfig,
    session: AsyncSession = Depends(get_session),
):
    """Update konfigurasi Telegram"""
    values = {}
    if data.bot_token is not None:
        values["telegram_bot_token"] = data.bot_token
    if data.chat_id is not None:
        values["telegram_chat_id"] = data.chat_id
    if data.notify_trade is not None:
        values["telegram_notify_trade"] = data.notify_trade
    if data.notify_error is not None:
        values["telegram_notify_error"] = data.notify_error
    if data.notify_daily is not None:
        values["telegram_notify_daily"] = data.notify_daily
    if data.notify_killswitch is not None:
        values["telegram_notify_killswitch"] = data.notify_killswitch

    if values:
        await session.execute(
            update(Settings).where(Settings.id == 1).values(**values)
        )
        await session.commit()

    return {"message": "Konfigurasi Telegram diperbarui"}


@router.post("/telegram/test")
async def test_telegram(
    session: AsyncSession = Depends(get_session),
):
    """Test kirim notifikasi Telegram"""
    settings = await _get_or_create_settings(session)
    if not settings.telegram_bot_token or not settings.telegram_chat_id:
        raise HTTPException(400, "Bot token dan chat ID harus diisi")

    notifier = TelegramNotifier(session)
    try:
        result = await notifier.test_connection(
            settings.telegram_bot_token, settings.telegram_chat_id
        )
        return result
    finally:
        await notifier.close()


# === Dark Mode ===

@router.put("/theme")
async def update_theme(
    dark_mode: bool,
    session: AsyncSession = Depends(get_session),
):
    """Toggle dark mode"""
    await session.execute(
        update(Settings).where(Settings.id == 1).values(dark_mode=dark_mode)
    )
    await session.commit()
    return {"dark_mode": dark_mode}


# === Helper ===

async def _get_or_create_settings(session: AsyncSession) -> Settings:
    result = await session.execute(select(Settings).where(Settings.id == 1))
    settings = result.scalar_one_or_none()
    if not settings:
        settings = Settings(id=1)
        session.add(settings)
        await session.commit()
    return settings
