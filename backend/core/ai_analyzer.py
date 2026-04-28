"""
Multi-AI Analyzer — Abstraksi untuk berbagai provider AI
Mendukung: Anthropic, OpenAI, Gemini, Grok, OpenRouter, Mistral, Cohere, Ollama
"""
import logging
import json
from typing import Optional
from datetime import datetime
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database.models import AIProvider

logger = logging.getLogger(__name__)

# Template prompt untuk analisis market
ANALYSIS_PROMPT = """Kamu adalah analis pasar prediksi profesional.
Analisis market berikut dan berikan probabilitas dalam format JSON.

Market: {question}
Kategori: {category}
Harga YES saat ini: {yes_price}
Harga NO saat ini: {no_price}
Likuiditas: ${liquidity}
Volume: ${volume}
Tanggal berakhir: {end_date}

Harga BTC saat ini: ${btc_price}
Harga ETH saat ini: ${eth_price}

Berikan analisis dalam format JSON berikut:
{{
    "probability_yes": 0.0-1.0,
    "probability_no": 0.0-1.0,
    "confidence": 0.0-1.0,
    "reasoning": "penjelasan singkat",
    "recommended_side": "YES" atau "NO" atau "SKIP",
    "risk_level": "low" atau "medium" atau "high"
}}

PENTING: Hanya kembalikan JSON valid, tanpa teks tambahan."""


