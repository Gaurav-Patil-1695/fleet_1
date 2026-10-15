import bcrypt

from app.config import settings


def hash_password(plain_password: str) -> str:
    """Hash a plaintext password using bcrypt."""
    rounds = settings.BCRYPT_ROUNDS
    salt = bcrypt.gensalt(rounds=rounds)
    hashed = bcrypt.hashpw(plain_password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )
