from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr, Field

from .models import ListingPurpose, ListingStatus, MediaType, PolicySeverity, PropertyType, UserRole


class APIModel(BaseModel):
    class Config:
        orm_mode = True


class Token(APIModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: int
    role: UserRole


class UserBase(APIModel):
    email: EmailStr
    full_name: str
    phone_number: str | None = None
    role: UserRole


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str
    phone_number: str | None = None
    role: UserRole = UserRole.SEEKER


class UserUpdate(BaseModel):
    full_name: str | None = None
    phone_number: str | None = None
    is_active: bool | None = None


class UserRead(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ListingMediaCreate(BaseModel):
    url: str
    media_type: MediaType = MediaType.IMAGE


class ListingMediaRead(APIModel):
    id: int
    url: str
    media_type: MediaType


class ListingBase(BaseModel):
    title: str
    description: str
    price: float
    currency: str = "USD"
    location_city: str
    location_area: str
    bedrooms: int | None = None
    bathrooms: int | None = None
    property_type: PropertyType
    listing_purpose: ListingPurpose
    tags: list[str] = Field(default_factory=list)
    amenities: list[str] = Field(default_factory=list)


class ListingCreate(ListingBase):
    media_items: list[ListingMediaCreate] = Field(default_factory=list)


class ListingUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    price: float | None = None
    currency: str | None = None
    location_city: str | None = None
    location_area: str | None = None
    bedrooms: int | None = None
    bathrooms: int | None = None
    property_type: PropertyType | None = None
    listing_purpose: ListingPurpose | None = None
    tags: list[str] | None = None
    amenities: list[str] | None = None
    status: ListingStatus | None = None
    is_featured: bool | None = None
    media_items: list[ListingMediaCreate] | None = None


class ListingRead(ListingBase, APIModel):
    id: int
    status: ListingStatus
    is_featured: bool
    owner_id: int
    agent_id: int | None
    verified_at: datetime | None
    created_at: datetime
    updated_at: datetime
    media_items: list[ListingMediaRead]


class InquiryCreate(BaseModel):
    contact_name: str
    contact_phone: str | None = None
    contact_email: EmailStr | None = None
    message: str
    source: str = "web"


class InquiryRead(APIModel):
    id: int
    listing_id: int
    contact_name: str
    contact_phone: str | None
    contact_email: str | None
    message: str
    source: str
    created_at: datetime


class RewardPoolRead(APIModel):
    id: int
    total_amount: float
    available_amount: float
    created_at: datetime


class RewardPayoutCreate(BaseModel):
    agent_id: int
    listing_id: int | None = None
    amount: float
    reason: str


class RewardPayoutRead(APIModel):
    id: int
    reward_pool_id: int
    agent_id: int
    listing_id: int | None
    amount: float
    reason: str
    created_at: datetime


class ModerationAction(BaseModel):
    reason: str = Field(..., min_length=3)


class AuditLogRead(APIModel):
    id: int
    user_id: int | None
    action: str
    entity_type: str
    entity_id: int | None
    details: dict[str, Any] | None
    created_at: datetime


class PolicyRuleCreate(BaseModel):
    phrase: str
    severity: PolicySeverity
    description: str | None = None


class PolicyRuleRead(APIModel):
    id: int
    phrase: str
    severity: PolicySeverity
    description: str | None
    created_at: datetime


class PolicyEventRead(APIModel):
    id: int
    listing_id: int | None
    user_id: int | None
    phrase: str
    severity: PolicySeverity
    text_excerpt: str | None
    created_at: datetime


class AnnouncementCreate(BaseModel):
    title: str
    body: str
    is_active: bool = True
    audience: str = "public"


class AnnouncementRead(APIModel):
    id: int
    title: str
    body: str
    is_active: bool
    audience: str
    created_at: datetime


class PartnerIntegrationCreate(BaseModel):
    name: str
    contact_email: str | None = None
    webhook_url: str | None = None
    integration_metadata: dict[str, Any] | None = None


class PartnerIntegrationRead(APIModel):
    id: int
    name: str
    contact_email: str | None
    webhook_url: str | None
    integration_metadata: dict[str, Any] | None
    created_at: datetime
