import uuid
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Schedule(Base):
    __tablename__ = "schedules"

    __table_args__ = (
        CheckConstraint("km_interval > 0", name="ck_schedules_km_interval"),
        CheckConstraint("month_interval > 0", name="ck_schedules_month_interval"),
        CheckConstraint(
            "vehicle_class IN ('heavy_truck', 'light_commercial', 'other')",
            name="ck_schedules_vehicle_class",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )
    vehicle_type_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("vehicle_types.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    vehicle_class: Mapped[str] = mapped_column(String(50), nullable=False)
    km_interval: Mapped[int] = mapped_column(Integer, nullable=False)
    month_interval: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
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
