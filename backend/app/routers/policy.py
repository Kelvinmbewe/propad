from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import require_role
from ..database import get_db
from ..models import User, UserRole
from ..utils.policy import evaluate_text

router = APIRouter(prefix="/policy", tags=["policy"])


class PolicyCheckRequest(BaseModel):
    text: str


class PolicyCheckResponse(BaseModel):
    blocked: list[str]
    flagged: list[str]


@router.post("/check", response_model=PolicyCheckResponse)
async def check_text(
    payload: PolicyCheckRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.AGENT, UserRole.LANDLORD)),
):
    result = await evaluate_text(db, payload.text)
    return PolicyCheckResponse(blocked=result.blocked, flagged=result.flagged)
