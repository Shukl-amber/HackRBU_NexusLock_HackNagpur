from sqlalchemy.ext.declarative import declarative_base

PublicBase = declarative_base()
PrivateBase = declarative_base()

from app.models.user import User
from app.models.proof import Proof
from app.models.log import Log
from app.models.domain import TrustedDomain
from app.models.api_key import APIKey
from app.models.admin import AdminUser
from app.models.doc import Doc

__all__ = [
    "PublicBase",
    "PrivateBase",
    "User",
    "Proof",
    "Log",
    "TrustedDomain",
    "APIKey",
    "AdminUser",
    "Doc",
]
