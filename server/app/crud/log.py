from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import uuid
from datetime import datetime

from app.models.log import Log


async def create_log(
    db: AsyncSession,
    action: str,
    user_id: uuid.UUID,
    proof_id: uuid.UUID | None,
    ip_address: str,
    user_agent: str,
    details: dict | None = None,
) -> Log:
    """Create a log entry."""
    log = Log(
        action=action,
        user_id=user_id,
        proof_id=proof_id,
        ip_address=ip_address,
        user_agent=user_agent,
        details=details or {},
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)
    return log


async def get_logs_by_user(
    db: AsyncSession, user_id: uuid.UUID, limit: int = 100
) -> List[Log]:
    """Get logs for a user."""
    result = await db.execute(
        select(Log)
        .where(Log.user_id == user_id)
        .order_by(Log.timestamp.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def get_logs_by_proof(db: AsyncSession, proof_id: uuid.UUID) -> List[Log]:
    """Get logs for a specific proof."""
    result = await db.execute(
        select(Log).where(Log.proof_id == proof_id).order_by(Log.timestamp.desc())
    )
    return list(result.scalars().all())
