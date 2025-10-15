import pytest

from app.utils.policy import evaluate_text


@pytest.mark.asyncio
async def test_evaluate_text_block_and_flag(db_session):
    text = "This property has no viewing fee but includes negotiable fee details."
    result = await evaluate_text(db_session, text)
    assert "viewing fee" in result.blocked
    assert "negotiable fee" in result.flagged
