from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import List
import uuid
import secrets

from app.models.api_key import APIKey


async def create_api_key(
    db: AsyncSession, name: str, domain: str, key_hash: str
) -> tuple[APIKey, str]:
    """Create new API key. Returns (APIKey object, plain key)."""
    key_id = f"nck_{secrets.token_urlsafe(16)}"
    plain_key = f"{key_id}.{secrets.token_urlsafe(32)}"
    key_prefix = plain_key[:10]

    api_key = APIKey(
        key_id=key_id,
        key_hash=key_hash,
        key_prefix=key_prefix,
        name=name,
        domain=domain,
        revoked=False,
    )
    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)
    return api_key, plain_key


async def get_api_key(db: AsyncSession, key_id: str) -> APIKey | None:
    """Get API key by key_id."""
    result = await db.execute(select(APIKey).where(APIKey.key_id == key_id))
    return result.scalar_one_or_none()


async def list_api_keys(db: AsyncSession) -> List[APIKey]:
    """List all API keys."""
    result = await db.execute(select(APIKey).order_by(APIKey.created_at.desc()))
    return list(result.scalars().all())


async def revoke_api_key(db: AsyncSession, key_id: str) -> bool:
    """Revoke an API key."""
    result = await db.execute(
        update(APIKey)
        .where(APIKey.key_id == key_id)
        .values(revoked=True)
        .returning(APIKey.id)
    )
    await db.commit()
    return result.scalar_one_or_none() is not None
