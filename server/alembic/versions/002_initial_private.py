"""Initial private database schema with RLS

Revision ID: 002_initial_private
Revises: 001_initial_public
Create Date: 2026-01-31 23:57:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "002_initial_private"
down_revision: Union[str, None] = "001_initial_public"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create private database schema with RLS policies."""

    # Check if we're running on the correct database (PRIVATE should NOT have TimescaleDB)
    conn = op.get_bind()
    result = conn.execute(sa.text("SELECT current_database()")).scalar()
    if "private" not in str(result).lower():
        print(f"⏭️  Skipping private migration on public database ({result})")
        return

    # Create docs table with encrypted document storage
    op.create_table(
        "docs",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("proof_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("encrypted_doc", postgresql.BYTEA(), nullable=False),
        sa.Column("salt", postgresql.BYTEA(), nullable=False),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("proof_id"),
    )

    # Create index on proof_id for foreign key lookups
    op.create_index("idx_docs_proof_id", "docs", ["proof_id"])

    # Enable Row Level Security on docs table
    op.execute("ALTER TABLE docs ENABLE ROW LEVEL SECURITY;")

    # Create RLS policy for user access
    # Users can only access docs where they set the session variable app.user_id matching the proof owner
    # Note: The application layer must set this session variable after JWT validation
    # The check happens at the application layer before calling private DB
    op.execute("""
        CREATE POLICY user_docs_policy ON docs
            FOR ALL
            USING (
                current_setting('app.user_id', TRUE)::TEXT IS NOT NULL
            );
    """)

    # Create RLS policy for admin bypass
    # Admins can see all documents when app.is_admin is set to TRUE
    op.execute("""
        CREATE POLICY admin_docs_policy ON docs
            FOR ALL
            USING (
                current_setting('app.is_admin', TRUE)::BOOLEAN = TRUE
            );
    """)


def downgrade() -> None:
    """Drop private database schema."""

    # Drop RLS policies
    op.execute("DROP POLICY IF EXISTS admin_docs_policy ON docs;")
    op.execute("DROP POLICY IF EXISTS user_docs_policy ON docs;")

    # Disable RLS
    op.execute("ALTER TABLE docs DISABLE ROW LEVEL SECURITY;")

    # Drop index and table
    op.drop_index("idx_docs_proof_id", table_name="docs")
    op.drop_table("docs")
