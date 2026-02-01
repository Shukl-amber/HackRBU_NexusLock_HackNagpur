"""Pydantic schemas for log-related requests and responses."""

from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field


class LogEntry(BaseModel):
    """Schema for a single log entry."""

    timestamp: datetime = Field(..., description="Log timestamp")
    action: str = Field(..., description="Action performed")
    user_id: str = Field(..., description="User identifier")
    proof_id: Optional[str] = Field(
        default=None, description="Associated proof identifier"
    )
    ip_address: str = Field(..., description="IP address of the request")
    user_agent: str = Field(..., description="User agent string")
    details: dict[str, Any] = Field(
        default_factory=dict, description="Additional details"
    )


class LogListResponse(BaseModel):
    """Schema for listing logs."""

    logs: list[LogEntry] = Field(..., description="List of log entries")
    total: int = Field(..., description="Total number of logs")
