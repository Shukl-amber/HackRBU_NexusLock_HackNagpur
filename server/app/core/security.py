"""Security utilities: JWT, AES encryption, password hashing, API keys."""

import secrets
from datetime import datetime, timedelta
from typing import Any

import bcrypt
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend
from fastapi import HTTPException, status
from jose import JWTError, jwt

from app.core.config import settings


# ============================================================================
# PASSWORD HASHING
# ============================================================================


def hash_password(password: str) -> str:
    """Hash a password using bcrypt.

    Args:
        password: Plain text password

    Returns:
        Hashed password string
    """
    # bcrypt has a 72-byte limit, truncate if necessary
    password_bytes = password.encode("utf-8")[:72]
    hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash.

    Args:
        plain_password: Plain text password to verify
        hashed_password: Hashed password to compare against

    Returns:
        True if password matches, False otherwise
    """
    # bcrypt has a 72-byte limit, truncate if necessary
    password_bytes = plain_password.encode("utf-8")[:72]
    hashed_bytes = hashed_password.encode("utf-8")
    return bcrypt.checkpw(password_bytes, hashed_bytes)


# ============================================================================
# JWT TOKEN MANAGEMENT
# ============================================================================


def create_access_token(
    data: dict[str, Any], expires_delta: timedelta | None = None
) -> str:
    """Create a JWT access token.

    Args:
        data: Dictionary of claims to encode in the token (must include 'sub' for user_id)
        expires_delta: Optional custom expiration time, defaults to JWT_EXPIRY_MINUTES

    Returns:
        Encoded JWT token string

    Example:
        token = create_access_token({"sub": "user123", "is_admin": False})
    """
    to_encode = data.copy()

    # Set expiration time
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRY_MINUTES)

    # Add standard claims
    to_encode.update(
        {
            "exp": expire,
            "iat": datetime.utcnow(),
        }
    )

    # Encode token
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )

    return encoded_jwt


def verify_token(token: str) -> dict[str, Any]:
    """Verify and decode a JWT token.

    Args:
        token: JWT token string to verify

    Returns:
        Dictionary of decoded claims

    Raises:
        HTTPException: If token is invalid or expired (401 Unauthorized)

    Example:
        payload = verify_token(token)
        user_id = payload["sub"]
        is_admin = payload.get("is_admin", False)
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ============================================================================
# AES-256 ENCRYPTION FOR DOCUMENTS
# ============================================================================


def _derive_key(user_id: str, salt: bytes) -> bytes:
    """Derive an AES-256 key using PBKDF2-HMAC-SHA256.

    Args:
        user_id: User identifier (used as salt material)
        salt: 16-byte random salt

    Returns:
        32-byte derived key suitable for AES-256
    """
    # Combine master key with user_id as additional salt material
    key_material = settings.MASTER_ENCRYPTION_KEY.encode() + user_id.encode()

    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,  # 256 bits for AES-256
        salt=salt,
        iterations=1_200_000,  # OWASP recommendation (2023)
        backend=default_backend(),
    )

    return kdf.derive(key_material)


def encrypt_document(doc_data: bytes, user_id: str) -> tuple[bytes, bytes]:
    """Encrypt document data using AES-256-CBC.

    Args:
        doc_data: Raw document bytes to encrypt
        user_id: User identifier (used for key derivation)

    Returns:
        Tuple of (ciphertext, salt) - both as bytes
        - ciphertext: IV (16 bytes) + encrypted data
        - salt: 16-byte salt used for key derivation

    Example:
        encrypted, salt = encrypt_document(pdf_bytes, "user-uuid-123")
        # Store encrypted and salt in database
    """
    # Generate random salt (16 bytes)
    salt = secrets.token_bytes(16)

    # Derive encryption key
    key = _derive_key(user_id, salt)

    # Generate random IV (16 bytes for AES)
    iv = secrets.token_bytes(16)

    # Create cipher
    cipher = Cipher(
        algorithms.AES(key),
        modes.CBC(iv),
        backend=default_backend(),
    )
    encryptor = cipher.encryptor()

    # Apply PKCS7 padding
    block_size = 16  # AES block size
    padding_length = block_size - (len(doc_data) % block_size)
    padded_data = doc_data + bytes([padding_length] * padding_length)

    # Encrypt
    ciphertext = encryptor.update(padded_data) + encryptor.finalize()

    # Prepend IV to ciphertext (standard practice)
    encrypted_blob = iv + ciphertext

    return encrypted_blob, salt


def decrypt_document(encrypted_doc: bytes, salt: bytes, user_id: str) -> bytes:
    """Decrypt document data using AES-256-CBC.

    Args:
        encrypted_doc: Ciphertext with prepended IV (IV + encrypted data)
        salt: Salt used during encryption
        user_id: User identifier (must match encryption user_id)

    Returns:
        Decrypted plaintext bytes

    Raises:
        ValueError: If decryption fails or data is corrupted

    Example:
        plaintext = decrypt_document(encrypted, salt, "user-uuid-123")
    """
    # Extract IV (first 16 bytes) and ciphertext
    iv = encrypted_doc[:16]
    ciphertext = encrypted_doc[16:]

    # Derive decryption key (same as encryption)
    key = _derive_key(user_id, salt)

    # Create cipher
    cipher = Cipher(
        algorithms.AES(key),
        modes.CBC(iv),
        backend=default_backend(),
    )
    decryptor = cipher.decryptor()

    # Decrypt
    padded_data = decryptor.update(ciphertext) + decryptor.finalize()

    # Remove PKCS7 padding
    padding_length = padded_data[-1]
    if padding_length > 16 or padding_length == 0:
        raise ValueError("Invalid padding - data may be corrupted")

    # Verify padding is correct
    if padded_data[-padding_length:] != bytes([padding_length] * padding_length):
        raise ValueError("Invalid padding - data may be corrupted")

    plaintext = padded_data[:-padding_length]

    return plaintext


# ============================================================================
# API KEY MANAGEMENT
# ============================================================================


def generate_api_key() -> tuple[str, str]:
    """Generate a new API key and its hash.

    Returns:
        Tuple of (full_key, hashed_key)
        - full_key: Show to user ONCE (they must store it)
        - hashed_key: Store in database for verification

    Example:
        full_key, hashed_key = generate_api_key()
        # Show full_key to user
        # Store hashed_key in database
    """
    import bcrypt

    # Generate 32-byte (256-bit) random key
    full_key = secrets.token_urlsafe(32)

    # Hash for storage using bcrypt directly
    hashed_key = bcrypt.hashpw(full_key.encode(), bcrypt.gensalt(rounds=12)).decode()

    return full_key, hashed_key


def verify_api_key_hash(plain_key: str, hashed_key: str) -> bool:
    """Verify an API key against its hash.

    Args:
        plain_key: Plain API key provided by client
        hashed_key: Hashed API key from database

    Returns:
        True if key is valid, False otherwise
    """
    import bcrypt

    try:
        return bcrypt.checkpw(plain_key.encode(), hashed_key.encode())
    except Exception:
        return False
