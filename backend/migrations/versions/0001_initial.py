"""Initial schema

Revision ID: 0001
Revises:
Create Date: 2024-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ---------------------------------------------------------------------------
    # depots
    # ---------------------------------------------------------------------------
    op.create_table(
        "depots",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_index("idx_depots_name", "depots", ["name"])

    # ---------------------------------------------------------------------------
    # vehicle_types
    # ---------------------------------------------------------------------------
    op.create_table(
        "vehicle_types",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("vehicle_class", sa.String(50), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
        sa.CheckConstraint(
            "vehicle_class IN ('heavy_truck', 'light_commercial', 'other')",
            name="ck_vehicle_types_vehicle_class",
        ),
    )
    op.create_index("idx_vehicle_types_class", "vehicle_types", ["vehicle_class"])

    # ---------------------------------------------------------------------------
    # schedules
    # ---------------------------------------------------------------------------
    op.create_table(
        "schedules",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("vehicle_type_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("vehicle_class", sa.String(50), nullable=False),
        sa.Column("km_interval", sa.Integer(), nullable=False),
        sa.Column("month_interval", sa.Integer(), nullable=False),
        sa.Column(
            "is_active",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["vehicle_type_id"],
            ["vehicle_types.id"],
            name="fk_schedules_vehicle_type_id",
            ondelete="RESTRICT",
        ),
        sa.CheckConstraint("km_interval > 0", name="ck_schedules_km_interval"),
        sa.CheckConstraint(
            "month_interval > 0", name="ck_schedules_month_interval"
        ),
        sa.CheckConstraint(
            "vehicle_class IN ('heavy_truck', 'light_commercial', 'other')",
            name="ck_schedules_vehicle_class",
        ),
    )
    op.create_index(
        "idx_schedules_vehicle_type_id", "schedules", ["vehicle_type_id"]
    )
    op.create_index(
        "idx_schedules_active_per_type",
        "schedules",
        ["vehicle_type_id"],
        unique=True,
        postgresql_where=sa.text("is_active = true"),
    )

    # ---------------------------------------------------------------------------
    # users
    # ---------------------------------------------------------------------------
    op.create_table(
        "users",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("depot_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("full_name", sa.String(200), nullable=False),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", sa.String(30), nullable=False),
        sa.Column(
            "is_active",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
        sa.ForeignKeyConstraint(
            ["depot_id"],
            ["depots.id"],
            name="fk_users_depot_id",
            ondelete="SET NULL",
        ),
        sa.CheckConstraint(
            "role IN ('administrator', 'manager', 'technician')",
            name="ck_users_role",
        ),
    )
    op.create_index("idx_users_email", "users", ["email"])
    op.create_index("idx_users_depot_id", "users", ["depot_id"])
    op.create_index("idx_users_role", "users", ["role"])

    # ---------------------------------------------------------------------------
    # vehicles
    # ---------------------------------------------------------------------------
    op.create_table(
        "vehicles",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("depot_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("vehicle_type_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("registration_number", sa.String(20), nullable=False),
        sa.Column("make", sa.String(100), nullable=False),
        sa.Column("model", sa.String(100), nullable=False),
        sa.Column("in_service_date", sa.Date(), nullable=False),
        sa.Column(
            "has_telematics",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
        sa.Column(
            "last_known_odometer_km",
            sa.Numeric(precision=10, scale=1),
            nullable=True,
        ),
        sa.Column(
            "last_odometer_recorded_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "last_serviced_odometer_km",
            sa.Numeric(precision=10, scale=1),
            nullable=True,
        ),
        sa.Column(
            "last_serviced_at", sa.DateTime(timezone=True), nullable=True
        ),
        sa.Column("next_service_due_date", sa.Date(), nullable=True),
        sa.Column(
            "next_service_due_odometer_km",
            sa.Numeric(precision=10, scale=1),
            nullable=True,
        ),
        sa.Column(
            "status",
            sa.String(30),
            server_default=sa.text("'active'"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("registration_number"),
        sa.ForeignKeyConstraint(
            ["depot_id"],
            ["depots.id"],
            name="fk_vehicles_depot_id",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["vehicle_type_id"],
            ["vehicle_types.id"],
            name="fk_vehicles_vehicle_type_id",
            ondelete="RESTRICT",
        ),
        sa.CheckConstraint(
            "status IN ('active', 'inactive', 'decommissioned')",
            name="ck_vehicles_status",
        ),
        sa.CheckConstraint(
            "last_known_odometer_km IS NULL OR last_known_odometer_km >= 0",
            name="ck_vehicles_last_known_odometer_km",
        ),
        sa.CheckConstraint(
            "last_serviced_odometer_km IS NULL OR last_serviced_odometer_km >= 0",
            name="ck_vehicles_last_serviced_odometer_km",
        ),
        sa.CheckConstraint(
            "next_service_due_odometer_km IS NULL OR next_service_due_odometer_km >= 0",
            name="ck_vehicles_next_service_due_odometer_km",
        ),
    )
    op.create_index("idx_vehicles_depot_id", "vehicles", ["depot_id"])
    op.create_index(
        "idx_vehicles_vehicle_type_id", "vehicles", ["vehicle_type_id"]
    )
    op.create_index(
        "idx_vehicles_registration_number",
        "vehicles",
        ["registration_number"],
    )
    op.create_index("idx_vehicles_status", "vehicles", ["status"])
    op.create_index(
        "idx_vehicles_next_service_due_date",
        "vehicles",
        ["next_service_due_date"],
    )
    op.create_index(
        "idx_vehicles_next_service_due_odometer_km",
        "vehicles",
        ["next_service_due_odometer_km"],
    )

    # ---------------------------------------------------------------------------
    # readings
    # ---------------------------------------------------------------------------
    op.create_table(
        "readings",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("vehicle_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "recorded_by_user_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column(
            "odometer_km", sa.Numeric(precision=10, scale=1), nullable=False
        ),
        sa.Column("source", sa.String(20), nullable=False),
        sa.Column(
            "is_test_mode",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
        sa.Column("raw_payload", postgresql.JSONB(), nullable=True),
        sa.Column(
            "reading_timestamp",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["vehicle_id"],
            ["vehicles.id"],
            name="fk_readings_vehicle_id",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["recorded_by_user_id"],
            ["users.id"],
            name="fk_readings_recorded_by_user_id",
            ondelete="SET NULL",
        ),
        sa.CheckConstraint(
            "source IN ('telematics', 'manual', 'telematics_mock')",
            name="ck_readings_source",
        ),
        sa.CheckConstraint(
            "odometer_km >= 0", name="ck_readings_odometer_km"
        ),
        sa.CheckConstraint(
            "source != 'manual' OR recorded_by_user_id IS NOT NULL",
            name="ck_readings_manual_requires_user",
        ),
    )
    op.create_index("idx_readings_vehicle_id", "readings", ["vehicle_id"])
    op.create_index(
        "idx_readings_vehicle_id_timestamp",
        "readings",
        ["vehicle_id", "reading_timestamp"],
    )
    op.create_index("idx_readings_source", "readings", ["source"])
    op.create_index(
        "idx_readings_reading_timestamp", "readings", ["reading_timestamp"]
    )

    # ---------------------------------------------------------------------------
    # work_orders
    # ---------------------------------------------------------------------------
    op.create_table(
        "work_orders",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("vehicle_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("depot_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "assigned_technician_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column(
            "raised_by_user_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "closed_by_user_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column(
            "status",
            sa.String(30),
            server_default=sa.text("'open'"),
            nullable=False,
        ),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("completion_notes", sa.Text(), nullable=True),
        sa.Column(
            "post_service_odometer_km",
            sa.Numeric(precision=10, scale=1),
            nullable=True,
        ),
        sa.Column(
            "post_service_reading_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column(
            "raised_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["vehicle_id"],
            ["vehicles.id"],
            name="fk_work_orders_vehicle_id",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["depot_id"],
            ["depots.id"],
            name="fk_work_orders_depot_id",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["assigned_technician_id"],
            ["users.id"],
            name="fk_work_orders_assigned_technician_id",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["raised_by_user_id"],
            ["users.id"],
            name="fk_work_orders_raised_by_user_id",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["closed_by_user_id"],
            ["users.id"],
            name="fk_work_orders_closed_by_user_id",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["post_service_reading_id"],
            ["readings.id"],
            name="fk_work_orders_post_service_reading_id",
            ondelete="SET NULL",
        ),
        sa.CheckConstraint(
            "status IN ('open', 'in_progress', 'closed', 'cancelled')",
            name="ck_work_orders_status",
        ),
        sa.CheckConstraint(
            "post_service_odometer_km IS NULL OR post_service_odometer_km >= 0",
            name="ck_work_orders_post_service_odometer_km",
        ),
        sa.CheckConstraint(
            "status != 'closed' OR (completion_notes IS NOT NULL AND post_service_odometer_km IS NOT NULL AND closed_at IS NOT NULL)",
            name="ck_work_orders_closed_requires_fields",
        ),
    )
    op.create_index("idx_work_orders_vehicle_id", "work_orders", ["vehicle_id"])
    op.create_index("idx_work_orders_depot_id", "work_orders", ["depot_id"])
    op.create_index(
        "idx_work_orders_assigned_technician_id",
        "work_orders",
        ["assigned_technician_id"],
    )
    op.create_index("idx_work_orders_status", "work_orders", ["status"])
    op.create_index("idx_work_orders_raised_at", "work_orders", ["raised_at"])


def downgrade() -> None:
    # Drop in reverse dependency order
    op.drop_index("idx_work_orders_raised_at", table_name="work_orders")
    op.drop_index("idx_work_orders_status", table_name="work_orders")
    op.drop_index(
        "idx_work_orders_assigned_technician_id", table_name="work_orders"
    )
    op.drop_index("idx_work_orders_depot_id", table_name="work_orders")
    op.drop_index("idx_work_orders_vehicle_id", table_name="work_orders")
    op.drop_table("work_orders")

    op.drop_index("idx_readings_reading_timestamp", table_name="readings")
    op.drop_index("idx_readings_source", table_name="readings")
    op.drop_index("idx_readings_vehicle_id_timestamp", table_name="readings")
    op.drop_index("idx_readings_vehicle_id", table_name="readings")
    op.drop_table("readings")

    op.drop_index(
        "idx_vehicles_next_service_due_odometer_km", table_name="vehicles"
    )
    op.drop_index(
        "idx_vehicles_next_service_due_date", table_name="vehicles"
    )
    op.drop_index("idx_vehicles_status", table_name="vehicles")
    op.drop_index(
        "idx_vehicles_registration_number", table_name="vehicles"
    )
    op.drop_index("idx_vehicles_vehicle_type_id", table_name="vehicles")
    op.drop_index("idx_vehicles_depot_id", table_name="vehicles")
    op.drop_table("vehicles")

    op.drop_index("idx_users_role", table_name="users")
    op.drop_index("idx_users_depot_id", table_name="users")
    op.drop_index("idx_users_email", table_name="users")
    op.drop_table("users")

    op.drop_index("idx_schedules_active_per_type", table_name="schedules")
    op.drop_index("idx_schedules_vehicle_type_id", table_name="schedules")
    op.drop_table("schedules")

    op.drop_index("idx_vehicle_types_class", table_name="vehicle_types")
    op.drop_table("vehicle_types")

    op.drop_index("idx_depots_name", table_name="depots")
    op.drop_table("depots")
