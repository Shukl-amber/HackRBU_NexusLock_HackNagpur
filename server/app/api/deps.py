"""Authentication and dependency injection utilities for API endpoints."""

from fastapi import Depends, HTTPException, status, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated
import uuid

from app.core.database import get_public_db
from app.core.security import verify_token
from app.crud import api_key as api_key_crud


async def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
) -> uuid.UUID:
    """Extract user_id from JWT token in Authorization header.

    Args:
        authorization: Bearer token from Authorization header

    Returns:
        UUID of authenticated user

    Raises:
        HTTPException: 401 if token is missing, invalid, or expired
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header",
        )

    token = authorization.split(" ")[1]

    try:
        payload = verify_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
            )
        return uuid.UUID(user_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


async def get_current_admin(
    authorization: Annotated[str | None, Header()] = None,
) -> uuid.UUID:
    """Extract user_id from JWT token and verify admin role.

    Args:
        authorization: Bearer token from Authorization header

    Returns:
        UUID of authenticated admin user

    Raises:
        HTTPException: 401 if token invalid, 403 if not admin
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header",
        )

    token = authorization.split(" ")[1]

    try:
        payload = verify_token(token)
        is_admin = payload.get("is_admin", False)
        if not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required"
            )
        user_id = payload.get("sub")
        return uuid.UUID(user_id)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


async def verify_api_key(
    x_api_key: Annotated[str | None, Header()] = None,
    db: AsyncSession = Depends(get_public_db),
) -> str:
    """Verify API key from X-API-Key header.

    Args:
        x_api_key: API key from X-API-Key header
        db: Database session

    Returns:
        Domain associated with the API key

    Raises:
        HTTPException: 401 if key is missing, invalid, or revoked
    """
    if not x_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing API key"
        )

    # Extract key_id from API key (format: key_id.random_part)
    try:
        key_id = x_api_key.split(".")[0]
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key format"
        )

    api_key = await api_key_crud.get_api_key(db, key_id)
    if not api_key or api_key.revoked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked API key",
        )

    # Verify key hash
    from app.core.security import verify_api_key_hash

    if not verify_api_key_hash(x_api_key, api_key.key_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key"
        )

    return api_key.domain


def get_request_metadata(request: Request) -> dict:
    """Extract IP address and user agent from request.

    Args:
        request: FastAPI request object

    Returns:
        Dictionary with ip_address and user_agent keys
    """
    forwarded_for = request.headers.get("X-Forwarded-For")
    ip_address = forwarded_for.split(",")[0] if forwarded_for else request.client.host
    user_agent = request.headers.get("User-Agent", "unknown")

    return {"ip_address": ip_address, "user_agent": user_agent}
