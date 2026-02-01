from sqlalchemy import Column, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID, BYTEA
from sqlalchemy.sql import func
import uuid

from app.models import PrivateBase


class Doc(PrivateBase):
    __tablename__ = "docs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    proof_id = Column(UUID(as_uuid=True), unique=True, nullable=False, index=True)
    encrypted_doc = Column(BYTEA, nullable=False)
    salt = Column(BYTEA, nullable=False)
    created_at = Column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )
