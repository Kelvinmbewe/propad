from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import schemas
from ..auth import require_role
from ..database import get_db
from datetime import datetime

from ..models import (
    Announcement,
    AuditLog,
    ListingStatus,
    PartnerIntegration,
    PolicyRule,
    PropertyListing,
    User,
    UserRole,
)
from ..utils.audit import record_audit_log

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_role(UserRole.ADMIN))])


@router.get("/listings/pending", response_model=list[schemas.ListingRead])
async def list_pending_listings(db: AsyncSession = Depends(get_db)):
    stmt = select(PropertyListing).where(PropertyListing.status == ListingStatus.PENDING)
    result = await db.execute(stmt)
    listings = result.scalars().unique().all()
    return [schemas.ListingRead.from_orm(listing) for listing in listings]


@router.post("/listings/{listing_id}/approve", response_model=schemas.ListingRead)
async def approve_listing(
    listing_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    stmt = select(PropertyListing).where(PropertyListing.id == listing_id)
    result = await db.execute(stmt)
    listing = result.scalar_one_or_none()
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    listing.status = ListingStatus.APPROVED
    listing.verified_at = datetime.utcnow()
    await record_audit_log(
        db,
        user_id=current_user.id,
        action="listing_approved",
        entity_type="PropertyListing",
        entity_id=listing.id,
        details={"status": listing.status.value},
    )
    await db.commit()
    await db.refresh(listing)
    return schemas.ListingRead.from_orm(listing)


@router.post("/listings/{listing_id}/reject", response_model=schemas.ListingRead)
async def reject_listing(
    listing_id: int,
    payload: schemas.ModerationAction,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    stmt = select(PropertyListing).where(PropertyListing.id == listing_id)
    result = await db.execute(stmt)
    listing = result.scalar_one_or_none()
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    listing.status = ListingStatus.REJECTED
    await record_audit_log(
        db,
        user_id=current_user.id,
        action="listing_rejected",
        entity_type="PropertyListing",
        entity_id=listing.id,
        details={"reason": payload.reason},
    )
    await db.commit()
    await db.refresh(listing)
    return schemas.ListingRead.from_orm(listing)


@router.post("/policy/rules", response_model=schemas.PolicyRuleRead, status_code=status.HTTP_201_CREATED)
async def create_policy_rule(
    payload: schemas.PolicyRuleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    rule = PolicyRule(
        phrase=payload.phrase.lower(),
        severity=payload.severity,
        description=payload.description,
    )
    db.add(rule)
    await record_audit_log(
        db,
        user_id=current_user.id,
        action="policy_rule_created",
        entity_type="PolicyRule",
        entity_id=None,
        details=payload.dict(),
    )
    await db.commit()
    await db.refresh(rule)
    return schemas.PolicyRuleRead.from_orm(rule)


@router.delete("/policy/rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_policy_rule(
    rule_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    stmt = select(PolicyRule).where(PolicyRule.id == rule_id)
    result = await db.execute(stmt)
    rule = result.scalar_one_or_none()
    if rule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")
    await db.delete(rule)
    await record_audit_log(
        db,
        user_id=current_user.id,
        action="policy_rule_deleted",
        entity_type="PolicyRule",
        entity_id=rule_id,
        details=None,
    )
    await db.commit()


@router.post("/announcements", response_model=schemas.AnnouncementRead, status_code=status.HTTP_201_CREATED)
async def create_announcement(
    payload: schemas.AnnouncementCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    announcement = Announcement(**payload.dict())
    db.add(announcement)
    await record_audit_log(
        db,
        user_id=current_user.id,
        action="announcement_created",
        entity_type="Announcement",
        entity_id=None,
        details=payload.dict(),
    )
    await db.commit()
    await db.refresh(announcement)
    return schemas.AnnouncementRead.from_orm(announcement)


@router.post("/partners", response_model=schemas.PartnerIntegrationRead, status_code=status.HTTP_201_CREATED)
async def register_partner(
    payload: schemas.PartnerIntegrationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    partner = PartnerIntegration(**payload.dict())
    db.add(partner)
    await record_audit_log(
        db,
        user_id=current_user.id,
        action="partner_registered",
        entity_type="PartnerIntegration",
        entity_id=None,
        details=payload.dict(),
    )
    await db.commit()
    await db.refresh(partner)
    return schemas.PartnerIntegrationRead.from_orm(partner)


@router.get("/audit", response_model=list[schemas.AuditLogRead])
async def get_audit_logs(db: AsyncSession = Depends(get_db)):
    stmt = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(200)
    result = await db.execute(stmt)
    return [schemas.AuditLogRead.from_orm(log) for log in result.scalars().all()]
