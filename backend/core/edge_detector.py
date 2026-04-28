"""
Edge Detector — Deteksi peluang trading berdasarkan selisih probabilitas
Menghitung edge antara harga pasar dan prediksi AI
"""
import logging

logger = logging.getLogger(__name__)


class EdgeDetector:
    """Mendeteksi edge (keuntungan) dari analisis AI vs harga pasar"""

    def __init__(self, min_edge: float = 0.15):
        self.min_edge = min_edge

    def calculate_edge(
        self,
        market_price: float,
        ai_probability: float,
        side: str = "YES",
    ) -> dict:
        """
        Hitung edge antara harga pasar dan probabilitas AI

        Args:
            market_price: Harga pasar saat ini (0-1)
            ai_probability: Probabilitas dari AI (0-1)
            side: YES atau NO

        Returns:
            Dict dengan info edge
        """
        if side == "YES":
            edge = ai_probability - market_price
            expected_payout = ai_probability / market_price if market_price > 0 else 0
        else:
            edge = (1 - ai_probability) - (1 - market_price)
            no_price = 1 - market_price
            expected_payout = (1 - ai_probability) / no_price if no_price > 0 else 0

        return {
            "edge": round(edge, 4),
            "edge_pct": round(edge * 100, 2),
            "expected_payout": round(expected_payout, 4),
            "is_eligible": edge >= self.min_edge,
            "market_price": market_price,
            "ai_probability": ai_probability,
            "side": side,
        }

    def find_best_opportunity(self, market: dict, analysis: dict) -> dict:
        """
        Tentukan sisi terbaik untuk trading dan hitung edge

        Args:
            market: Data market dari Polymarket
            analysis: Hasil analisis AI

        Returns:
            Dict dengan rekomendasi trading
        """
        yes_price = market.get("yes_price", 0.5)
        no_price = market.get("no_price", 0.5)
        prob_yes = analysis.get("probability_yes", 0.5)
        prob_no = analysis.get("probability_no", 0.5)

        yes_edge = self.calculate_edge(yes_price, prob_yes, "YES")
        no_edge = self.calculate_edge(no_price, prob_no, "NO")

        # Pilih sisi dengan edge terbesar
        if yes_edge["edge"] >= no_edge["edge"]:
            best = yes_edge
        else:
            best = no_edge

        return {
            "market_id": market.get("id"),
            "question": market.get("question"),
            "recommended_side": best["side"],
            "edge": best["edge"],
            "edge_pct": best["edge_pct"],
            "is_eligible": best["is_eligible"],
            "market_price": best["market_price"],
            "ai_probability": best["ai_probability"],
            "confidence": analysis.get("confidence", 0.5),
            "risk_level": analysis.get("risk_level", "medium"),
            "reasoning": analysis.get("reasoning", ""),
            "yes_edge": yes_edge,
            "no_edge": no_edge,
        }
