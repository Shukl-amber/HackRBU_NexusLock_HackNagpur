from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import bcrypt

from app.models.admin import AdminUser


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

    try:
        # Try bcrypt verification (works with PostgreSQL crypt() bcrypt hashes)
        if bcrypt.checkpw(password.encode(), admin.hashed_password.encode()):
            return admin
    except Exception:
        pass

    return None
