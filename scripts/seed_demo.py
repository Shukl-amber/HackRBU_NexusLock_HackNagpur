"""
Seed script for demo users and sample data.
Run this to create demo users with different scenarios for hackathon presentation.
"""

import asyncio
import os
import sys

# Add server to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "server"))

from app.core.database import get_public_db, get_private_db
from app.core.security import hash_password
from app.crud.user import create_user
from app.crud.proof import create_proof
from app.crud.log import create_log
from app.services.vault import encrypt_document
import uuid
from datetime import datetime, timedelta

# Demo users configuration
DEMO_USERS = [
    {
        "email": "demo1@nexusconnect.io",
        "password": "demo123",
        "name": "Demo User 1",
        "proofs": [
            {
                "doc_type": "Aadhaar Card",
                "status": "active",
                "created_days_ago": 5,
            },
            {
                "doc_type": "PAN Card",
                "status": "active",
                "created_days_ago": 10,
            },
        ],
    },
    {
        "email": "demo2@nexusconnect.io",
        "password": "demo123",
        "name": "Demo User 2",
        "proofs": [
            {
                "doc_type": "Passport",
                "status": "revoked",
                "created_days_ago": 15,
            },
            {
                "doc_type": "Driver's License",
                "status": "active",
                "created_days_ago": 3,
            },
        ],
    },
    {
        "email": "admin@nexusconnect.io",
        "password": "admin123",
        "name": "Administrator",
        "is_admin": True,
        "proofs": [],
    },
]


async def seed_demo_users():
    """Create demo users with sample data."""
    print("🌱 Seeding demo users...")

    async for public_db in get_public_db():
        async for private_db in get_private_db():
            for user_data in DEMO_USERS:
                # Check if user exists
                from app.crud.user import get_user_by_email

                existing = await get_user_by_email(public_db, user_data["email"])

                if existing:
                    print(f"  ⚠️  User {user_data['email']} already exists, skipping...")
                    continue

                # Create user
                password_hash = hash_password(user_data["password"])
                user = await create_user(
                    public_db,
                    email=user_data["email"],
                    password_hash=password_hash,
                    name=user_data["name"],
                )

                print(f"  ✅ Created user: {user_data['name']} ({user_data['email']})")

                # Create proofs for user
                for proof_data in user_data.get("proofs", []):
                    proof_id = uuid.uuid4()
                    created_at = datetime.utcnow() - timedelta(
                        days=proof_data["created_days_ago"]
                    )

                    # Create proof in public DB
                    await create_proof(
                        public_db,
                        user_id=user.id,
                        doc_type=proof_data["doc_type"],
                        proof=b"demo_proof_data",
                        pub_signals=[],
                        expiry_days=30,
                    )

                    # Create encrypted doc in private DB
                    doc_data = f"Demo {proof_data['doc_type']} content".encode()
                    encrypted, salt = encrypt_document(doc_data, str(user.id))

                    from app.crud.doc import create_doc

                    await create_doc(
                        private_db,
                        proof_id=proof_id,
                        encrypted_doc=encrypted,
                        salt=salt,
                    )

                    print(f"     📄 Created proof: {proof_data['doc_type']}")

                    # Create access log
                    await create_log(
                        public_db,
                        action="proof_created",
                        user_id=user.id,
                        proof_id=proof_id,
                        details={"doc_type": proof_data["doc_type"]},
                    )

                print()

    print("✨ Demo seeding complete!")
    print("\nDemo Credentials:")
    print("================")
    for user in DEMO_USERS:
        print(f"  {user['name']}")
        print(f"    Email: {user['email']}")
        print(f"    Password: {user['password']}")
        print()


if __name__ == "__main__":
    # Set environment variables for local development
    os.environ.setdefault(
        "PUBLIC_DATABASE_URL",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/nexus_connect",
    )
    os.environ.setdefault(
        "PRIVATE_DATABASE_URL",
        "postgresql+asyncpg://postgres:postgres@localhost:5433/nexus_connect_private",
    )
    os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
    os.environ.setdefault("SECRET_KEY", "demo-secret-key-32-characters-long!!")
    os.environ.setdefault(
        "MASTER_ENCRYPTION_KEY", "demo-master-key-32-characters-long!!"
    )

    asyncio.run(seed_demo_users())
