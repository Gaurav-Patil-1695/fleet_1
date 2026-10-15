from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_all(self) -> list[User]:
        result = await self._session.execute(
            select(User).order_by(User.full_name)
        )
        return list(result.scalars().all())

    async def get_by_id(self, user_id: UUID) -> User | None:
        result = await self._session.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        result = await self._session.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()

    async def get_by_depot_id(self, depot_id: UUID) -> list[User]:
        result = await self._session.execute(
            select(User)
            .where(User.depot_id == depot_id)
            .order_by(User.full_name)
        )
        return list(result.scalars().all())

    async def get_by_role(self, role: str) -> list[User]:
        result = await self._session.execute(
            select(User)
            .where(User.role == role)
            .order_by(User.full_name)
        )
        return list(result.scalars().all())

    async def get_by_depot_id_and_role(
        self, depot_id: UUID, role: str
    ) -> list[User]:
        result = await self._session.execute(
            select(User)
            .where(User.depot_id == depot_id, User.role == role)
            .order_by(User.full_name)
        )
        return list(result.scalars().all())

    async def get_active_by_email(self, email: str) -> User | None:
        result = await self._session.execute(
            select(User).where(
                User.email == email,
                User.is_active.is_(True),
            )
        )
        return result.scalar_one_or_none()

    async def create(
        self,
        full_name: str,
        email: str,
        password_hash: str,
        role: str,
        depot_id: UUID | None = None,
        is_active: bool = True,
    ) -> User:
        user = User(
            full_name=full_name,
            email=email,
            password_hash=password_hash,
            role=role,
            depot_id=depot_id,
            is_active=is_active,
        )
        self._session.add(user)
        await self._session.flush()
        await self._session.refresh(user)
        return user

    async def update(
        self,
        user: User,
        full_name: str | None = None,
        email: str | None = None,
        password_hash: str | None = None,
        role: str | None = None,
        depot_id: UUID | None = None,
        is_active: bool | None = None,
    ) -> User:
        if full_name is not None:
            user.full_name = full_name
        if email is not None:
            user.email = email
        if password_hash is not None:
            user.password_hash = password_hash
        if role is not None:
            user.role = role
        if depot_id is not None:
            user.depot_id = depot_id
        if is_active is not None:
            user.is_active = is_active
        self._session.add(user)
        await self._session.flush()
        await self._session.refresh(user)
        return user

    async def delete(self, user: User) -> None:
        await self._session.delete(user)
        await self._session.flush()

    async def count(self) -> int:
        result = await self._session.execute(
            select(func.count()).select_from(User)
        )
        return result.scalar_one()

    async def count_by_depot_id(self, depot_id: UUID) -> int:
        result = await self._session.execute(
            select(func.count()).select_from(User).where(User.depot_id == depot_id)
        )
        return result.scalar_one()
