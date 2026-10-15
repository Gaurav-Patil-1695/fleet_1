import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Vehicle(Base):
    __tablename__ = "vehicles"

    __table_args__ = (
        CheckConstraint(
            "status IN ('active', 'inactive', 'decommissioned')",
            name="ck_vehicles_status",
        ),
        CheckConstraint(
            "last_known_odometer_km IS NULL OR last_known_odometer_km >= 0",
            name="ck_vehicles_last_known_odometer_km",
        ),
        CheckConstraint(
            "last_serviced_odometer_km IS NULL OR last_serviced_odometer_km >= 0",
            name="ck_vehicles_last_serviced_odometer_km",
        ),
        CheckConstraint(
            "next_service_due_odometer_km IS NULL OR next_service_due_odometer_km >= 0",
            name="ck_vehicles_next_service_due_odometer_km",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )
    depot_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("depots.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    vehicle_type_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("vehicle_types.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    registration_number: Mapped[str] = mapped_column(
        String(20), nullable=False, unique=True, index=True
    )
    make: Mapped[str] = mapped_column(String(100), nullable=False)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    in_service_date: Mapped[date] = mapped_column(Date, nullable=False)
    has_telematics: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    last_known_odometer_km: Mapped[float | None] = mapped_column(
        Numeric(10, 1), nullable=True
    )
    last_odometer_recorded_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_serviced_odometer_km: Mapped[float | None] = mapped_column(
        Numeric(10, 1), nullable=True
    )
    last_serviced_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    next_service_due_date: Mapped[date | None] = mapped_column(
        Date, nullable=True, index=True
    )
    next_service_due_odometer_km: Mapped[float | None] = mapped_column(
        Numeric(10, 1), nullable=True, index=True
    )
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="active", server_default="active", index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
