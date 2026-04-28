"""
Kelly Criterion Engine — Hitung ukuran posisi optimal
Menggunakan formula Kelly untuk menentukan berapa banyak modal yang di-bet
"""
import logging

logger = logging.getLogger(__name__)


class KellyEngine:
    """Menghitung ukuran posisi berdasarkan Kelly Criterion"""

    def __init__(self, max_kelly_fraction: float = 0.25):
        """
        Args:
            max_kelly_fraction: Batas atas fraksi Kelly (safety cap)
        """
        self.max_kelly_fraction = max_kelly_fraction

    def calculate(
        self,
        probability: float,
        odds: float,
        confidence: float = 1.0,
    ) -> dict:
        """
        Hitung Kelly Criterion

        Formula: f* = (bp - q) / b
        dimana:
            b = odds desimal - 1 (net odds)
            p = probabilitas menang
            q = probabilitas kalah (1 - p)

        Args:
            probability: Estimasi probabilitas menang (0-1)
            odds: Odds desimal (misal 2.0 = even money)
            confidence: Faktor kepercayaan (0-1), multiplier untuk Kelly

        Returns:
            Dict dengan ukuran posisi optimal
        """
        if probability <= 0 or probability >= 1:
            return self._zero_result("Probabilitas tidak valid")

        if odds <= 1:
            return self._zero_result("Odds tidak menguntungkan")

        b = odds - 1  # Net odds
        p = probability
        q = 1 - p

        # Formula Kelly
        kelly = (b * p - q) / b

        if kelly <= 0:
            return self._zero_result("Tidak ada edge positif")

        # Apply confidence multiplier (fractional Kelly)
        adjusted_kelly = kelly * confidence

        # Cap pada max fraction
        capped_kelly = min(adjusted_kelly, self.max_kelly_fraction)

        return {
            "full_kelly": round(kelly, 4),
            "adjusted_kelly": round(adjusted_kelly, 4),
            "capped_kelly": round(capped_kelly, 4),
            "recommended_fraction": round(capped_kelly, 4),
            "probability": probability,
            "odds": odds,
            "confidence": confidence,
            "edge_exists": True,
        }

    def calculate_from_prices(
        self,
        ai_probability: float,
        market_price: float,
        confidence: float = 1.0,
    ) -> dict:
        """
        Hitung Kelly dari probabilitas AI dan harga pasar

        Args:
            ai_probability: Estimasi probabilitas dari AI
            market_price: Harga pasar saat ini (0-1)
            confidence: Faktor kepercayaan

        Returns:
            Dict dengan ukuran posisi optimal
        """
        if market_price <= 0 or market_price >= 1:
            return self._zero_result("Harga pasar tidak valid")

        # Konversi harga pasar ke odds desimal
        odds = 1 / market_price

        return self.calculate(ai_probability, odds, confidence)

    def _zero_result(self, reason: str) -> dict:
        return {
            "full_kelly": 0.0,
            "adjusted_kelly": 0.0,
            "capped_kelly": 0.0,
            "recommended_fraction": 0.0,
            "edge_exists": False,
            "reason": reason,
        }
