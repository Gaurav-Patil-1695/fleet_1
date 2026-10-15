"""First-administrator seed command.

Usage:
    python -m app.seed

Reads ADMIN_EMAIL and ADMIN_PASSWORD from the environment.
Idempotent: if a user with that email already exists, it is left unchanged.
"""

from __future__ import annotations

import asyncio
import os
import sys
import uuid

from sqlalchemy import select

from app.database import SessionLocal
from app.models.user import User
from app.utils.security import hash_password


async def seed_admin() -> None:
    admin_email = os.environ.get("ADMIN_EMAIL", "").strip()
    admin_password = os.environ.get("ADMIN_PASSWORD", "").strip()

    if not admin_email:
        print("ERROR: ADMIN_EMAIL environment variable is required but not set.", file=sys.stderr)
        sys.exit(1)

    if not admin_password:
        print("ERROR: ADMIN_PASSWORD environment variable is required but not set.", file=sys.stderr)
        sys.exit(1)

    async with SessionLocal() as session:
        result = await session.execute(
            select(User).where(User.email == admin_email)
        )
        existing_user = result.scalar_one_or_none()

        if existing_user is not None:
            print(
                f"INFO: User with email '{admin_email}' already exists (id={existing_user.id}). "
                "No changes made."
            )
            return

        password_hash = hash_password(admin_password)

        new_user = User(
            id=uuid.uuid4(),
            depot_id=None,
            full_name="Administrator",
            email=admin_email,
            password_hash=password_hash,
            role="administrator",
            is_active=True,
        )

        session.add(new_user)
        await session.commit()
        await session.refresh(new_user)

        print(
            f"SUCCESS: Administrator user created."
            f" id={new_user.id}, email={new_user.email}, role={new_user.role}"
        )


def main() -> None:
    asyncio.run(seed_admin())


if __name__ == "__main__":
    main()
