from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.domain import TrustedDomain


async def is_domain_trusted(db: AsyncSession, domain: str) -> bool:
    """Check if domain is in trusted list."""
    result = await db.execute(
        select(TrustedDomain).where(TrustedDomain.domain == domain)
    )
    return result.scalar_one_or_none() is not None
