"""
Konfigurasi aplikasi — semua settings dari database/environment
"""
from pydantic_settings import BaseSettings
from typing import Optional


class AppSettings(BaseSettings):
    """Settings dasar aplikasi"""
    APP_NAME: str = "Polymarket Smart Sniper Bot"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/bot.db"

    # JWT Auth
    JWT_SECRET: str = "polymarket-bot-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_HOURS: int = 24

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # Encryption key untuk private key wallet
    ENCRYPTION_KEY: Optional[str] = None

    class Config:
        env_file = ".env"


settings = AppSettings()

# Konstanta trading
DEFAULT_PROTECTED_CAPITAL = 5.0
DEFAULT_TRADING_CAPITAL = 5.0
DEFAULT_MIN_EDGE = 0.15
DEFAULT_MAX_POSITION_PCT = 0.25
DEFAULT_DAILY_TARGET = 5.0
DEFAULT_KILL_SWITCH_PCT = 0.40
DEFAULT_TRADING_DURATION_DAYS = 30
DEFAULT_MAX_CONCURRENT = 3
DEFAULT_CONSECUTIVE_LOSS_LIMIT = 3

# Polymarket API
POLYMARKET_API_BASE = "https://clob.polymarket.com"
POLYMARKET_GAMMA_API = "https://gamma-api.polymarket.com"

# Binance WebSocket
BINANCE_WS_URL = "wss://stream.binance.com:9443/ws"
BINANCE_STREAMS = ["btcusdt@ticker", "ethusdt@ticker"]

# Market scanner
SCAN_INTERVAL_SECONDS = 30
MIN_LIQUIDITY = 1000
MIN_VOLUME = 500
