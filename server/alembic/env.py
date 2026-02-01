"""Alembic environment configuration for dual database migrations."""

import asyncio
import os
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
target_metadata = None

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def get_url(db_type: str) -> str:
    """Get database URL from environment variables."""
    if db_type == "public":
        url = os.getenv(
            "PUBLIC_DATABASE_URL",
            "postgresql+asyncpg://postgres:postgres@localhost:5432/nexus_connect",
        )
    else:  # private
        url = os.getenv(
            "PRIVATE_DATABASE_URL",
            "postgresql+asyncpg://postgres:postgres@localhost:5433/nexus_connect_private",
        )
    return url


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    # Offline mode doesn't support dual database migration
    # Default to public database
    url = get_url("public")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    """Execute migrations with the given connection."""
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations(db_type: str) -> None:
    """Run migrations on async engine for specified database.

    Args:
        db_type: 'public' or 'private'
    """
    # Override the sqlalchemy.url config option with our async URL
    url = get_url(db_type)

    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = url

    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    This function runs migrations on BOTH databases sequentially.
    """
    # Run public database migrations
    print("=" * 60)
    print("Running migrations on PUBLIC database (TimescaleDB)...")
    print("=" * 60)
    asyncio.run(run_async_migrations("public"))

    # Run private database migrations
    print("\n" + "=" * 60)
    print("Running migrations on PRIVATE database (PostgreSQL with RLS)...")
    print("=" * 60)
    asyncio.run(run_async_migrations("private"))


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
