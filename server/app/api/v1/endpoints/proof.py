"""Proof lifecycle management endpoints - onboard, verify, handover, revoke, dashboard."""

from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from datetime import datetime, timedelta, timezone
import json

from app.core.database import get_public_db, get_private_db
from app.api.deps import get_current_user, get_request_metadata
from app.schemas.proof import ProofCreate, ProofResponse, ProofVerifyResponse
from app.schemas.consent import HandoverRequest, HandoverResponse
from app.schemas.auth import TokenResponse
from app.crud import (
    proof as proof_crud,
    log as log_crud,
    doc as doc_crud,
    domain as domain_crud,
)
from app.services.vault import verify_zkp_proof, encrypt_document
from app.services.redis import blacklist
from app.services.consent import generate_consent_artefact, generate_presigned_url
from app.core.security import create_access_token

router = APIRouter()


@router.post(
    "/onboard", response_model=TokenResponse, status_code=status.HTTP_201_CREATED
)
async def onboard(
    data: ProofCreate,
    request: Request,
    public_db: AsyncSession = Depends(get_public_db),
    private_db: AsyncSession = Depends(get_private_db),
):
    """Onboard new proof: verify ZKP, encrypt document, store in dual DBs, return JWT.

    This endpoint handles the complete onboarding flow:
    1. Verifies the ZKP proof validity
    2. Generates a unique user_id
    3. Encrypts the document data
    4. Stores proof in public DB and encrypted doc in private DB
    5. Creates audit log entry
    6. Returns JWT token for future operations

    Args:
        data: ProofCreate schema with doc_data, doc_type, proof, pub_signals
        request: FastAPI request object (for metadata extraction)
        public_db: Public database session
        private_db: Private database session

    Returns:
        TokenResponse with JWT access token

    Raises:
        HTTPException: 400 if ZKP proof is invalid
    """
    metadata = get_request_metadata(request)

    # Verify ZKP proof
    zkp_result = verify_zkp_proof(data.proof, data.pub_signals)
    if not zkp_result.get("valid"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid ZKP proof: {zkp_result.get('reason', 'Unknown error')}",
        )

    # Generate user_id
    user_id = uuid.uuid4()

    # Encrypt document
    encrypted_doc, salt = encrypt_document(data.doc_data.encode(), str(user_id))

    # Set expiry (default 1 year)
    expiry = datetime.now(timezone.utc) + timedelta(days=365)

    # Create proof in public DB
    proof_obj = await proof_crud.create_proof(
        public_db,
        user_id=user_id,
        doc_type=data.doc_type,
        proof=json.dumps(data.proof).encode(),
        pub_signals=data.pub_signals,
        expiry=expiry,
    )

    # Store encrypted doc in private DB
    await doc_crud.create_doc(
        private_db, proof_id=proof_obj.id, encrypted_doc=encrypted_doc, salt=salt
    )

    # Log the onboarding
    await log_crud.create_log(
        public_db,
        action="onboard",
        user_id=user_id,
        proof_id=proof_obj.id,
        ip_address=metadata["ip_address"],
        user_agent=metadata["user_agent"],
        details={"doc_type": data.doc_type},
    )

    # Generate JWT token
    access_token = create_access_token(
        {"sub": str(user_id), "proof_id": str(proof_obj.id), "doc_type": data.doc_type}
    )

    return TokenResponse(access_token=access_token, token_type="bearer")


@router.get("/verify", response_model=ProofVerifyResponse)
async def verify(
    token: str = Query(..., description="JWT token from onboard"),
    public_db: AsyncSession = Depends(get_public_db),
):
    """Verify proof token: check JWT validity, blacklist status, and expiry.

    This endpoint performs comprehensive proof verification:
    1. Validates JWT token structure and signature
    2. Checks if proof is blacklisted (revoked)
    3. Verifies proof exists in database
    4. Checks expiry date
    5. Returns validation result with attributes

    Args:
        token: JWT token obtained from onboard endpoint
        public_db: Public database session

    Returns:
        ProofVerifyResponse with valid flag, attributes (if valid), and reason (if invalid)
    """
    from app.core.security import verify_token

    try:
        payload = verify_token(token)
        proof_id = uuid.UUID(payload.get("proof_id"))
    except Exception:
        return ProofVerifyResponse(valid=False, reason="Invalid or expired token")

    # Check blacklist
    if await blacklist.is_blacklisted(str(proof_id)):
        return ProofVerifyResponse(valid=False, reason="Proof has been revoked")

    # Get proof from DB
    proof_obj = await proof_crud.get_proof(public_db, proof_id)
    if not proof_obj:
        return ProofVerifyResponse(valid=False, reason="Proof not found")

    # Check expiry
    if proof_obj.expiry < datetime.now(timezone.utc):
        return ProofVerifyResponse(valid=False, reason="Proof has expired")

    # Check revoked status
    if proof_obj.revoked:
        return ProofVerifyResponse(valid=False, reason="Proof has been revoked")

    return ProofVerifyResponse(
        valid=True,
        attributes={
            "user_id": str(proof_obj.user_id),
            "doc_type": proof_obj.doc_type,
            "expiry": proof_obj.expiry.isoformat(),
            "created_at": proof_obj.created_at.isoformat(),
        },
    )


