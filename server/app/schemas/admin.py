"""Pydantic schemas for admin-related requests and responses."""

from pydantic import BaseModel, Field


class AdminLogin(BaseModel):
    """Schema for admin login request."""

    username: str = Field(..., description="Admin username")
    password: str = Field(..., description="Admin password")


class AdminTokenResponse(BaseModel):
    """Schema for admin token response."""

    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
