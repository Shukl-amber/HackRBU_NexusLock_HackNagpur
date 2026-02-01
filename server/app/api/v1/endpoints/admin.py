"""Admin API key management endpoints - CRUD and authentication."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.core.database import get_public_db
from app.api.deps import get_current_admin
from app.schemas.admin import AdminLogin, AdminTokenResponse
from app.schemas.auth import APIKeyCreate, APIKeyResponse, APIKeyListResponse
from app.crud import admin as admin_crud, api_key as api_key_crud
from app.core.security import create_access_token, generate_api_key

router = APIRouter()


@router.post("/admin/login", response_model=AdminTokenResponse)
async def admin_login(
    credentials: AdminLogin, db: AsyncSession = Depends(get_public_db)
):
    """
    Authenticate admin user and return JWT with is_admin=True claim.

    Args:
        credentials: AdminLogin with username and password
        db: Database session

    Returns:
        AdminTokenResponse with access_token and token_type

    Raises:
        HTTPException: 401 if credentials are invalid
    """
    admin = await admin_crud.verify_admin_password(
        db, credentials.username, credentials.password
    )

    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )

    # Generate JWT with admin claim
    access_token = create_access_token(
        {"sub": str(admin.id), "is_admin": True, "username": admin.username}
    )

    return AdminTokenResponse(access_token=access_token, token_type="bearer")


@router.post(
    "/admin/api-keys",
    response_model=APIKeyResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_api_key_endpoint(
    data: APIKeyCreate,
    admin_id: uuid.UUID = Depends(get_current_admin),
    db: AsyncSession = Depends(get_public_db),
):
    """
    Create new API key (admin only).

    The full key is returned ONLY on creation and should be stored securely by the user.
    Future list operations will only show the key prefix.

    Args:
        data: APIKeyCreate with name and domain
        admin_id: Authenticated admin user ID (from JWT)
        db: Database session

    Returns:
        APIKeyResponse with full_key populated (only time it's shown)

    Raises:
        HTTPException: 403 if user is not admin
    """
    # Generate API key
    plain_key, key_hash = generate_api_key()

    # Store in database
    api_key, full_key = await api_key_crud.create_api_key(
        db, name=data.name, domain=data.domain, key_hash=key_hash
    )

    return APIKeyResponse(
        key_id=api_key.key_id,
        name=api_key.name,
        key_prefix=api_key.key_prefix,
        domain=api_key.domain,
        created_at=api_key.created_at,
        revoked=api_key.revoked,
        full_key=full_key,  # Only returned on creation
    )


@router.get("/admin/api-keys", response_model=APIKeyListResponse)
async def list_api_keys_endpoint(
    admin_id: uuid.UUID = Depends(get_current_admin),
    db: AsyncSession = Depends(get_public_db),
):
    """
    List all API keys (admin only). Does NOT expose full keys, only prefixes.

    Args:
        admin_id: Authenticated admin user ID (from JWT)
        db: Database session

    Returns:
        APIKeyListResponse with list of API keys (without full_key)

    Raises:
        HTTPException: 403 if user is not admin
    """
    keys = await api_key_crud.list_api_keys(db)

    return APIKeyListResponse(
        api_keys=[
            APIKeyResponse(
                key_id=k.key_id,
                name=k.name,
                key_prefix=k.key_prefix,
                domain=k.domain,
                created_at=k.created_at,
                revoked=k.revoked,
            )
            for k in keys
        ]
    )


@router.delete("/admin/api-keys/{key_id}", status_code=status.HTTP_200_OK)
async def revoke_api_key_endpoint(
    key_id: str,
    admin_id: uuid.UUID = Depends(get_current_admin),
    db: AsyncSession = Depends(get_public_db),
):
    """
    Revoke an API key (admin only).

    Args:
        key_id: The API key ID to revoke
        admin_id: Authenticated admin user ID (from JWT)
        db: Database session

    Returns:
        Dictionary with revoked status and key_id

    Raises:
        HTTPException: 403 if user is not admin
        HTTPException: 404 if API key not found
    """
    success = await api_key_crud.revoke_api_key(db, key_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="API key not found"
        )

    return {"revoked": True, "key_id": key_id}
