"""Add users table for email/password authentication

Revision ID: 004_add_users
Revises: 003_add_proof_fields
Create Date: 2026-02-01 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "004_add_users"
down_revision: Union[str, None] = "003_add_proof_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create users table."""

    # Check if we're running on the correct database (PUBLIC should have TimescaleDB)
    conn = op.get_bind()
    result = conn.execute(sa.text("SELECT current_database()")).scalar()
    if "private" in str(result).lower():
        print(f"⏭️  Skipping public migration on private database ({result})")
        return

    # Create users table
    op.create_table(
        "users",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("email", sa.VARCHAR(length=255), nullable=False),
        sa.Column("password_hash", sa.VARCHAR(length=255), nullable=False),
        sa.Column("name", sa.VARCHAR(length=255), nullable=False),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )

    # Create index on email for fast lookups
    op.create_index("idx_users_email", "users", ["email"])


def downgrade() -> None:
    """Drop users table."""

    # Check if we're running on the correct database
    conn = op.get_bind()
    result = conn.execute(sa.text("SELECT current_database()")).scalar()
    if "private" in str(result).lower():
        print(f"⏭️  Skipping public migration on private database ({result})")
        return

    # Drop index and table
    op.drop_index("idx_users_email", table_name="users")
    op.drop_table("users")
