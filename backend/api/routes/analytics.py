"""
Analytics Routes — Endpoint untuk statistik dan chart
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from database.db import get_session
from database.models import Trade, DailyStats, Settings

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/equity-curve")
async def get_equity_curve(
    mode: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
):
    """Data equity curve untuk line chart"""
    mode = mode or await _get_mode(session)

    result = await session.execute(
        select(DailyStats)
        .where(DailyStats.mode == mode)
        .order_by(DailyStats.date.asc())
    )
    stats = result.scalars().all()

    cumulative = 0.0
    data = []
    for s in stats:
        cumulative += s.pnl
        data.append({
            "date": s.date,
            "pnl": s.pnl,
            "cumulative": round(cumulative, 2),
            "capital": s.ending_capital,
        })

    return data


@router.get("/daily-pnl")
async def get_daily_pnl(
    mode: Optional[str] = None,
    days: int = Query(30, ge=1, le=365),
    session: AsyncSession = Depends(get_session),
):
    """Data P&L harian untuk bar chart"""
    mode = mode or await _get_mode(session)

    result = await session.execute(
        select(DailyStats)
        .where(DailyStats.mode == mode)
        .order_by(desc(DailyStats.date))
        .limit(days)
    )
    stats = result.scalars().all()

    return [
        {
            "date": s.date,
            "pnl": s.pnl,
            "trades": s.total_trades,
            "wins": s.wins,
            "losses": s.losses,
        }
        for s in reversed(list(stats))
    ]


@router.get("/win-loss")
async def get_win_loss_ratio(
    mode: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
):
    """Rasio win/loss untuk donut chart"""
    mode = mode or await _get_mode(session)

    wins_q = select(func.count()).where(
        Trade.mode == mode,
        Trade.status.in_(["closed", "simulated"]),
        Trade.pnl > 0,
    )
    losses_q = select(func.count()).where(
        Trade.mode == mode,
        Trade.status.in_(["closed", "simulated"]),
        Trade.pnl <= 0,
    )

    wins = (await session.execute(wins_q)).scalar() or 0
    losses = (await session.execute(losses_q)).scalar() or 0

    return {"wins": wins, "losses": losses, "total": wins + losses}


@router.get("/provider-performance")
async def get_provider_performance(
    mode: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
):
    """Performa per AI provider untuk bar chart"""
    mode = mode or await _get_mode(session)

    result = await session.execute(
        select(
            Trade.ai_provider,
            func.count(Trade.id).label("total"),
            func.sum(func.case((Trade.pnl > 0, 1), else_=0)).label("wins"),
            func.coalesce(func.sum(Trade.pnl), 0.0).label("total_pnl"),
        )
        .where(
            Trade.mode == mode,
            Trade.status.in_(["closed", "simulated"]),
            Trade.ai_provider.isnot(None),
        )
        .group_by(Trade.ai_provider)
    )
    rows = result.all()

    return [
        {
            "provider": row[0],
            "total_trades": row[1],
            "wins": row[2] or 0,
            "win_rate": round((row[2] or 0) / row[1] * 100, 1) if row[1] > 0 else 0,
            "total_pnl": round(float(row[3]), 2),
        }
        for row in rows
    ]


@router.get("/category-breakdown")
async def get_category_breakdown(
    mode: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
):
    """Breakdown per kategori market untuk pie chart"""
    mode = mode or await _get_mode(session)

    result = await session.execute(
        select(
            Trade.market_category,
            func.count(Trade.id).label("total"),
            func.coalesce(func.sum(Trade.pnl), 0.0).label("pnl"),
        )
        .where(
            Trade.mode == mode,
            Trade.status.in_(["closed", "simulated"]),
        )
        .group_by(Trade.market_category)
    )
    rows = result.all()

    return [
        {
            "category": row[0] or "Lainnya",
            "total_trades": row[1],
            "pnl": round(float(row[2]), 2),
        }
        for row in rows
    ]


@router.get("/hourly-heatmap")
async def get_hourly_heatmap(
    mode: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
):
    """Trading hours heatmap"""
    mode = mode or await _get_mode(session)

    result = await session.execute(
        select(Trade)
        .where(
            Trade.mode == mode,
            Trade.status.in_(["closed", "simulated"]),
        )
    )
    trades = result.scalars().all()

    # Buat matrix hari x jam
    heatmap = {}
    for trade in trades:
        if trade.opened_at:
            day = trade.opened_at.strftime("%A")
            hour = trade.opened_at.hour
            key = f"{day}_{hour}"
            if key not in heatmap:
                heatmap[key] = {"day": day, "hour": hour, "count": 0, "pnl": 0.0}
            heatmap[key]["count"] += 1
            heatmap[key]["pnl"] += trade.pnl or 0

    return list(heatmap.values())


async def _get_mode(session: AsyncSession) -> str:
    result = await session.execute(select(Settings).where(Settings.id == 1))
    settings = result.scalar_one_or_none()
    return settings.mode if settings else "testnet"
