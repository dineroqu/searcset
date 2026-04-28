"""
Trade Routes — Endpoint untuk riwayat dan manajemen trade
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from database.db import get_session
from database.models import Trade, Settings

router = APIRouter(prefix="/api/trades", tags=["trades"])


@router.get("/")
async def get_trades(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    mode: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
):
    """Dapatkan daftar trade dengan filter dan pagination"""
    # Ambil mode dari settings jika tidak di-specify
    if not mode:
        result = await session.execute(select(Settings).where(Settings.id == 1))
        settings = result.scalar_one_or_none()
        mode = settings.mode if settings else "testnet"

    query = select(Trade).where(Trade.mode == mode)

    if status == "win":
        query = query.where(Trade.pnl > 0)
    elif status == "loss":
        query = query.where(Trade.pnl < 0)

    if date_from:
        query = query.where(func.date(Trade.opened_at) >= date_from)
    if date_to:
        query = query.where(func.date(Trade.opened_at) <= date_to)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = (await session.execute(count_query)).scalar() or 0

    # Paginate
    query = query.order_by(desc(Trade.opened_at))
    query = query.offset((page - 1) * per_page).limit(per_page)

    result = await session.execute(query)
    trades = result.scalars().all()

    return {
        "trades": [
            {
                "id": t.id,
                "mode": t.mode,
                "market_id": t.market_id,
                "market_question": t.market_question,
                "market_category": t.market_category,
                "side": t.side,
                "size": t.size,
                "entry_price": t.entry_price,
                "exit_price": t.exit_price,
                "pnl": t.pnl,
                "status": t.status,
                "ai_provider": t.ai_provider,
                "ai_confidence": t.ai_confidence,
                "edge": t.edge,
                "kelly_fraction": t.kelly_fraction,
                "tx_hash": t.tx_hash,
                "opened_at": t.opened_at.isoformat() if t.opened_at else None,
                "closed_at": t.closed_at.isoformat() if t.closed_at else None,
            }
            for t in trades
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page,
    }


@router.get("/summary")
async def get_trade_summary(
    mode: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
):
    """Dapatkan ringkasan statistik trade"""
    if not mode:
        result = await session.execute(select(Settings).where(Settings.id == 1))
        settings = result.scalar_one_or_none()
        mode = settings.mode if settings else "testnet"

    base = select(Trade).where(
        Trade.mode == mode,
        Trade.status.in_(["closed", "simulated"]),
    )

    # Total trades
    total_q = select(func.count()).select_from(base.subquery())
    total = (await session.execute(total_q)).scalar() or 0

    # Wins
    wins_q = select(func.count()).select_from(
        base.where(Trade.pnl > 0).subquery()
    )
    wins = (await session.execute(wins_q)).scalar() or 0

    # Losses
    losses = total - wins

    # Win rate
    win_rate = (wins / total * 100) if total > 0 else 0

    # Best / worst trade
    best_q = select(func.max(Trade.pnl)).where(
        Trade.mode == mode, Trade.status.in_(["closed", "simulated"])
    )
    best = (await session.execute(best_q)).scalar() or 0

    worst_q = select(func.min(Trade.pnl)).where(
        Trade.mode == mode, Trade.status.in_(["closed", "simulated"])
    )
    worst = (await session.execute(worst_q)).scalar() or 0

    # Total P&L
    total_pnl_q = select(func.coalesce(func.sum(Trade.pnl), 0.0)).where(
        Trade.mode == mode, Trade.status.in_(["closed", "simulated"])
    )
    total_pnl = float((await session.execute(total_pnl_q)).scalar() or 0)

    return {
        "total_trades": total,
        "wins": wins,
        "losses": losses,
        "win_rate": round(win_rate, 1),
        "best_trade": round(best, 4),
        "worst_trade": round(worst, 4),
        "total_pnl": round(total_pnl, 2),
    }


@router.get("/recent")
async def get_recent_trades(
    limit: int = Query(10, ge=1, le=50),
    session: AsyncSession = Depends(get_session),
):
    """Dapatkan trade terbaru"""
    result = await session.execute(select(Settings).where(Settings.id == 1))
    settings = result.scalar_one_or_none()
    mode = settings.mode if settings else "testnet"

    result = await session.execute(
        select(Trade)
        .where(Trade.mode == mode)
        .order_by(desc(Trade.opened_at))
        .limit(limit)
    )
    trades = result.scalars().all()

    return [
        {
            "id": t.id,
            "market_question": t.market_question,
            "side": t.side,
            "size": t.size,
            "pnl": t.pnl,
            "status": t.status,
            "ai_provider": t.ai_provider,
            "opened_at": t.opened_at.isoformat() if t.opened_at else None,
        }
        for t in trades
    ]


@router.get("/active")
async def get_active_positions(
    session: AsyncSession = Depends(get_session),
):
    """Dapatkan posisi yang masih terbuka"""
    result = await session.execute(select(Settings).where(Settings.id == 1))
    settings = result.scalar_one_or_none()
    mode = settings.mode if settings else "testnet"

    result = await session.execute(
        select(Trade)
        .where(Trade.mode == mode, Trade.status == "open")
        .order_by(desc(Trade.opened_at))
    )
    trades = result.scalars().all()

    return [
        {
            "id": t.id,
            "market_id": t.market_id,
            "market_question": t.market_question,
            "side": t.side,
            "size": t.size,
            "entry_price": t.entry_price,
            "pnl": t.pnl,
            "ai_provider": t.ai_provider,
            "edge": t.edge,
            "opened_at": t.opened_at.isoformat() if t.opened_at else None,
        }
        for t in trades
    ]
