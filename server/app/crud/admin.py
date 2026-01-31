from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.admin import AdminUser
from app.core.security import verify_password


async def get_admin_by_username(db: AsyncSession, username: str) -> AdminUser | None:
    """Get admin user by username."""
    result = await db.execute(select(AdminUser).where(AdminUser.username == username))
    return result.scalar_one_or_none()


async def verify_admin_password(
    db: AsyncSession, username: str, password: str
) -> AdminUser | None:
    """Verify admin credentials. Returns admin if valid, None otherwise."""
    admin = await get_admin_by_username(db, username)
    if not admin or not admin.is_active:
        return None

    if verify_password(password, admin.hashed_password):
        return admin
    return None
