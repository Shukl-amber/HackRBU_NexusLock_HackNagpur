"""Database configuration with dual async engines for public and private databases."""

from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
    AsyncSession,
)
from app.core.config import settings


# Public database (TimescaleDB) - for audit logs, consent events, analytics
public_engine = create_async_engine(
    settings.PUBLIC_DATABASE_URL,
    pool_pre_ping=True,  # Verify connections before using them
    echo=False,  # Set to True for SQL query logging
)

PublicSession = async_sessionmaker(
    public_engine,
    expire_on_commit=False,  # CRITICAL: Prevent lazy loading issues in async
    class_=AsyncSession,
)


# Private database (PostgreSQL with RLS) - for user PII, encrypted documents
private_engine = create_async_engine(
    settings.PRIVATE_DATABASE_URL,
    pool_pre_ping=True,  # Verify connections before using them
    echo=False,  # Set to True for SQL query logging
)

PrivateSession = async_sessionmaker(
    private_engine,
    expire_on_commit=False,  # CRITICAL: Prevent lazy loading issues in async
    class_=AsyncSession,
)


# FastAPI dependency functions for dependency injection
async def get_public_db():
    """Dependency for public database session.

    Usage:
        @app.get("/endpoint")
        async def endpoint(db: AsyncSession = Depends(get_public_db)):
            ...
    """
    async with PublicSession() as session:
        yield session


async def get_private_db():
    """Dependency for private database session.

    Usage:
        @app.get("/endpoint")
        async def endpoint(db: AsyncSession = Depends(get_private_db)):
            ...
    """
    async with PrivateSession() as session:
        yield session
