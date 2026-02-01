"""Add purpose and requester columns to proofs table

Revision ID: 003_add_proof_fields
Revises: 002_initial_private
Create Date: 2026-01-31 23:56:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "003_add_proof_fields"
down_revision: Union[str, None] = "002_initial_private"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add purpose and requester columns to proofs table."""

    # Check if we're running on the correct database (PUBLIC should have TimescaleDB)
    conn = op.get_bind()
    result = conn.execute(sa.text("SELECT current_database()")).scalar()
    if "private" in str(result).lower():
        print(f"⏭️  Skipping public migration on private database ({result})")
        return

    # Add purpose column (nullable to not break existing proofs)
    op.add_column("proofs", sa.Column("purpose", sa.String(500), nullable=True))

    # Add requester column (nullable to not break existing proofs)
    op.add_column("proofs", sa.Column("requester", sa.String(255), nullable=True))


def downgrade() -> None:
    """Remove purpose and requester columns from proofs table."""

    # Check if we're running on the correct database
    conn = op.get_bind()
    result = conn.execute(sa.text("SELECT current_database()")).scalar()
    if "private" in str(result).lower():
        print(f"⏭️  Skipping public migration on private database ({result})")
        return

    # Drop columns
    op.drop_column("proofs", "requester")
    op.drop_column("proofs", "purpose")
