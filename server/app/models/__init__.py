from sqlalchemy.ext.declarative import declarative_base

PublicBase = declarative_base()
PrivateBase = declarative_base()

from app.models.user import User

__all__ = ["PublicBase", "PrivateBase", "User"]
