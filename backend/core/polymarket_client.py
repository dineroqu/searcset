"""
Polymarket CLOB API Client — Wrapper untuk akses data pasar
Mengambil data market, harga, dan orderbook dari Polymarket
"""
import logging
from typing import Optional
import httpx
from config import POLYMARKET_API_BASE, POLYMARKET_GAMMA_API

logger = logging.getLogger(__name__)


class PolymarketClient:
    """Client untuk Polymarket CLOB dan Gamma API"""

    def __init__(self):
        self.clob_base = POLYMARKET_API_BASE
        self.gamma_base = POLYMARKET_GAMMA_API
        self.client = httpx.AsyncClient(timeout=30.0)

    async def get_markets(
        self,
        limit: int = 50,
        active_only: bool = True,
        min_liquidity: float = 1000,
    ) -> list[dict]:
        """Ambil daftar market yang tersedia"""
        try:
            params = {
                "limit": limit,
                "active": active_only,
                "closed": False,
            }
            response = await self.client.get(
                f"{self.gamma_base}/markets", params=params
            )
            response.raise_for_status()
            markets = response.json()

            # Filter berdasarkan likuiditas
            filtered = []
            for market in markets:
                liquidity = float(market.get("liquidityNum", 0))
                volume = float(market.get("volumeNum", 0))
                if liquidity >= min_liquidity:
                    filtered.append({
                        "id": market.get("id"),
                        "condition_id": market.get("conditionId"),
                        "question": market.get("question", ""),
                        "category": market.get("category", ""),
                        "end_date": market.get("endDate"),
                        "liquidity": liquidity,
                        "volume": volume,
                        "outcomes": market.get("outcomes", []),
                        "outcome_prices": market.get("outcomePrices", ""),
                        "active": market.get("active", True),
                        "closed": market.get("closed", False),
                    })
            return filtered

        except Exception as e:
            logger.error(f"Error mengambil markets: {e}")
            return []

    async def get_market_detail(self, market_id: str) -> Optional[dict]:
        """Ambil detail satu market"""
        try:
            response = await self.client.get(
                f"{self.gamma_base}/markets/{market_id}"
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error mengambil market {market_id}: {e}")
            return None

    async def get_orderbook(
        self, token_id: str
    ) -> Optional[dict]:
        """Ambil orderbook untuk token tertentu"""
        try:
            response = await self.client.get(
                f"{self.clob_base}/book",
                params={"token_id": token_id},
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error mengambil orderbook: {e}")
            return None

    async def get_price(self, token_id: str) -> Optional[float]:
        """Ambil harga terkini untuk token"""
        try:
            response = await self.client.get(
                f"{self.clob_base}/price",
                params={"token_id": token_id, "side": "buy"},
            )
            response.raise_for_status()
            data = response.json()
            return float(data.get("price", 0))
        except Exception as e:
            logger.error(f"Error mengambil harga: {e}")
            return None

    async def get_simplified_markets(self) -> list[dict]:
        """Ambil market dalam format sederhana untuk scanner"""
        markets = await self.get_markets(limit=100)
        simplified = []
        for m in markets:
            prices = m.get("outcome_prices", "")
            if isinstance(prices, str) and prices:
                try:
                    import json
                    price_list = json.loads(prices)
                    yes_price = float(price_list[0]) if price_list else 0.5
                except (json.JSONDecodeError, IndexError):
                    yes_price = 0.5
            else:
                yes_price = 0.5

            simplified.append({
                "id": m["id"],
                "question": m["question"],
                "category": m.get("category", ""),
                "yes_price": yes_price,
                "no_price": round(1 - yes_price, 4),
                "liquidity": m["liquidity"],
                "volume": m.get("volume", 0),
                "end_date": m.get("end_date"),
            })
        return simplified

    async def close(self):
        """Tutup HTTP client"""
        await self.client.aclose()
