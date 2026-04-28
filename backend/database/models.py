"""
Model database ORM — semua tabel untuk bot
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text, JSON
)
from backend.database.db import Base


class Settings(Base):
    """Pengaturan umum bot"""
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, default=1)
    # Mode operasi
    mode = Column(String(10), default="testnet")  # testnet | mainnet
    # Modal
    protected_capital = Column(Float, default=5.0)
    trading_capital = Column(Float, default=5.0)
    virtual_balance = Column(Float, default=10.0)
    # Risiko
    min_edge = Column(Float, default=0.15)
    max_position_pct = Column(Float, default=0.25)
    daily_target = Column(Float, default=5.0)
    kill_switch_pct = Column(Float, default=0.40)
    trading_duration_days = Column(Integer, default=30)
    max_concurrent = Column(Integer, default=3)
    consecutive_loss_limit = Column(Integer, default=3)
    # Wallet (encrypted)
    wallet_private_key = Column(Text, nullable=True)
    wallet_address = Column(String(42), nullable=True)
    # Telegram
    telegram_bot_token = Column(String(100), nullable=True)
    telegram_chat_id = Column(String(50), nullable=True)
    telegram_notify_trade = Column(Boolean, default=True)
    telegram_notify_error = Column(Boolean, default=True)
    telegram_notify_daily = Column(Boolean, default=True)
    telegram_notify_killswitch = Column(Boolean, default=True)
    # Trading state
    bot_status = Column(String(20), default="idle")
    start_date = Column(DateTime, nullable=True)
    # Tema
    dark_mode = Column(Boolean, default=False)
    # Timestamps
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AIProvider(Base):
    """Provider AI yang dikonfigurasi user"""
    __tablename__ = "ai_providers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    provider = Column(String(30), nullable=False)  # anthropic, openai, dll
    api_key = Column(Text, nullable=True)  # encrypted
    model = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)
    is_primary = Column(Boolean, default=False)
    priority_order = Column(Integer, default=0)
    base_url = Column(String(255), nullable=True)  # untuk Ollama
    status = Column(String(20), default="unchecked")  # active, error, unchecked
    last_checked = Column(DateTime, nullable=True)
    total_requests = Column(Integer, default=0)
    total_wins = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Trade(Base):
    """Riwayat trade"""
    __tablename__ = "trades"

    id = Column(Integer, primary_key=True, autoincrement=True)
    mode = Column(String(10), default="testnet")
    market_id = Column(String(100), nullable=False)
    market_question = Column(Text, nullable=False)
    market_category = Column(String(50), nullable=True)
    side = Column(String(5), nullable=False)  # YES / NO
    size = Column(Float, nullable=False)
    entry_price = Column(Float, nullable=False)
    exit_price = Column(Float, nullable=True)
    pnl = Column(Float, nullable=True)
    status = Column(String(20), default="open")  # open, closed, simulated
    ai_provider = Column(String(30), nullable=True)
    ai_confidence = Column(Float, nullable=True)
    edge = Column(Float, nullable=True)
    kelly_fraction = Column(Float, nullable=True)
    tx_hash = Column(String(100), nullable=True)
    opened_at = Column(DateTime, default=datetime.utcnow)
    closed_at = Column(DateTime, nullable=True)


class DailyStats(Base):
    """Statistik harian"""
    __tablename__ = "daily_stats"

    id = Column(Integer, primary_key=True, autoincrement=True)
    date = Column(String(10), nullable=False)  # YYYY-MM-DD
    mode = Column(String(10), default="testnet")
    total_trades = Column(Integer, default=0)
    wins = Column(Integer, default=0)
    losses = Column(Integer, default=0)
    pnl = Column(Float, default=0.0)
    starting_capital = Column(Float, default=0.0)
    ending_capital = Column(Float, default=0.0)
    locked_profit = Column(Float, default=0.0)
    max_drawdown = Column(Float, default=0.0)


class BotLog(Base):
    """Log aktivitas bot"""
    __tablename__ = "bot_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    level = Column(String(10), default="info")
    message = Column(Text, nullable=False)
    data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
