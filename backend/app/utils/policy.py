from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..models import PolicyEvent, PolicyRule, PolicySeverity


@dataclass
class PolicyResult:
    blocked: list[str]
    flagged: list[str]

    def has_violations(self) -> bool:
        return bool(self.blocked or self.flagged)


async def load_policy_rules(db: AsyncSession) -> tuple[list[str], list[str]]:
    stmt: Select[tuple[PolicyRule]] = select(PolicyRule)
    result = await db.execute(stmt)
    rules = result.scalars().all()
    blocked = [r.phrase.lower() for r in rules if r.severity == PolicySeverity.BLOCK]
    flagged = [r.phrase.lower() for r in rules if r.severity == PolicySeverity.FLAG]
    return blocked, flagged


async def evaluate_text(db: AsyncSession, text: str) -> PolicyResult:
    settings = get_settings()
    blocked_config = [phrase.lower() for phrase in settings.policy_blocklist]
    flagged_config = [phrase.lower() for phrase in settings.policy_flaglist]
    blocked_db, flagged_db = await load_policy_rules(db)

    blocked_terms = set(blocked_config + blocked_db)
    flagged_terms = set(flagged_config + flagged_db)

    text_lower = text.lower()
    blocked_hits = sorted({term for term in blocked_terms if term in text_lower})
    flagged_hits = sorted({term for term in flagged_terms if term in text_lower and term not in blocked_hits})

    return PolicyResult(blocked=blocked_hits, flagged=flagged_hits)


async def record_policy_events(
    db: AsyncSession,
    *,
    listing_id: int | None,
    user_id: int | None,
    text: str,
) -> PolicyResult:
    result = await evaluate_text(db, text)
    for phrase in result.blocked:
        db.add(
            PolicyEvent(
                listing_id=listing_id,
                user_id=user_id,
                phrase=phrase,
                severity=PolicySeverity.BLOCK,
                text_excerpt=text[:250],
            )
        )
    for phrase in result.flagged:
        db.add(
            PolicyEvent(
                listing_id=listing_id,
                user_id=user_id,
                phrase=phrase,
                severity=PolicySeverity.FLAG,
                text_excerpt=text[:250],
            )
        )
    return result
