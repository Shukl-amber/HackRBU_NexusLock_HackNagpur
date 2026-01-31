"""Initial public database schema with TimescaleDB hypertables and pg_cron

Revision ID: 001_initial_public
Revises:
Create Date: 2026-01-31 23:56:00.000000

"""

from typing import Sequence, Union
import os

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "001_initial_public"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create public database schema with TimescaleDB hypertables."""

    # Check if we're running on the correct database (PUBLIC should have TimescaleDB)
    conn = op.get_bind()
    result = conn.execute(sa.text("SELECT current_database()")).scalar()
    if "private" in str(result).lower():
        print(f"⏭️  Skipping public migration on private database ({result})")
        return

    # Enable TimescaleDB extension
    op.execute("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;")

    # Enable pgcrypto for password hashing
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")

    # NOTE: pg_cron extension requires separate installation on TimescaleDB
    # For production: apt-get install postgresql-15-cron
    # Uncomment below when pg_cron is available:
    # op.execute("CREATE EXTENSION IF NOT EXISTS pg_cron;")

    # Create proofs table (will be converted to hypertable)
    # Note: Primary key must include created_at for TimescaleDB hypertable partitioning
    op.create_table(
        "proofs",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("doc_type", sa.VARCHAR(length=50), nullable=False),
        sa.Column("proof", postgresql.BYTEA(), nullable=False),
        sa.Column(
            "pub_signals", postgresql.JSONB(astext_type=sa.Text()), nullable=False
        ),
        sa.Column("expiry", sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column(
            "revoked", sa.BOOLEAN(), nullable=False, server_default=sa.text("FALSE")
        ),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        # Primary key includes created_at for hypertable partitioning
        sa.PrimaryKeyConstraint("id", "created_at"),
    )

    # Convert proofs to TimescaleDB hypertable (MUST use raw SQL)
    op.execute("""
        SELECT create_hypertable('proofs', 'created_at', 
                                 chunk_time_interval => INTERVAL '1 day',
                                 if_not_exists => TRUE);
    """)

    # Create indexes on proofs table
    op.create_index("idx_proofs_user_id", "proofs", ["user_id"])
    op.create_index("idx_proofs_expiry", "proofs", ["expiry"])
    op.create_index("idx_proofs_doc_type", "proofs", ["doc_type"])

    # Create logs table (immutable audit log)
    op.create_table(
        "logs",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "timestamp",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column("action", sa.VARCHAR(length=100), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("proof_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("ip_address", sa.VARCHAR(length=45), nullable=True),
        sa.Column("user_agent", sa.TEXT(), nullable=True),
        sa.Column("details", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create immutable trigger for logs
    op.execute("""
        CREATE OR REPLACE FUNCTION prevent_log_modifications()
        RETURNS TRIGGER AS $$
        BEGIN
            RAISE EXCEPTION 'Logs are immutable';
        END;
        $$ LANGUAGE plpgsql;
    """)

    op.execute("""
        CREATE TRIGGER immutable_logs
        BEFORE UPDATE OR DELETE ON logs
        FOR EACH ROW EXECUTE FUNCTION prevent_log_modifications();
    """)

    # Create indexes on logs table
    op.create_index("idx_logs_user_id", "logs", ["user_id"])
    op.create_index("idx_logs_proof_id", "logs", ["proof_id"])
    op.create_index("idx_logs_timestamp", "logs", ["timestamp"])
    op.create_index("idx_logs_action", "logs", ["action"])

    # Create trusted_domains table
    op.create_table(
        "trusted_domains",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("domain", sa.VARCHAR(length=255), nullable=False),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("domain"),
    )

    # Create api_keys table
    op.create_table(
        "api_keys",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("key_id", sa.VARCHAR(length=50), nullable=False),
        sa.Column("key_hash", sa.VARCHAR(length=255), nullable=False),
        sa.Column("key_prefix", sa.VARCHAR(length=10), nullable=False),
        sa.Column("name", sa.VARCHAR(length=100), nullable=False),
        sa.Column("domain", sa.VARCHAR(length=255), nullable=False),
        sa.Column(
            "revoked", sa.BOOLEAN(), nullable=False, server_default=sa.text("FALSE")
        ),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("key_id"),
    )

    op.create_index("idx_api_keys_key_id", "api_keys", ["key_id"])
    op.create_index("idx_api_keys_domain", "api_keys", ["domain"])

    # Create admin_users table
    op.create_table(
        "admin_users",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("username", sa.VARCHAR(length=100), nullable=False),
        sa.Column("hashed_password", sa.VARCHAR(length=255), nullable=False),
        sa.Column(
            "is_active", sa.BOOLEAN(), nullable=False, server_default=sa.text("TRUE")
        ),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("username"),
    )

    # Seed admin user from environment variables
    admin_username = os.getenv("ADMIN_USERNAME", "admin")
    admin_password = os.getenv("ADMIN_PASSWORD", "change-this-password")

    op.execute(f"""
        INSERT INTO admin_users (username, hashed_password)
        VALUES (
            '{admin_username}',
            crypt('{admin_password}', gen_salt('bf'))
        )
        ON CONFLICT (username) DO NOTHING;
    """)

    # NOTE: Uncomment when pg_cron is available:
    # op.execute("""
    #     SELECT cron.schedule(
    #         'cleanup-expired-proofs',
    #         '0 0 * * *',
    #         $$DELETE FROM proofs WHERE expiry < NOW() AND revoked = FALSE$$
    #     );
    # """)


def downgrade() -> None:
    """Drop public database schema."""

    # NOTE: Uncomment if pg_cron was enabled:
    # op.execute("""
    #     SELECT cron.unschedule('cleanup-expired-proofs');
    # """)

    # Drop tables
    op.drop_table("admin_users")
    op.drop_index("idx_api_keys_domain", table_name="api_keys")
    op.drop_index("idx_api_keys_key_id", table_name="api_keys")
    op.drop_table("api_keys")
    op.drop_table("trusted_domains")

    # Drop logs triggers and functions
    op.execute("DROP TRIGGER IF EXISTS immutable_logs ON logs;")
    op.execute("DROP FUNCTION IF EXISTS prevent_log_modifications();")

    op.drop_index("idx_logs_action", table_name="logs")
    op.drop_index("idx_logs_timestamp", table_name="logs")
    op.drop_index("idx_logs_proof_id", table_name="logs")
    op.drop_index("idx_logs_user_id", table_name="logs")
    op.drop_table("logs")

    # Drop proofs table (hypertable will be automatically handled)
    op.drop_index("idx_proofs_doc_type", table_name="proofs")
    op.drop_index("idx_proofs_expiry", table_name="proofs")
    op.drop_index("idx_proofs_user_id", table_name="proofs")
    op.drop_table("proofs")

    # Note: Extensions are not dropped to avoid breaking other databases
