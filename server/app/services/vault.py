"""ZKP verification and encryption services."""

from datetime import datetime

from app.core.security import encrypt_document as _encrypt
from app.core.security import decrypt_document as _decrypt


def verify_zkp_proof(proof: dict, pub_signals: list) -> dict:
    """
    Stub ZKP verifier - validates JSON structure, returns mock result.
    In production, this would call snarkjs or arkworks.

    Args:
        proof: ZKP proof object (Groth16 format: pi_a, pi_b, pi_c)
        pub_signals: Public signals from the circuit

    Returns:
        Dictionary with validation result and attributes
    """
    # Validate structure (Groth16: pi_a, pi_b, pi_c)
    required_keys = ["pi_a", "pi_b", "pi_c"]
    if not all(k in proof for k in required_keys):
        return {"valid": False, "reason": "Invalid proof structure"}

    # Mock verification (always pass for demo)
    return {
        "valid": True,
        "attributes": {
            "doc_type": pub_signals[0] if pub_signals else "unknown",
            "verified_at": datetime.utcnow().isoformat(),
        },
    }


def encrypt_document(doc_data: bytes, user_id: str) -> tuple[bytes, bytes]:
    """Wrapper around core encryption.

    Args:
        doc_data: Raw document bytes to encrypt
        user_id: User identifier for key derivation

    Returns:
        Tuple of (encrypted_data, salt)
    """
    return _encrypt(doc_data, user_id)


def decrypt_document(encrypted: bytes, salt: bytes, user_id: str) -> bytes:
    """Wrapper around core decryption.

    Args:
        encrypted: Encrypted document bytes (IV + ciphertext)
        salt: Salt used during encryption
        user_id: User identifier (must match encryption user_id)

    Returns:
        Decrypted plaintext bytes
    """
    return _decrypt(encrypted, salt, user_id)
