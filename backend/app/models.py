from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    AGENT = "agent"
    LANDLORD = "landlord"
    SEEKER = "seeker"


class ListingStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING = "pending_review"
    APPROVED = "approved"
    REJECTED = "rejected"


class PropertyType(str, enum.Enum):
    HOUSE = "house"
    APARTMENT = "apartment"
    COMMERCIAL = "commercial"
    LAND = "land"
    OTHER = "other"


class ListingPurpose(str, enum.Enum):
    RENT = "rent"
    SALE = "sale"
    LEASE = "lease"


class MediaType(str, enum.Enum):
    IMAGE = "image"
    VIDEO = "video"


class PolicySeverity(str, enum.Enum):
    BLOCK = "block"
    FLAG = "flag"


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    phone_number: Mapped[str | None]
    password_hash: Mapped[str]
    full_name: Mapped[str]
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.SEEKER)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    listings: Mapped[list[PropertyListing]] = relationship(
        "PropertyListing", back_populates="owner", cascade="all, delete-orphan"
    )
    agent_listings: Mapped[list[PropertyListing]] = relationship(
        "PropertyListing", back_populates="agent", foreign_keys=lambda: [PropertyListing.agent_id]
    )
    payouts: Mapped[list[RewardPayout]] = relationship(
        "RewardPayout", back_populates="agent", cascade="all, delete-orphan"
    )
    audit_logs: Mapped[list[AuditLog]] = relationship("AuditLog", back_populates="user")


class PropertyListing(Base, TimestampMixin):
    __tablename__ = "property_listings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text)
    price: Mapped[float] = mapped_column(Numeric(12, 2))
    currency: Mapped[str] = mapped_column(String(10), default="USD")
    location_city: Mapped[str] = mapped_column(String(100))
    location_area: Mapped[str] = mapped_column(String(100))
    bedrooms: Mapped[int | None]
    bathrooms: Mapped[int | None]
    property_type: Mapped[PropertyType] = mapped_column(Enum(PropertyType))
    listing_purpose: Mapped[ListingPurpose] = mapped_column(Enum(ListingPurpose))
    status: Mapped[ListingStatus] = mapped_column(Enum(ListingStatus), default=ListingStatus.PENDING)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    tags: Mapped[list[str]] = mapped_column(JSON, default=list)
    amenities: Mapped[list[str]] = mapped_column(JSON, default=list)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    agent_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    verified_at: Mapped[datetime | None]

    owner: Mapped[User] = relationship("User", foreign_keys=[owner_id], back_populates="listings")
    agent: Mapped[User | None] = relationship(
        "User", foreign_keys=[agent_id], back_populates="agent_listings", lazy="joined"
    )
    media_items: Mapped[list[ListingMedia]] = relationship(
        "ListingMedia", back_populates="listing", cascade="all, delete-orphan"
    )
    inquiries: Mapped[list[Inquiry]] = relationship(
        "Inquiry", back_populates="listing", cascade="all, delete-orphan"
    )
    policy_events: Mapped[list[PolicyEvent]] = relationship("PolicyEvent", back_populates="listing")


class ListingMedia(Base, TimestampMixin):
    __tablename__ = "listing_media"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    listing_id: Mapped[int] = mapped_column(ForeignKey("property_listings.id", ondelete="CASCADE"))
    url: Mapped[str] = mapped_column(String(500))
    media_type: Mapped[MediaType] = mapped_column(Enum(MediaType))

    listing: Mapped[PropertyListing] = relationship("PropertyListing", back_populates="media_items")


class Inquiry(Base, TimestampMixin):
    __tablename__ = "inquiries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    listing_id: Mapped[int] = mapped_column(ForeignKey("property_listings.id", ondelete="CASCADE"))
    contact_name: Mapped[str]
    contact_phone: Mapped[str | None]
    contact_email: Mapped[str | None]
    message: Mapped[str]
    source: Mapped[str] = mapped_column(String(50), default="web")

    listing: Mapped[PropertyListing] = relationship("PropertyListing", back_populates="inquiries")


class RewardPool(Base):
    __tablename__ = "reward_pools"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    total_amount: Mapped[float] = mapped_column(Numeric(12, 2))
    available_amount: Mapped[float] = mapped_column(Numeric(12, 2))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    payouts: Mapped[list[RewardPayout]] = relationship(
        "RewardPayout", back_populates="reward_pool", cascade="all, delete-orphan"
    )


class RewardPayout(Base, TimestampMixin):
    __tablename__ = "reward_payouts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    reward_pool_id: Mapped[int] = mapped_column(ForeignKey("reward_pools.id"))
    agent_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    listing_id: Mapped[int | None] = mapped_column(ForeignKey("property_listings.id"))
    amount: Mapped[float] = mapped_column(Numeric(12, 2))
    reason: Mapped[str] = mapped_column(String(255))

    reward_pool: Mapped[RewardPool] = relationship("RewardPool", back_populates="payouts")
    agent: Mapped[User] = relationship("User", back_populates="payouts")
    listing: Mapped[PropertyListing | None] = relationship("PropertyListing")


class AuditLog(Base, TimestampMixin):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(255))
    entity_type: Mapped[str] = mapped_column(String(100))
    entity_id: Mapped[int | None]
    details: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    user: Mapped[User | None] = relationship("User", back_populates="audit_logs")


class PolicyRule(Base, TimestampMixin):
    __tablename__ = "policy_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    phrase: Mapped[str] = mapped_column(String(255), unique=True)
    severity: Mapped[PolicySeverity] = mapped_column(Enum(PolicySeverity))
    description: Mapped[str | None]


class PolicyEvent(Base, TimestampMixin):
    __tablename__ = "policy_events"
    __table_args__ = (
        UniqueConstraint("listing_id", "phrase", "severity", name="uq_policy_event_listing_phrase"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    listing_id: Mapped[int | None] = mapped_column(ForeignKey("property_listings.id", ondelete="SET NULL"))
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    phrase: Mapped[str] = mapped_column(String(255))
    severity: Mapped[PolicySeverity] = mapped_column(Enum(PolicySeverity))
    text_excerpt: Mapped[str | None]

    listing: Mapped[PropertyListing | None] = relationship("PropertyListing", back_populates="policy_events")
    user: Mapped[User | None] = relationship("User")


class Announcement(Base, TimestampMixin):
    __tablename__ = "announcements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    audience: Mapped[str] = mapped_column(String(50), default="public")


class PartnerIntegration(Base, TimestampMixin):
    __tablename__ = "partner_integrations"
    __table_args__ = (
        CheckConstraint("char_length(name) > 2", name="ck_partner_name_length"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True)
    contact_email: Mapped[str | None]
    webhook_url: Mapped[str | None]
    integration_metadata: Mapped[dict | None] = mapped_column(JSON, nullable=True)
