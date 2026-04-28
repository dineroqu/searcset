"""
Binance WebSocket Price Feed — Harga BTC/ETH real-time
"""
import json
import logging
import asyncio
from typing import Callable, Optional
import websockets

from backend.config import BINANCE_WS_URL, BINANCE_STREAMS

logger = logging.getLogger(__name__)


class PriceFeed:
    """Feed harga crypto real-time dari Binance WebSocket"""

    def __init__(self):
        self.prices: dict[str, dict] = {
            "btcusdt": {"price": 0.0, "change_24h": 0.0},
            "ethusdt": {"price": 0.0, "change_24h": 0.0},
        }
        self._ws = None
        self._running = False
        self._callbacks: list[Callable] = []

    def on_price_update(self, callback: Callable):
        """Daftarkan callback saat harga update"""
        self._callbacks.append(callback)

    async def start(self):
        """Mulai WebSocket connection ke Binance"""
        self._running = True
        streams = "/".join(BINANCE_STREAMS)
        url = f"{BINANCE_WS_URL}/{streams}"

        while self._running:
            try:
                async with websockets.connect(url) as ws:
                    self._ws = ws
                    logger.info("Terhubung ke Binance WebSocket")
                    async for message in ws:
                        if not self._running:
                            break
                        await self._handle_message(message)
            except websockets.ConnectionClosed:
                logger.warning("Koneksi Binance terputus, reconnect...")
                await asyncio.sleep(5)
            except Exception as e:
                logger.error(f"Error Binance WS: {e}")
                await asyncio.sleep(10)

    async def stop(self):
        """Hentikan WebSocket connection"""
        self._running = False
        if self._ws:
            await self._ws.close()

    def get_prices(self) -> dict:
        """Dapatkan harga terkini"""
        return self.prices.copy()

    async def _handle_message(self, message: str):
        """Proses pesan dari WebSocket"""
        try:
            data = json.loads(message)

            if "s" in data:
                symbol = data["s"].lower()
                price = float(data.get("c", 0))
                change = float(data.get("P", 0))

                if symbol in self.prices:
                    self.prices[symbol] = {
                        "price": price,
                        "change_24h": change,
                        "symbol": symbol.upper(),
                    }

                    for callback in self._callbacks:
                        try:
                            await callback(self.prices)
                        except Exception as e:
                            logger.error(f"Callback error: {e}")

        except json.JSONDecodeError:
            pass


# Singleton instance
price_feed = PriceFeed()
