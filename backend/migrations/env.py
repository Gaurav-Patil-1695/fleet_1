import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# Import Base and all models so their metadata is registered
from app.database import Base
from app.config import settings

# Import all models to ensure they are registered with Base.metadata
from app.models.depot import Depot  # noqa: F401
from app.models.vehicle_type import VehicleType  # noqa: F401
from app.models.schedule import Schedule  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.vehicle import Vehicle  # noqa: F401
from app.models.reading import Reading  # noqa: F401
from app.models.work_order import WorkOrder  # noqa: F401

# Alembic Config object — gives access to the .ini file values
config = context.config

# Override sqlalchemy.url from application settings so we use DATABASE_URL env var
# The async URL (postgresql+asyncpg://...) must be converted to sync for Alembic
# when running offline; for online (async) mode we use async_engine_from_config.
db_url = settings.DATABASE_URL
# Alembic needs the sync driver for offline mode; strip asyncpg -> psycopg2 for offline
sync_db_url = db_url.replace("postgresql+asyncpg://", "postgresql://", 1)
config.set_main_option("sqlalchemy.url", sync_db_url)

# Interpret the config file for Python logging if present
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# The metadata object for autogenerate support
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL and not an Engine,
    so we do not need a DBAPI connection here. Calls to context.execute()
    emit SQL to the script output.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations in 'online' mode using an async engine."""
    # Build async engine configuration from the alembic config, overriding
    # the URL with the async-capable DSN (postgresql+asyncpg://...).
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = db_url

    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
