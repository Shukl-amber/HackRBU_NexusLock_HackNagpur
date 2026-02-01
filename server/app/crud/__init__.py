"""CRUD operations marker module."""

from app.crud.proof import create_proof, get_proof, get_proofs_by_user, revoke_proof
from app.crud.log import create_log, get_logs_by_user, get_logs_by_proof
from app.crud.doc import create_doc, get_doc_by_proof
from app.crud.domain import is_domain_trusted
from app.crud.api_key import create_api_key, get_api_key, list_api_keys, revoke_api_key
from app.crud.admin import get_admin_by_username, verify_admin_password

__all__ = [
    "create_proof",
    "get_proof",
    "get_proofs_by_user",
    "revoke_proof",
    "create_log",
    "get_logs_by_user",
    "get_logs_by_proof",
    "create_doc",
    "get_doc_by_proof",
    "is_domain_trusted",
    "create_api_key",
    "get_api_key",
    "list_api_keys",
    "revoke_api_key",
    "get_admin_by_username",
    "verify_admin_password",
]
