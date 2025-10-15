from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import schemas
from ..auth import require_role
from ..database import get_db
from ..models import Inquiry, ListingStatus, PropertyListing, User, UserRole

router = APIRouter(prefix="/agents", tags=["agents"])


@router.get("/", response_model=list[schemas.UserRead])
async def list_agents(db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.role == UserRole.AGENT, User.is_active.is_(True))
    result = await db.execute(stmt)
    return [schemas.UserRead.from_orm(agent) for agent in result.scalars().all()]


@router.get("/me/dashboard")
async def agent_dashboard(
    current_user: User = Depends(require_role(UserRole.AGENT, UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    listing_stmt = select(func.count(PropertyListing.id)).where(PropertyListing.agent_id == current_user.id)
    listing_count = (await db.execute(listing_stmt)).scalar_one()
    leads_stmt = (
        select(func.count(Inquiry.id))
        .join(PropertyListing, PropertyListing.id == Inquiry.listing_id)
        .where(PropertyListing.agent_id == current_user.id)
    )
    leads_count = (await db.execute(leads_stmt)).scalar_one()

    approved_stmt = (
        select(func.count(PropertyListing.id))
        .where(PropertyListing.agent_id == current_user.id, PropertyListing.status == ListingStatus.APPROVED)
    )
    approved_count = (await db.execute(approved_stmt)).scalar_one()

    return {
        "agent": schemas.UserRead.from_orm(current_user),
        "metrics": {
            "listings": listing_count,
            "leads": leads_count,
            "approved_listings": approved_count,
        },
    }
