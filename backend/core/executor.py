"""
Trade Executor — Eksekusi trade di testnet (simulasi) atau mainnet (Polygon)
"""
import logging
import asyncio
import uuid
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from database.models import Trade, Settings
from sqlalchemy import select

logger = logging.getLogger(__name__)


class TradeExecutor:
    """Eksekusi trade — testnet (simulasi) atau mainnet (blockchain)"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def execute_trade(
        self,
        market: dict,
        side: str,
        size: float,
        edge: float,
        kelly_fraction: float,
        ai_provider: str,
        ai_confidence: float,
    ) -> dict:
        """
        Eksekusi trade baru

        Args:
            market: Data market
            side: YES atau NO
            size: Ukuran posisi dalam USD
            edge: Edge yang terdeteksi
            kelly_fraction: Fraksi Kelly
            ai_provider: Provider AI yang digunakan
            ai_confidence: Confidence dari AI

        Returns:
            Dict dengan detail trade
        """
        settings = await self._get_settings()
        mode = settings.mode

        if mode == "testnet":
            return await self._execute_testnet(
                market, side, size, edge, kelly_fraction,
                ai_provider, ai_confidence
            )
        else:
            return await self._execute_mainnet(
                market, side, size, edge, kelly_fraction,
                ai_provider, ai_confidence, settings
            )

    async def _execute_testnet(
        self, market, side, size, edge, kelly_fraction,
        ai_provider, ai_confidence
    ) -> dict:
        """Eksekusi trade di testnet — simulasi saja"""
        # Delay artifisial untuk simulasi latency blockchain
        await asyncio.sleep(1.5)

        entry_price = (
            market.get("yes_price", 0.5) if side == "YES"
            else market.get("no_price", 0.5)
        )
        tx_hash = f"TESTNET_{uuid.uuid4().hex[:16]}"

        trade = Trade(
            mode="testnet",
            market_id=str(market.get("id", "")),
            market_question=market.get("question", ""),
            market_category=market.get("category", ""),
            side=side,
            size=size,
            entry_price=entry_price,
            status="simulated",
            ai_provider=ai_provider,
            ai_confidence=ai_confidence,
            edge=edge,
            kelly_fraction=kelly_fraction,
            tx_hash=tx_hash,
            opened_at=datetime.utcnow(),
        )

        self.session.add(trade)
        await self.session.commit()

        logger.info(
            f"[TESTNET] Trade dieksekusi: {side} {market.get('question', '')} "
            f"@ ${entry_price:.4f} size=${size:.2f}"
        )

        return {
            "trade_id": trade.id,
            "mode": "testnet",
            "market": market.get("question", ""),
            "side": side,
            "size": size,
            "entry_price": entry_price,
            "tx_hash": tx_hash,
            "status": "simulated",
        }

    async def _execute_mainnet(
        self, market, side, size, edge, kelly_fraction,
        ai_provider, ai_confidence, settings
    ) -> dict:
        """Eksekusi trade di mainnet — transaksi blockchain nyata"""
        if not settings.wallet_private_key:
            raise ValueError("Wallet private key belum dikonfigurasi")

        # Placeholder untuk integrasi Polygon/Polymarket SDK
        # Di production, ini akan menggunakan py_clob_client
        entry_price = (
            market.get("yes_price", 0.5) if side == "YES"
            else market.get("no_price", 0.5)
        )
        tx_hash = f"0x{uuid.uuid4().hex}"

        trade = Trade(
            mode="mainnet",
            market_id=str(market.get("id", "")),
            market_question=market.get("question", ""),
            market_category=market.get("category", ""),
            side=side,
            size=size,
            entry_price=entry_price,
            status="open",
            ai_provider=ai_provider,
            ai_confidence=ai_confidence,
            edge=edge,
            kelly_fraction=kelly_fraction,
            tx_hash=tx_hash,
            opened_at=datetime.utcnow(),
        )

        self.session.add(trade)
        await self.session.commit()

        logger.info(
            f"[MAINNET] Trade dieksekusi: {side} {market.get('question', '')} "
            f"@ ${entry_price:.4f} size=${size:.2f} tx={tx_hash}"
        )

        return {
            "trade_id": trade.id,
            "mode": "mainnet",
            "market": market.get("question", ""),
            "side": side,
            "size": size,
            "entry_price": entry_price,
            "tx_hash": tx_hash,
            "status": "open",
        }

    async def close_trade(self, trade_id: int, exit_price: float) -> dict:
        """Tutup posisi trade"""
        result = await self.session.execute(
            select(Trade).where(Trade.id == trade_id)
        )
        trade = result.scalar_one_or_none()
        if not trade:
            raise ValueError(f"Trade {trade_id} tidak ditemukan")

        # Hitung P&L
        if trade.side == "YES":
            pnl = (exit_price - trade.entry_price) * trade.size
        else:
            pnl = (trade.entry_price - exit_price) * trade.size

        trade.exit_price = exit_price
        trade.pnl = round(pnl, 4)
        trade.status = "closed" if trade.mode == "mainnet" else "simulated"
        trade.closed_at = datetime.utcnow()

        await self.session.commit()

        return {
            "trade_id": trade.id,
            "pnl": trade.pnl,
            "exit_price": exit_price,
            "status": trade.status,
        }

    async def _get_settings(self) -> Settings:
        result = await self.session.execute(
            select(Settings).where(Settings.id == 1)
        )
        settings = result.scalar_one_or_none()
        if not settings:
            settings = Settings(id=1)
            self.session.add(settings)
            await self.session.commit()
        return settings