@router.post("/handover", response_model=HandoverResponse)
async def handover(
    data: HandoverRequest,
    user_id: uuid.UUID = Depends(get_current_user),
    public_db: AsyncSession = Depends(get_public_db),
):
    """Generate consent artefact and presigned URL for document access.

    This endpoint implements DPDP-compliant consent handover:
    1. Verifies proof ownership
    2. Checks proof validity (not revoked/expired)
    3. Validates requesting domain is trusted
    4. Generates consent artefact with HMAC signature
    5. Creates presigned URL for document download
    6. Logs handover event

    Args:
        data: HandoverRequest with proof_id, consent_token, requesting_domain
        user_id: Authenticated user ID (from JWT)
        public_db: Public database session

    Returns:
        HandoverResponse with presigned_url and expires_at

    Raises:
        HTTPException: 404 if proof not found, 410 if revoked/expired, 403 if domain not trusted
    """
    proof_id = uuid.UUID(data.proof_id)

    # Verify proof ownership
    proof_obj = await proof_crud.get_proof(public_db, proof_id)
    if not proof_obj or proof_obj.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proof not found or access denied",
        )

    # Check proof is valid
    if proof_obj.revoked or proof_obj.expiry < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_410_GONE, detail="Proof is revoked or expired"
        )

    # Verify requesting domain is trusted
    if not await domain_crud.is_domain_trusted(public_db, data.requesting_domain):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Domain {data.requesting_domain} is not trusted",
        )

    # Generate consent artefact
    artefact = generate_consent_artefact(
        str(user_id), data.proof_id, ["document_access"]
    )

    # Generate presigned URL
    url, expires_at = generate_presigned_url(data.proof_id)

    # Log handover
    await log_crud.create_log(
        public_db,
        action="handover",
        user_id=user_id,
        proof_id=proof_id,
        ip_address="",
        user_agent="",
        details={
            "requesting_domain": data.requesting_domain,
            "consent_artefact": artefact,
        },
    )

    return HandoverResponse(presigned_url=url, expires_at=expires_at)


@router.post("/revoke", status_code=status.HTTP_200_OK)
async def revoke(
    proof_id: str,
    request: Request,
    user_id: uuid.UUID = Depends(get_current_user),
    public_db: AsyncSession = Depends(get_public_db),
):
    """Revoke a proof: add to blacklist and mark in DB.

    This endpoint handles proof revocation:
    1. Verifies proof ownership
    2. Adds proof to Redis blacklist (7-day TTL)
    3. Marks proof as revoked in database
    4. Creates audit log entry

    Args:
        proof_id: UUID string of proof to revoke
        request: FastAPI request object (for metadata)
        user_id: Authenticated user ID (from JWT)
        public_db: Public database session

    Returns:
        Dictionary with revoked status and proof_id

    Raises:
        HTTPException: 404 if proof not found or user doesn't own it
    """
    metadata = get_request_metadata(request)
    proof_uuid = uuid.UUID(proof_id)

    # Verify proof ownership
    proof_obj = await proof_crud.get_proof(public_db, proof_uuid)
    if not proof_obj or proof_obj.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proof not found or access denied",
        )

    # Add to Redis blacklist
    await blacklist.add_to_blacklist(str(proof_uuid), ttl_days=7)

    # Mark revoked in DB
    await proof_crud.revoke_proof(public_db, proof_uuid)

    # Log revocation
    await log_crud.create_log(
        public_db,
        action="revoke",
        user_id=user_id,
        proof_id=proof_uuid,
        ip_address=metadata["ip_address"],
        user_agent=metadata["user_agent"],
        details={},
    )

    return {"revoked": True, "proof_id": str(proof_uuid)}


@router.get("/dashboard")
async def dashboard(
    user_id: uuid.UUID = Depends(get_current_user),
    public_db: AsyncSession = Depends(get_public_db),
):
    """Get user's proofs and logs. Admins see all data.

    This endpoint provides a comprehensive dashboard view:
    1. Fetches all proofs owned by the user
    2. Fetches recent audit logs (up to 100 entries)
    3. Returns formatted data for UI display

    Args:
        user_id: Authenticated user ID (from JWT)
        public_db: Public database session

    Returns:
        Dictionary with:
        - proofs: List of proof objects with metadata
        - logs: List of log entries with timestamps and details
    """
    # Get proofs
    proofs = await proof_crud.get_proofs_by_user(public_db, user_id)

    # Get logs
    logs = await log_crud.get_logs_by_user(public_db, user_id, limit=100)

    return {
        "proofs": [
            {
                "proof_id": str(p.id),
                "doc_type": p.doc_type,
                "expiry": p.expiry.isoformat(),
                "revoked": p.revoked,
                "created_at": p.created_at.isoformat(),
            }
            for p in proofs
        ],
        "logs": [
            {
                "timestamp": l.timestamp.isoformat(),
                "action": l.action,
                "proof_id": str(l.proof_id) if l.proof_id else None,
                "details": l.details,
            }
            for l in logs
        ],
    }
