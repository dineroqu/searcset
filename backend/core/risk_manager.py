"""
Risk Manager — Kill switch dan proteksi drawdown
Mencegah kerugian berlebihan dengan berbagai mekanisme safety
"""
import logging
from datetime import date
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database.models import Settings, Trade

logger = logging.getLogger(__name__)


class RiskManager:
    """Manajemen risiko dengan kill switch otomatis"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def check_risk(self, mode: str = "testnet") -> dict:
        """
        Cek semua kondisi risiko

        Returns:
            Dict dengan status risiko dan apakah harus stop trading
        """
        settings = await self._get_settings()
        checks = []

        # 1. Cek consecutive losses
        consecutive = await self._get_consecutive_losses(mode)
        limit = settings.consecutive_loss_limit
        loss_triggered = consecutive >= limit
        checks.append({
            "name": "consecutive_losses",
            "value": consecutive,
            "limit": limit,
            "triggered": loss_triggered,
            "message": f"{consecutive}/{limit} loss berturut-turut",
        })

        # 2. Cek drawdown
        drawdown = await self._get_drawdown(mode, settings)
        dd_limit = settings.kill_switch_pct
        dd_triggered = drawdown >= dd_limit
        checks.append({
            "name": "drawdown",
            "value": round(drawdown, 4),
            "limit": dd_limit,
            "triggered": dd_triggered,
            "message": f"Drawdown: {drawdown*100:.1f}% / {dd_limit*100:.1f}%",
        })

        # 3. Cek daily target tercapai
        today_pnl = await self._get_today_pnl(mode)
        target = settings.daily_target
        target_reached = today_pnl >= target
        checks.append({
            "name": "daily_target",
            "value": today_pnl,
            "limit": target,
            "triggered": target_reached,
            "message": f"P&L hari ini: ${today_pnl:.2f} / ${target:.2f}",
        })

        # 4. Cek concurrent positions
        open_positions = await self._get_open_positions_count(mode)
        max_concurrent = settings.max_concurrent
        at_capacity = open_positions >= max_concurrent
        checks.append({
            "name": "max_concurrent",
            "value": open_positions,
            "limit": max_concurrent,
            "triggered": at_capacity,
            "message": f"Posisi: {open_positions}/{max_concurrent}",
        })

        # Tentukan apakah harus stop
        kill_switch = loss_triggered or dd_triggered
        should_pause = target_reached or at_capacity

        return {
            "kill_switch_active": kill_switch,
            "should_pause": should_pause,
            "can_trade": not kill_switch and not should_pause,
            "checks": checks,
            "consecutive_losses": consecutive,
            "drawdown_pct": round(drawdown * 100, 2),
            "today_pnl": today_pnl,
            "open_positions": open_positions,
        }

    async def record_trade_result(self, is_win: bool, mode: str = "testnet"):
        """Catat hasil trade untuk tracking risiko"""
        if not is_win:
            logger.warning("Loss dicatat — cek kill switch")

    async def reset_daily(self, mode: str = "testnet"):
        """Reset counter harian"""
        logger.info("Daily risk counters direset")

    async def _get_consecutive_losses(self, mode: str) -> int:
        """Hitung jumlah loss berturut-turut terakhir"""
        result = await self.session.execute(
            select(Trade)
            .where(Trade.mode == mode, Trade.status.in_(["closed", "simulated"]))
            .order_by(Trade.closed_at.desc())
            .limit(10)
        )
        trades = result.scalars().all()

        consecutive = 0
        for trade in trades:
            if trade.pnl is not None and trade.pnl < 0:
                consecutive += 1
            else:
                break
        return consecutive

    async def _get_drawdown(self, mode: str, settings: Settings) -> float:
        """Hitung drawdown saat ini"""
        capital = (
            settings.virtual_balance if mode == "testnet"
            else settings.trading_capital
        )
        initial = settings.protected_capital + capital

        if initial <= 0:
            return 0.0

        # Total P&L
        result = await self.session.execute(
            select(func.coalesce(func.sum(Trade.pnl), 0.0)).where(
                Trade.mode == mode,
                Trade.status.in_(["closed", "simulated"]),
            )
        )
        total_pnl = float(result.scalar() or 0.0)

        if total_pnl >= 0:
            return 0.0

        return abs(total_pnl) / initial

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

    async def _get_open_positions_count(self, mode: str) -> int:
        result = await self.session.execute(
            select(func.count(Trade.id)).where(
                Trade.mode == mode, Trade.status == "open"
            )
        )
        return int(result.scalar() or 0)

    async def _get_settings(self) -> Settings:
        result = await self.session.execute(
            select(Settings).where(Settings.id == 1)
        )
        return result.scalar_one_or_none() or Settings(id=1)
