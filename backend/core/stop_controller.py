"""
Stop Controller — Graceful stop system untuk bot
Memastikan bot berhenti dengan aman tanpa meninggalkan posisi terbuka
"""
import logging
import asyncio
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database.models import Settings, Trade

logger = logging.getLogger(__name__)


class StopController:
    """Kontrol stop/start bot dengan graceful shutdown"""

    def __init__(self, session: AsyncSession):
        self.session = session
        self._stop_event = asyncio.Event()

    async def start_bot(self):
        """Mulai bot"""
        self._stop_event.clear()
        await self.session.execute(
            update(Settings).where(Settings.id == 1).values(bot_status="scanning")
        )
        await self.session.commit()
        logger.info("Bot dimulai — status: scanning")

    async def stop_bot(self, reason: str = "manual"):
        """
        Hentikan bot secara graceful

        Steps:
        1. Set flag stop
        2. Tunggu posisi terbuka selesai (opsional)
        3. Update status ke idle
        """
        logger.info(f"Menghentikan bot — alasan: {reason}")
        self._stop_event.set()

        # Update status ke stopping
        await self.session.execute(
            update(Settings).where(Settings.id == 1).values(bot_status="stopping")
        )
        await self.session.commit()

        # Cek posisi terbuka
        open_positions = await self._get_open_positions()
        if open_positions:
            logger.info(f"Menunggu {len(open_positions)} posisi terbuka...")

        # Set ke idle
        await self.session.execute(
            update(Settings).where(Settings.id == 1).values(bot_status="idle")
        )
        await self.session.commit()
        logger.info("Bot dihentikan — status: idle")

    def is_stopping(self) -> bool:
        """Cek apakah bot sedang dalam proses stop"""
        return self._stop_event.is_set()

    async def get_status(self) -> dict:
        """Dapatkan status bot saat ini"""
        result = await self.session.execute(
            select(Settings).where(Settings.id == 1)
        )
        settings = result.scalar_one_or_none()
        status = settings.bot_status if settings else "idle"

        open_count = len(await self._get_open_positions())

        return {
            "status": status,
            "is_running": status in ("scanning", "trading"),
            "is_stopping": self._stop_event.is_set(),
            "open_positions": open_count,
        }

    async def _get_open_positions(self) -> list:
        result = await self.session.execute(
            select(Trade).where(Trade.status == "open")
        )
        return list(result.scalars().all())
