from sqlalchemy.ext.declarative import declarative_base

PublicBase = declarative_base()
PrivateBase = declarative_base()

__all__ = ["PublicBase", "PrivateBase"]
