"""Pydantic schemas for consent-related requests and responses."""

from datetime import datetime
from pydantic import BaseModel, Field


class ConsentArtefact(BaseModel):
    """Schema for consent artefact."""

    consent_id: str = Field(..., description="Unique consent identifier")
    user_id: str = Field(..., description="User identifier")
    proof_id: str = Field(..., description="Associated proof identifier")
    purpose: list[str] = Field(..., description="List of consent purposes")
    expiry_date: datetime = Field(..., description="Consent expiry date")
    signature: str = Field(..., description="Consent signature")
    created_at: datetime = Field(..., description="Consent creation timestamp")


class HandoverRequest(BaseModel):
    """Schema for consent handover request."""

    proof_id: str = Field(..., description="Proof identifier")
    consent_token: str = Field(..., description="Consent token")
    requesting_domain: str = Field(..., description="Domain requesting the consent")


class HandoverResponse(BaseModel):
    """Schema for consent handover response."""

    presigned_url: str = Field(..., description="Presigned URL for file access")
    expires_at: datetime = Field(..., description="URL expiry timestamp")
