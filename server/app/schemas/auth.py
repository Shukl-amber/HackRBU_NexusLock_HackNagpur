"""Pydantic schemas for authentication-related requests and responses."""

from datetime import datetime
from pydantic import BaseModel, Field


class TokenResponse(BaseModel):
    """Schema for token response."""

    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")


class APIKeyCreate(BaseModel):
    """Schema for creating an API key."""

    name: str = Field(..., description="Name of the API key")
    domain: str = Field(..., description="Domain associated with the API key")


class APIKeyResponse(BaseModel):
    """Schema for API key response."""

    key_id: str = Field(..., description="Unique API key identifier")
    name: str = Field(..., description="Name of the API key")
    key_prefix: str = Field(..., description="Prefix of the API key (for display)")
    domain: str = Field(..., description="Domain associated with the API key")
    created_at: datetime = Field(..., description="API key creation timestamp")
    revoked: bool = Field(default=False, description="Whether the API key is revoked")
    full_key: str | None = Field(
        default=None, description="Full API key (only returned on creation)"
    )


class APIKeyListResponse(BaseModel):
    """Schema for listing API keys."""

    api_keys: list[APIKeyResponse] = Field(..., description="List of API keys")
