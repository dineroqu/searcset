"""
Capital Manager — Sistem proteksi modal dan profit lock
Mengelola protected capital, trading capital, dan locked profit
"""
import logging
from datetime import datetime, date
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from database.models import Settings, Trade, DailyStats

logger = logging.getLogger(__name__)


class CapitalManager:
    """Manajemen modal dengan sistem proteksi ketat"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_capital_state(self, mode: str = "testnet") -> dict:
        """Dapatkan status modal saat ini"""
        settings = await self._get_settings()

        if mode == "testnet":
            trading_capital = settings.virtual_balance
        else:
            trading_capital = settings.trading_capital

        # Hitung P&L hari ini
        today = date.today().isoformat()
        today_pnl = await self._get_today_pnl(mode)

        # Hitung locked profit
        locked_profit = await self._get_locked_profit(mode)

        # Hitung unrealized P&L dari posisi terbuka
        unrealized = await self._get_unrealized_pnl(mode)

        return {
            "protected_capital": settings.protected_capital,
            "trading_capital": trading_capital,
            "locked_profit": locked_profit,
            "today_pnl": today_pnl,
            "unrealized_pnl": unrealized,
            "daily_target": settings.daily_target,
            "target_progress": min(
                (today_pnl / settings.daily_target * 100) if settings.daily_target > 0 else 0,
                100
            ),
            "mode": mode,
        }

    async def lock_profit(self, pnl: float, mode: str = "testnet"):
        """Lock 70% profit, kembalikan 30% ke trading capital"""
        if pnl <= 0:
            return

        lock_amount = pnl * 0.7
        reinvest = pnl * 0.3

        settings = await self._get_settings()

        if mode == "testnet":
            settings.virtual_balance += reinvest
        else:
            settings.trading_capital += reinvest

        # Update daily stats
        today = date.today().isoformat()
        stats = await self._get_or_create_daily_stats(today, mode)
        stats.locked_profit += lock_amount

        await self.session.commit()
        logger.info(f"Profit locked: ${lock_amount:.2f}, reinvest: ${reinvest:.2f}")

    async def can_trade(self, mode: str = "testnet") -> tuple[bool, str]:
        """Cek apakah bot boleh trading"""
        settings = await self._get_settings()
        capital = settings.virtual_balance if mode == "testnet" else settings.trading_capital

        if capital <= 0:
            return False, "Trading capital habis"

        if settings.bot_status != "scanning" and settings.bot_status != "trading":
            return False, f"Bot tidak aktif (status: {settings.bot_status})"

        # Cek durasi
        if settings.start_date:
            days_elapsed = (datetime.utcnow() - settings.start_date).days
            if days_elapsed >= settings.trading_duration_days:
                return False, "Durasi trading sudah habis"

        return True, "OK"

    async def get_position_size(
        self, kelly_fraction: float, mode: str = "testnet"
    ) -> float:
        """Hitung ukuran posisi berdasarkan Kelly Criterion"""
        settings = await self._get_settings()
        capital = settings.virtual_balance if mode == "testnet" else settings.trading_capital

        max_size = capital * settings.max_position_pct
        kelly_size = capital * kelly_fraction

        # Anti-overbet: ambil yang lebih kecil
        size = min(kelly_size, max_size)
        size = max(size, 0.1)  # Minimum $0.10

        return round(size, 2)

    async def update_balance(self, amount: float, mode: str = "testnet"):
        """Update balance setelah trade"""
        settings = await self._get_settings()
        if mode == "testnet":
            settings.virtual_balance += amount
        else:
            settings.trading_capital += amount
        await self.session.commit()

    async def reset_virtual_balance(self, amount: float = 10.0):
        """Reset virtual balance untuk testnet"""
        settings = await self._get_settings()
        settings.virtual_balance = amount
        await self.session.commit()

    async def _get_settings(self) -> Settings:
        result = await self.session.execute(select(Settings).where(Settings.id == 1))
        settings = result.scalar_one_or_none()
        if not settings:
            settings = Settings(id=1)
            self.session.add(settings)
            await self.session.commit()
        return settings

    async def _get_today_pnl(self, mode: str) -> float:
        today = date.today().isoformat()
        result = await self.session.execute(
            select(func.coalesce(func.sum(Trade.pnl), 0.0)).where(
                Trade.mode == mode,
                func.date(Trade.opened_at) == today,
                Trade.status.in_(["closed", "simulated"]),
            )
        )
        return float(result.scalar() or 0.0)

    async def _get_locked_profit(self, mode: str) -> float:
        result = await self.session.execute(
            select(func.coalesce(func.sum(DailyStats.locked_profit), 0.0)).where(
                DailyStats.mode == mode
            )
        )
        return float(result.scalar() or 0.0)

    async def _get_unrealized_pnl(self, mode: str) -> float:
        result = await self.session.execute(
            select(func.coalesce(func.sum(Trade.pnl), 0.0)).where(
                Trade.mode == mode, Trade.status == "open"
            )
        )
        return float(result.scalar() or 0.0)

    async def _get_or_create_daily_stats(
        self, date_str: str, mode: str
    ) -> DailyStats:
        result = await self.session.execute(
            select(DailyStats).where(
                DailyStats.date == date_str, DailyStats.mode == mode
            )
        )
        stats = result.scalar_one_or_none()
        if not stats:
            stats = DailyStats(date=date_str, mode=mode)
            self.session.add(stats)
            await self.session.flush()
        return stats
