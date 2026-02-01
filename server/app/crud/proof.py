from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import List
import uuid
from datetime import datetime

from app.models.proof import Proof


async def create_proof(
    db: AsyncSession,
    user_id: uuid.UUID,
    doc_type: str,
    proof: bytes,
    pub_signals: dict,
    expiry: datetime,
    purpose: str | None = None,
    requester: str | None = None,
) -> Proof:
    """Create a new proof record."""
    proof_obj = Proof(
        user_id=user_id,
        doc_type=doc_type,
        proof=proof,
        pub_signals=pub_signals,
        expiry=expiry,
        revoked=False,
        purpose=purpose,
        requester=requester,
    )
    db.add(proof_obj)
    await db.commit()
    await db.refresh(proof_obj)
    return proof_obj


async def get_proof(db: AsyncSession, proof_id: uuid.UUID) -> Proof | None:
    """Get proof by ID."""
    result = await db.execute(select(Proof).where(Proof.id == proof_id))
    return result.scalar_one_or_none()


async def get_proofs_by_user(db: AsyncSession, user_id: uuid.UUID) -> List[Proof]:
    """Get all proofs for a user."""
    result = await db.execute(
        select(Proof).where(Proof.user_id == user_id).order_by(Proof.created_at.desc())
    )
    return list(result.scalars().all())


async def revoke_proof(db: AsyncSession, proof_id: uuid.UUID) -> bool:
    """Revoke a proof."""
    result = await db.execute(
        update(Proof)
        .where(Proof.id == proof_id)
        .values(revoked=True)
        .returning(Proof.id)
    )
    await db.commit()
    return result.scalar_one_or_none() is not None
