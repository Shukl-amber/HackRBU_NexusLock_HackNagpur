"""Pydantic schemas for proof-related requests and responses."""

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ProofCreate(BaseModel):
    """Schema for creating a new proof."""

    doc_data: str = Field(..., description="Document data as string")
    doc_type: str = Field(..., description="Type of document")
    proof: dict[str, Any] = Field(
        ..., description="Zero-knowledge proof containing pi_a, pi_b, pi_c"
    )
    pub_signals: list[Any] = Field(..., description="Public signals of the proof")


class ProofResponse(BaseModel):
    """Schema for proof response."""

    proof_id: UUID = Field(..., description="Unique proof identifier")
    doc_type: str = Field(..., description="Type of document")
    expiry: datetime = Field(..., description="Proof expiry date")
    revoked: bool = Field(default=False, description="Whether the proof is revoked")
    created_at: datetime = Field(..., description="Proof creation timestamp")


class ProofVerifyResponse(BaseModel):
    """Schema for proof verification response."""

    valid: bool = Field(..., description="Whether the proof is valid")
    attributes: Optional[dict[str, Any]] = Field(
        default=None, description="Extracted attributes from valid proof"
    )
    reason: Optional[str] = Field(
        default=None, description="Reason if proof is invalid"
    )


class ProofListResponse(BaseModel):
    """Schema for listing proofs."""

    proofs: list[ProofResponse] = Field(..., description="List of proofs")
