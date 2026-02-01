"""Schemas module - Export all Pydantic schemas for easy importing."""

# Proof schemas
from .proof import (
    ProofCreate,
    ProofListResponse,
    ProofResponse,
    ProofVerifyResponse,
)

# Consent schemas
from .consent import (
    ConsentArtefact,
    HandoverRequest,
    HandoverResponse,
)

# Log schemas
from .log import (
    LogEntry,
    LogListResponse,
)

# Auth schemas
from .auth import (
    APIKeyCreate,
    APIKeyListResponse,
    APIKeyResponse,
    TokenResponse,
)

# Admin schemas
from .admin import (
    AdminLogin,
    AdminTokenResponse,
)

# User schemas
from .user import (
    UserCreate,
    UserLogin,
    UserResponse,
    AuthResponse,
)

# Common schemas
from .common import (
    ErrorResponse,
    HealthResponse,
)

__all__ = [
    # Proof
    "ProofCreate",
    "ProofResponse",
    "ProofVerifyResponse",
    "ProofListResponse",
    # Consent
    "ConsentArtefact",
    "HandoverRequest",
    "HandoverResponse",
    # Log
    "LogEntry",
    "LogListResponse",
    # Auth
    "TokenResponse",
    "APIKeyCreate",
    "APIKeyResponse",
    "APIKeyListResponse",
    # Admin
    "AdminLogin",
    "AdminTokenResponse",
    # User
    "UserCreate",
    "UserLogin",
    "UserResponse",
    "AuthResponse",
    # Common
    "HealthResponse",
    "ErrorResponse",
]
