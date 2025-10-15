from __future__ import annotations

from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..models import RewardPayout, RewardPool, User
from ..utils.audit import record_audit_log


async def get_or_create_reward_pool(db: AsyncSession) -> RewardPool:
    stmt = select(RewardPool).order_by(RewardPool.created_at.desc())
    result = await db.execute(stmt)
    pool = result.scalars().first()
    if pool is None:
        settings = get_settings()
        pool = RewardPool(
            total_amount=Decimal(str(settings.reward_pool_amount)),
            available_amount=Decimal(str(settings.reward_pool_amount)),
        )
        db.add(pool)
        await db.flush()
    return pool


async def allocate_payout(
    db: AsyncSession,
    *,
    agent: User,
    amount: float,
    reason: str,
    listing_id: int | None,
    performed_by: User,
) -> RewardPayout:
    pool = await get_or_create_reward_pool(db)
    if float(pool.available_amount) < amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient reward pool balance",
        )
    pool.available_amount = Decimal(pool.available_amount) - Decimal(str(amount))
    payout = RewardPayout(
        reward_pool_id=pool.id,
        agent_id=agent.id,
        listing_id=listing_id,
        amount=Decimal(str(amount)),
        reason=reason,
    )
    db.add(payout)
    await record_audit_log(
        db,
        user_id=performed_by.id,
        action="reward_payout",
        entity_type="RewardPayout",
        entity_id=None,
        details={"agent_id": agent.id, "amount": amount, "reason": reason},
    )
    return payout
