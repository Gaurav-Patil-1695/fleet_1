import uuid
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Reading(Base):
    __tablename__ = "readings"

    __table_args__ = (
        CheckConstraint(
            "source IN ('telematics', 'manual', 'telematics_mock')",
            name="ck_readings_source",
        ),
        CheckConstraint(
            "odometer_km >= 0",
            name="ck_readings_odometer_km",
        ),
        CheckConstraint(
            "source != 'manual' OR recorded_by_user_id IS NOT NULL",
            name="ck_readings_manual_requires_user",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )
    vehicle_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("vehicles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    recorded_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    odometer_km: Mapped[float] = mapped_column(
        Numeric(10, 1),
        nullable=False,
    )
    source: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True,
    )
    is_test_mode: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )
    raw_payload: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True,
    )
    reading_timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
