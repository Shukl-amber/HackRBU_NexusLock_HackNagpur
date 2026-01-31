from sqlalchemy import Column, String, TEXT, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
import uuid

from app.models import PublicBase


class Log(PublicBase):
    __tablename__ = "logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    timestamp = Column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    action = Column(String(100), nullable=False)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    proof_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(TEXT, nullable=True)
    details = Column(JSONB, nullable=True)
