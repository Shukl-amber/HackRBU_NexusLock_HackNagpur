"""User authentication schemas."""

from pydantic import BaseModel, EmailStr, Field, ConfigDict
from datetime import datetime
import uuid


class UserCreate(BaseModel):
    """Schema for user signup."""

    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, description="User password (min 8 chars)")
    name: str = Field(..., min_length=1, max_length=255, description="User full name")


class UserLogin(BaseModel):
    """Schema for user login."""

    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User password")


class UserResponse(BaseModel):
    """Schema for user profile response."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID = Field(..., description="User ID")
    email: str = Field(..., description="User email address")
    name: str = Field(..., description="User full name")
    created_at: datetime = Field(..., description="Account creation timestamp")


class AuthResponse(BaseModel):
    """Schema for authentication response with token and user."""

    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    user: UserResponse = Field(..., description="User profile information")
