from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import schemas
from ..database import get_db
from ..models import Inquiry, ListingStatus, PropertyListing
from ..utils.audit import record_audit_log

router = APIRouter(prefix="/inquiries", tags=["inquiries"])


@router.post("/{listing_id}", response_model=schemas.InquiryRead, status_code=status.HTTP_201_CREATED)
async def create_inquiry(
    listing_id: int,
    payload: schemas.InquiryCreate,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(PropertyListing).where(PropertyListing.id == listing_id)
    result = await db.execute(stmt)
    listing = result.scalar_one_or_none()
    if listing is None or listing.status != ListingStatus.APPROVED:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not available")

    inquiry = Inquiry(
        listing_id=listing.id,
        contact_name=payload.contact_name,
        contact_phone=payload.contact_phone,
        contact_email=payload.contact_email,
        message=payload.message,
        source=payload.source,
    )
    db.add(inquiry)
    await record_audit_log(
        db,
        user_id=None,
        action="inquiry_created",
        entity_type="Inquiry",
        entity_id=listing.id,
        details={"listing_id": listing_id, "source": payload.source},
    )
    await db.commit()
    await db.refresh(inquiry)
    return schemas.InquiryRead.from_orm(inquiry)
