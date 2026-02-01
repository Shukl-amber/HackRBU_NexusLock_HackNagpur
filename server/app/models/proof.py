from sqlalchemy import Column, Boolean, String, TIMESTAMP, Index
from sqlalchemy.dialects.postgresql import UUID, BYTEA, JSONB
from sqlalchemy.sql import func
import uuid

from app.models import PublicBase


class Proof(PublicBase):
    __tablename__ = "proofs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    doc_type = Column(String(50), nullable=False)
    proof = Column(BYTEA, nullable=False)
    pub_signals = Column(JSONB, nullable=False)
    expiry = Column(TIMESTAMP(timezone=True), nullable=False, index=True)
    revoked = Column(Boolean, default=False, nullable=False)
    purpose = Column(String(500), nullable=True)
    requester = Column(String(255), nullable=True)
    created_at = Column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )
