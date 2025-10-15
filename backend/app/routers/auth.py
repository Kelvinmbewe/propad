from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import schemas
from ..auth import authenticate_user, create_access_token, get_password_hash
from ..config import get_settings
from ..database import get_db
from ..models import User
from ..utils.audit import record_audit_log

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


@router.post("/register", response_model=schemas.UserRead, status_code=status.HTTP_201_CREATED)
async def register_user(payload: schemas.UserCreate, db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.email == payload.email)
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = User(
        email=payload.email,
        password_hash=get_password_hash(payload.password),
        full_name=payload.full_name,
        phone_number=payload.phone_number,
        role=payload.role,
    )
    db.add(user)
    await db.flush()
    await record_audit_log(
        db,
        user_id=user.id,
        action="user_registered",
        entity_type="User",
        entity_id=user.id,
        details={"email": user.email, "role": user.role.value},
    )
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/token", response_model=schemas.Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect credentials")
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(data={"sub": user.id, "role": user.role.value}, expires_delta=access_token_expires)
    await record_audit_log(
        db,
        user_id=user.id,
        action="user_login",
        entity_type="User",
        entity_id=user.id,
        details={"email": user.email},
    )
    await db.commit()
    return schemas.Token(access_token=access_token)
