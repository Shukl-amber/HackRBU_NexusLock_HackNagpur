from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from app.models.doc import Doc


async def create_doc(
    db: AsyncSession, proof_id: uuid.UUID, encrypted_doc: bytes, salt: bytes
) -> Doc:
    """Create encrypted document record."""
    doc = Doc(proof_id=proof_id, encrypted_doc=encrypted_doc, salt=salt)
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


async def get_doc_by_proof(db: AsyncSession, proof_id: uuid.UUID) -> Doc | None:
    """Get document by proof ID."""
    result = await db.execute(select(Doc).where(Doc.proof_id == proof_id))
    return result.scalar_one_or_none()
