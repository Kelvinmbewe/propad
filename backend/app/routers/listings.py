from collections.abc import Sequence

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import Select, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import schemas
from ..auth import get_current_user, get_optional_user, require_role
from ..database import get_db
from ..models import ListingMedia, ListingPurpose, ListingStatus, PropertyListing, PropertyType, User, UserRole
from ..utils.audit import record_audit_log
from ..utils.policy import record_policy_events

router = APIRouter(prefix="/listings", tags=["listings"])


def _serialize_listing(listing: PropertyListing) -> schemas.ListingRead:
    return schemas.ListingRead.from_orm(listing)


@router.get("/", response_model=list[schemas.ListingRead])
async def list_public_listings(
    db: AsyncSession = Depends(get_db),
    city: str | None = Query(None),
    purpose: ListingPurpose | None = Query(None),
    property_type: PropertyType | None = Query(None),
    min_price: float | None = Query(None, ge=0),
    max_price: float | None = Query(None, ge=0),
    search: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
) -> Sequence[schemas.ListingRead]:
    stmt: Select[tuple[PropertyListing]] = select(PropertyListing).where(
        PropertyListing.status == ListingStatus.APPROVED
    )
    if city:
        stmt = stmt.where(func.lower(PropertyListing.location_city) == city.lower())
    if property_type:
        stmt = stmt.where(PropertyListing.property_type == property_type)
    if purpose:
        stmt = stmt.where(PropertyListing.listing_purpose == purpose)
    if min_price is not None:
        stmt = stmt.where(PropertyListing.price >= min_price)
    if max_price is not None:
        stmt = stmt.where(PropertyListing.price <= max_price)
    if search:
        term = f"%{search.lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(PropertyListing.title).like(term),
                func.lower(PropertyListing.description).like(term),
                func.lower(PropertyListing.location_area).like(term),
            )
        )
    stmt = stmt.order_by(PropertyListing.is_featured.desc(), PropertyListing.created_at.desc()).limit(limit)
    result = await db.execute(stmt)
    listings = result.scalars().unique().all()
    return [_serialize_listing(listing) for listing in listings]


@router.get("/mine", response_model=list[schemas.ListingRead])
async def list_my_listings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(PropertyListing).where(PropertyListing.owner_id == current_user.id)
    result = await db.execute(stmt)
    listings = result.scalars().unique().all()
    return [_serialize_listing(listing) for listing in listings]


@router.get("/{listing_id}", response_model=schemas.ListingRead)
async def get_listing(
    listing_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    stmt = select(PropertyListing).where(PropertyListing.id == listing_id)
    result = await db.execute(stmt)
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    if listing.status != ListingStatus.APPROVED and (
        current_user is None or current_user.id not in {listing.owner_id, listing.agent_id}
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Listing not approved yet")
    return _serialize_listing(listing)


@router.post("/", response_model=schemas.ListingRead, status_code=status.HTTP_201_CREATED)
async def create_listing(
    payload: schemas.ListingCreate,
    current_user: User = Depends(require_role(UserRole.LANDLORD, UserRole.AGENT, UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    policy_result = await record_policy_events(
        db,
        listing_id=None,
        user_id=current_user.id,
        text=f"{payload.title}\n{payload.description}",
    )
    if policy_result.blocked:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Listing contains prohibited language", "blocked": policy_result.blocked},
        )
    listing = PropertyListing(
        title=payload.title,
        description=payload.description,
        price=payload.price,
        currency=payload.currency,
        location_city=payload.location_city,
        location_area=payload.location_area,
        bedrooms=payload.bedrooms,
        bathrooms=payload.bathrooms,
        property_type=payload.property_type,
        listing_purpose=payload.listing_purpose,
        status=ListingStatus.PENDING,
        tags=payload.tags,
        amenities=payload.amenities,
        owner_id=current_user.id,
        agent_id=current_user.id if current_user.role == UserRole.AGENT else None,
    )
    db.add(listing)
    await db.flush()
    for media in payload.media_items:
        listing.media_items.append(
            ListingMedia(
                url=media.url,
                media_type=media.media_type,
            )
        )
    await record_audit_log(
        db,
        user_id=current_user.id,
        action="listing_created",
        entity_type="PropertyListing",
        entity_id=listing.id,
        details={"title": listing.title, "flagged_terms": policy_result.flagged},
    )
    await db.commit()
    await db.refresh(listing)
    return _serialize_listing(listing)


@router.patch("/{listing_id}", response_model=schemas.ListingRead)
async def update_listing(
    listing_id: int,
    payload: schemas.ListingUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(PropertyListing).where(PropertyListing.id == listing_id)
    result = await db.execute(stmt)
    listing = result.scalar_one_or_none()
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    if current_user.role not in {UserRole.ADMIN} and listing.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to update this listing")

    if payload.status is not None and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can change status")
    if payload.is_featured is not None and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can feature listings")

    if payload.description or payload.title:
        policy_result = await record_policy_events(
            db,
            listing_id=listing.id,
            user_id=current_user.id,
            text=f"{payload.title or listing.title}\n{payload.description or listing.description}",
        )
        if policy_result.blocked:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"message": "Listing contains prohibited language", "blocked": policy_result.blocked},
            )
    else:
        policy_result = None

    for field, value in payload.dict(exclude_unset=True, exclude={"media_items"}).items():
        setattr(listing, field, value)
    if payload.media_items is not None:
        listing.media_items.clear()
        for media in payload.media_items:
            listing.media_items.append(
                ListingMedia(url=media.url, media_type=media.media_type)
            )
    await record_audit_log(
        db,
        user_id=current_user.id,
        action="listing_updated",
        entity_type="PropertyListing",
        entity_id=listing.id,
        details={"fields": list(payload.dict(exclude_unset=True).keys()), "flagged_terms": getattr(policy_result, "flagged", [])},
    )
    await db.commit()
    await db.refresh(listing)
    return _serialize_listing(listing)
