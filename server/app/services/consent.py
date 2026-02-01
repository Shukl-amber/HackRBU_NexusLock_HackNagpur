"""DPDP consent management and presigned URL generation."""

import hmac
import hashlib
from datetime import datetime, timedelta

from app.core.config import settings
from app.core.security import create_access_token


def generate_consent_artefact(user_id: str, proof_id: str, purposes: list[str]) -> dict:
    """Generate DPDP-compliant consent artefact with HMAC signature.

    Creates a consent record for data processing with cryptographic
    signature for integrity verification.

    Args:
        user_id: User identifier
        proof_id: Associated proof identifier
        purposes: List of processing purposes (e.g., ['identity_verification'])

    Returns:
        Dictionary containing consent artefact with signature:
        - consent_id: Unique consent identifier
        - user_id: User identifier
        - proof_id: Associated proof
        - purpose: List of purposes
        - expiry_date: ISO 8601 expiry timestamp (1 year)
        - created_at: ISO 8601 creation timestamp
        - signature: HMAC-SHA256 signature
    """
    consent_id = f"consent-{proof_id}"
    expiry_date = datetime.utcnow() + timedelta(days=365)

    artefact = {
        "consent_id": consent_id,
        "user_id": user_id,
        "proof_id": proof_id,
        "purpose": purposes,
        "expiry_date": expiry_date.isoformat(),
        "created_at": datetime.utcnow().isoformat(),
    }

    # HMAC signature
    message = f"{consent_id}|{user_id}|{proof_id}|{'|'.join(purposes)}|{expiry_date.isoformat()}"
    signature = hmac.new(
        settings.SECRET_KEY.encode(), message.encode(), hashlib.sha256
    ).hexdigest()

    artefact["signature"] = signature
    return artefact


def verify_consent_artefact(artefact: dict) -> bool:
    """Verify HMAC signature of consent artefact.

    Args:
        artefact: Consent artefact dictionary with signature

    Returns:
        True if signature is valid, False otherwise
    """
    stored_sig = artefact.get("signature")
    if not stored_sig:
        return False

    message = f"{artefact['consent_id']}|{artefact['user_id']}|{artefact['proof_id']}|{'|'.join(artefact['purpose'])}|{artefact['expiry_date']}"
    expected_sig = hmac.new(
        settings.SECRET_KEY.encode(), message.encode(), hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(stored_sig, expected_sig)


def generate_presigned_url(
    proof_id: str, base_url: str = "http://localhost:8000"
) -> tuple[str, datetime]:
    """Generate JWT-signed presigned URL for document download.

    Creates a time-limited URL for secure document access without
    requiring authentication headers.

    Args:
        proof_id: Proof identifier for the document
        base_url: Base URL of the API server

    Returns:
        Tuple of (presigned_url, expiry_datetime)
        - presigned_url: Full URL with embedded JWT token
        - expiry_datetime: UTC datetime when URL expires (5 minutes)
    """
    expires_at = datetime.utcnow() + timedelta(minutes=5)

    token = create_access_token(
        {"sub": proof_id, "type": "presigned"}, expires_delta=timedelta(minutes=5)
    )

    url = f"{base_url}/api/v1/download/{proof_id}?token={token}"
    return url, expires_at
