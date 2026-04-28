"""
Telegram Bot — Notifikasi trading via Telegram
Semua konfigurasi diambil dari database (UI Settings)
"""
import logging
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database.models import Settings

logger = logging.getLogger(__name__)

TELEGRAM_API = "https://api.telegram.org/bot{token}"


class TelegramNotifier:
    """Kirim notifikasi trading ke Telegram"""

    def __init__(self, session: AsyncSession):
        self.session = session
        self._http = httpx.AsyncClient(timeout=15.0)

    async def send_trade_notification(self, trade: dict):
        """Kirim notifikasi trade baru"""
        settings = await self._get_settings()
        if not settings.telegram_notify_trade:
            return

        emoji = "🟢" if trade.get("side") == "YES" else "🔴"
        mode = "🧪 TESTNET" if trade.get("mode") == "testnet" else "🟢 MAINNET"

        message = (
            f"{emoji} <b>Trade Baru</b> [{mode}]\n\n"
            f"📊 {trade.get('market', '')}\n"
            f"📍 Side: {trade.get('side', '')}\n"
            f"💰 Size: ${trade.get('size', 0):.2f}\n"
            f"📈 Entry: ${trade.get('entry_price', 0):.4f}\n"
            f"🎯 Edge: {trade.get('edge', 0)*100:.1f}%\n"
            f"🤖 AI: {trade.get('ai_provider', '')}"
        )
        await self._send(message, settings)

    async def send_pnl_notification(self, pnl: float, trade: dict):
        """Kirim notifikasi P&L"""
        settings = await self._get_settings()
        if not settings.telegram_notify_trade:
            return

        emoji = "✅" if pnl > 0 else "❌"
        message = (
            f"{emoji} <b>Trade Ditutup</b>\n\n"
            f"📊 {trade.get('market', '')}\n"
            f"💵 P&L: ${pnl:+.2f}\n"
        )
        await self._send(message, settings)

    async def send_daily_summary(self, stats: dict):
        """Kirim ringkasan harian"""
        settings = await self._get_settings()
        if not settings.telegram_notify_daily:
            return

        message = (
            f"📋 <b>Ringkasan Harian</b>\n\n"
            f"📈 Total Trades: {stats.get('total_trades', 0)}\n"
            f"✅ Win: {stats.get('wins', 0)}\n"
            f"❌ Loss: {stats.get('losses', 0)}\n"
            f"💰 P&L: ${stats.get('pnl', 0):+.2f}\n"
            f"🔒 Profit Terkunci: ${stats.get('locked_profit', 0):.2f}"
        )
        await self._send(message, settings)

    async def send_killswitch_alert(self, reason: str):
        """Kirim alert kill switch"""
        settings = await self._get_settings()
        if not settings.telegram_notify_killswitch:
            return

        message = (
            f"🚨 <b>KILL SWITCH AKTIF</b>\n\n"
            f"Alasan: {reason}\n"
            f"Bot telah dihentikan otomatis."
        )
        await self._send(message, settings)

    async def send_error_alert(self, error: str):
        """Kirim alert error"""
        settings = await self._get_settings()
        if not settings.telegram_notify_error:
            return

        message = f"⚠️ <b>Error</b>\n\n{error}"
        await self._send(message, settings)

    async def test_connection(
        self, token: str, chat_id: str
    ) -> dict:
        """Test koneksi Telegram"""
        try:
            url = f"{TELEGRAM_API.format(token=token)}/sendMessage"
            response = await self._http.post(
                url,
                json={
                    "chat_id": chat_id,
                    "text": "✅ Koneksi Telegram berhasil! Bot Polymarket terhubung.",
                    "parse_mode": "HTML",
                },
            )
            if response.status_code == 200:
                return {"success": True, "message": "Pesan test terkirim"}
            else:
                data = response.json()
                return {
                    "success": False,
                    "error": data.get("description", "Unknown error"),
                }
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def _send(self, message: str, settings: Settings):
        """Kirim pesan ke Telegram"""
        if not settings.telegram_bot_token or not settings.telegram_chat_id:
            return

        try:
            url = f"{TELEGRAM_API.format(token=settings.telegram_bot_token)}/sendMessage"
            await self._http.post(
                url,
                json={
                    "chat_id": settings.telegram_chat_id,
                    "text": message,
                    "parse_mode": "HTML",
                },
            )
        except Exception as e:
            logger.error(f"Gagal kirim Telegram: {e}")

    async def _get_settings(self) -> Settings:
        result = await self.session.execute(
            select(Settings).where(Settings.id == 1)
        )
        return result.scalar_one_or_none() or Settings(id=1)

    async def close(self):
        await self._http.aclose()
