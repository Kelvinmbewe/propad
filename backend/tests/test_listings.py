import pytest

from app.models import ListingPurpose, PropertyType, UserRole


@pytest.mark.asyncio
async def test_listing_creation_respects_policy(client):
    register_payload = {
        "email": "owner@test.com",
        "password": "SecurePass123!",
        "full_name": "Test Owner",
        "role": UserRole.LANDLORD.value,
    }
    resp = await client.post("/api/v1/auth/register", json=register_payload)
    assert resp.status_code == 201

    token_resp = await client.post(
        "/api/v1/auth/token",
        data={"username": register_payload["email"], "password": register_payload["password"]},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert token_resp.status_code == 200
    token = token_resp.json()["access_token"]

    blocked_payload = {
        "title": "House with viewing fee",
        "description": "A lovely house but requires a viewing fee to schedule.",
        "price": 500,
        "currency": "USD",
        "location_city": "Harare",
        "location_area": "Borrowdale",
        "bedrooms": 3,
        "bathrooms": 2,
        "property_type": PropertyType.HOUSE.value,
        "listing_purpose": ListingPurpose.RENT.value,
    }

    resp = await client.post(
        "/api/v1/listings/",
        json=blocked_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 400
    body = resp.json()
    assert "blocked" in body["detail"]

    allowed_payload = blocked_payload | {
        "title": "House with zero fees",
        "description": "Beautiful home with zero hidden fees and PropAd pays agents.",
    }
    resp = await client.post(
        "/api/v1/listings/",
        json=allowed_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201
    listing = resp.json()
    assert listing["status"] == "pending_review"
