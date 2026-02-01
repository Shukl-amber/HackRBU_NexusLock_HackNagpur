from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from app.models.user import User


async def create_user(
    db: AsyncSession, email: str, password_hash: str, name: str
) -> User:
    """Create a new user."""
    user = User(
        id=uuid.uuid4(),
        email=email,
        password_hash=password_hash,
        name=name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    """Get user by email address."""
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    """Get user by ID."""
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()
