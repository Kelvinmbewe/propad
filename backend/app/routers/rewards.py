from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import schemas
from ..auth import require_role
from ..database import get_db
from ..models import RewardPayout, User, UserRole
from ..services.rewards import allocate_payout, get_or_create_reward_pool

router = APIRouter(prefix="/rewards", tags=["rewards"])


@router.get("/pool", response_model=schemas.RewardPoolRead)
async def read_reward_pool(
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.AGENT)),
    db: AsyncSession = Depends(get_db),
):
    pool = await get_or_create_reward_pool(db)
    return schemas.RewardPoolRead.from_orm(pool)


@router.get("/payouts", response_model=list[schemas.RewardPayoutRead])
async def list_payouts(
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.AGENT)),
    db: AsyncSession = Depends(get_db),
    agent_id: int | None = Query(None),
):
    stmt: Select[tuple[RewardPayout]] = select(RewardPayout)
    if current_user.role == UserRole.AGENT:
        stmt = stmt.where(RewardPayout.agent_id == current_user.id)
    elif agent_id:
        stmt = stmt.where(RewardPayout.agent_id == agent_id)
    stmt = stmt.order_by(RewardPayout.created_at.desc())
    result = await db.execute(stmt)
    return [schemas.RewardPayoutRead.from_orm(payout) for payout in result.scalars().all()]


@router.post("/payouts", response_model=schemas.RewardPayoutRead, status_code=status.HTTP_201_CREATED)
async def create_payout(
    payload: schemas.RewardPayoutCreate,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(User).where(User.id == payload.agent_id)
    result = await db.execute(stmt)
    agent = result.scalar_one_or_none()
    if agent is None or agent.role != UserRole.AGENT:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Agent not found")
    payout = await allocate_payout(
        db,
        agent=agent,
        amount=payload.amount,
        reason=payload.reason,
        listing_id=payload.listing_id,
        performed_by=current_user,
    )
    await db.commit()
    await db.refresh(payout)
    return schemas.RewardPayoutRead.from_orm(payout)
