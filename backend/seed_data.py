import asyncio
from datetime import datetime, timedelta

from app.auth import get_password_hash
from app.database import Base, SessionLocal, engine
from app.models import ListingPurpose, ListingStatus, PropertyListing, PropertyType, User, UserRole


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as session:
        landlord = User(
            email="landlord@propad.co.zw",
            password_hash=get_password_hash("PropAd123!"),
            full_name="PropAd Landlord",
            phone_number="0770000000",
            role=UserRole.LANDLORD,
        )
        agent = User(
            email="agent@propad.co.zw",
            password_hash=get_password_hash("PropAd123!"),
            full_name="PropAd Agent",
            phone_number="0771000000",
            role=UserRole.AGENT,
        )
        admin = User(
            email="admin@propad.co.zw",
            password_hash=get_password_hash("PropAd123!"),
            full_name="PropAd Admin",
            phone_number="0772000000",
            role=UserRole.ADMIN,
        )
        session.add_all([landlord, agent, admin])
        await session.flush()

        listing = PropertyListing(
            title="2 Bedroom Apartment in Harare CBD",
            description="Spacious apartment ideal for young professionals. No viewing fees or hidden costs.",
            price=650,
            currency="USD",
            location_city="Harare",
            location_area="CBD",
            bedrooms=2,
            bathrooms=1,
            property_type=PropertyType.APARTMENT,
            listing_purpose=ListingPurpose.RENT,
            status=ListingStatus.APPROVED,
            verified_at=datetime.utcnow() - timedelta(days=1),
            owner_id=landlord.id,
            agent_id=agent.id,
            tags=["wifi", "parking"],
            amenities=["Backup power", "24/7 security"],
        )
        session.add(listing)
        await session.flush()

        await session.commit()


if __name__ == "__main__":
    asyncio.run(seed())
