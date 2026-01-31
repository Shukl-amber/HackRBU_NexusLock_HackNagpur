"""Pydantic schemas for common responses."""

from typing import Any, Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Schema for health check response."""

    status: str = Field(..., description="Health status")
    databases: dict[str, str] = Field(
        ..., description="Database statuses (public and private)"
    )
    redis: str = Field(..., description="Redis status")


class ErrorResponse(BaseModel):
    """Schema for error responses."""

    detail: str = Field(..., description="Error detail message")
    error_code: Optional[str] = Field(default=None, description="Error code identifier")