class AIAnalyzer:
    """Analyzer multi-provider dengan fallback otomatis"""

    def __init__(self, session: AsyncSession):
        self.session = session
        self._http = httpx.AsyncClient(timeout=60.0)

    async def analyze_market(
        self,
        market: dict,
        crypto_prices: dict,
    ) -> Optional[dict]:
        """Analisis market menggunakan AI provider yang tersedia"""
        providers = await self._get_active_providers()
        if not providers:
            logger.warning("Tidak ada AI provider aktif")
            return None

        prompt = ANALYSIS_PROMPT.format(
            question=market.get("question", ""),
            category=market.get("category", ""),
            yes_price=market.get("yes_price", 0.5),
            no_price=market.get("no_price", 0.5),
            liquidity=market.get("liquidity", 0),
            volume=market.get("volume", 0),
            end_date=market.get("end_date", "N/A"),
            btc_price=crypto_prices.get("btcusdt", {}).get("price", 0),
            eth_price=crypto_prices.get("ethusdt", {}).get("price", 0),
        )

        # Coba setiap provider sesuai urutan prioritas
        for provider in providers:
            try:
                result = await self._call_provider(provider, prompt)
                if result:
                    result["provider"] = provider.provider
                    result["model"] = provider.model

                    # Update statistik
                    provider.total_requests += 1
                    provider.last_checked = datetime.utcnow()
                    provider.status = "active"
                    await self.session.commit()

                    return result
            except Exception as e:
                logger.error(f"Error dari {provider.provider}: {e}")
                provider.status = "error"
                await self.session.commit()
                continue

        return None

    async def test_provider(self, provider_id: int) -> dict:
        """Test koneksi ke provider AI"""
        result = await self.session.execute(
            select(AIProvider).where(AIProvider.id == provider_id)
        )
        provider = result.scalar_one_or_none()
        if not provider:
            return {"success": False, "error": "Provider tidak ditemukan"}

        try:
            test_prompt = "Jawab hanya dengan: OK"
            response = await self._call_provider(provider, test_prompt)
            provider.status = "active"
            provider.last_checked = datetime.utcnow()
            await self.session.commit()
            return {"success": True, "message": "Koneksi berhasil"}
        except Exception as e:
            provider.status = "error"
            provider.last_checked = datetime.utcnow()
            await self.session.commit()
            return {"success": False, "error": str(e)}

    async def _call_provider(
        self, provider: AIProvider, prompt: str
    ) -> Optional[dict]:
        """Panggil provider AI spesifik"""
        handlers = {
            "anthropic": self._call_anthropic,
            "openai": self._call_openai,
            "gemini": self._call_gemini,
            "grok": self._call_grok,
            "openrouter": self._call_openrouter,
            "mistral": self._call_mistral,
            "cohere": self._call_cohere,
            "ollama": self._call_ollama,
        }

        handler = handlers.get(provider.provider)
        if not handler:
            raise ValueError(f"Provider tidak didukung: {provider.provider}")

        return await handler(provider, prompt)

    async def _call_anthropic(
        self, provider: AIProvider, prompt: str
    ) -> Optional[dict]:
        response = await self._http.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": provider.api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": provider.model,
                "max_tokens": 1024,
                "messages": [{"role": "user", "content": prompt}],
            },
        )
        response.raise_for_status()
        data = response.json()
        text = data["content"][0]["text"]
        return self._parse_json_response(text)

    async def _call_openai(
        self, provider: AIProvider, prompt: str
    ) -> Optional[dict]:
        response = await self._http.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {provider.api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": provider.model,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 1024,
                "temperature": 0.3,
            },
        )
        response.raise_for_status()
        data = response.json()
        text = data["choices"][0]["message"]["content"]
        return self._parse_json_response(text)

    async def _call_gemini(
        self, provider: AIProvider, prompt: str
    ) -> Optional[dict]:
        response = await self._http.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{provider.model}:generateContent",
            params={"key": provider.api_key},
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.3, "maxOutputTokens": 1024},
            },
        )
        response.raise_for_status()
        data = response.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        return self._parse_json_response(text)

    async def _call_grok(
        self, provider: AIProvider, prompt: str
    ) -> Optional[dict]:
        response = await self._http.post(
            "https://api.x.ai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {provider.api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": provider.model,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 1024,
            },
        )
        response.raise_for_status()
        data = response.json()
        text = data["choices"][0]["message"]["content"]
        return self._parse_json_response(text)

    async def _call_openrouter(
        self, provider: AIProvider, prompt: str
    ) -> Optional[dict]:
        response = await self._http.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {provider.api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": provider.model,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 1024,
            },
        )
        response.raise_for_status()
        data = response.json()
        text = data["choices"][0]["message"]["content"]
        return self._parse_json_response(text)

    async def _call_mistral(
        self, provider: AIProvider, prompt: str
    ) -> Optional[dict]:
        response = await self._http.post(
            "https://api.mistral.ai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {provider.api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": provider.model,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 1024,
            },
        )
        response.raise_for_status()
        data = response.json()
        text = data["choices"][0]["message"]["content"]
        return self._parse_json_response(text)

    async def _call_cohere(
        self, provider: AIProvider, prompt: str
    ) -> Optional[dict]:
        response = await self._http.post(
            "https://api.cohere.ai/v1/chat",
            headers={
                "Authorization": f"Bearer {provider.api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": provider.model,
                "message": prompt,
                "max_tokens": 1024,
            },
        )
        response.raise_for_status()
        data = response.json()
        text = data.get("text", "")
        return self._parse_json_response(text)

    async def _call_ollama(
        self, provider: AIProvider, prompt: str
    ) -> Optional[dict]:
        base_url = provider.base_url or "http://localhost:11434"
        response = await self._http.post(
            f"{base_url}/api/generate",
            json={
                "model": provider.model,
                "prompt": prompt,
                "stream": False,
            },
        )
        response.raise_for_status()
        data = response.json()
        text = data.get("response", "")
        return self._parse_json_response(text)

    def _parse_json_response(self, text: str) -> Optional[dict]:
        """Parse respons JSON dari AI"""
        try:
            # Coba parse langsung
            return json.loads(text)
        except json.JSONDecodeError:
            # Coba ekstrak JSON dari teks
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                try:
                    return json.loads(text[start:end])
                except json.JSONDecodeError:
                    pass
        logger.warning(f"Gagal parse respons AI: {text[:200]}")
        return None

    async def _get_active_providers(self) -> list[AIProvider]:
        """Ambil provider aktif diurutkan berdasarkan prioritas"""
        result = await self.session.execute(
            select(AIProvider)
            .where(AIProvider.is_active.is_(True))
            .order_by(AIProvider.is_primary.desc(), AIProvider.priority_order.asc())
        )
        return list(result.scalars().all())

    async def close(self):
        await self._http.aclose()
