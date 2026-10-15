"""Smoke tests for app.utils.security (hash_password / verify_password)."""

import pytest
from unittest.mock import patch

from app.utils.security import hash_password, verify_password


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def plain_password() -> str:
    return "SuperSecret123!"


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_hash_password_returns_string(plain_password):
    """hash_password must return a non-empty string."""
    result = hash_password(plain_password)
    assert isinstance(result, str)
    assert len(result) > 0


def test_hash_password_produces_bcrypt_hash(plain_password):
    """The returned value should be a valid bcrypt hash (starts with $2b$)."""
    result = hash_password(plain_password)
    assert result.startswith("$2b$") or result.startswith("$2a$")


def test_hash_password_different_each_call(plain_password):
    """Two calls with the same password must produce different hashes (different salts)."""
    hash1 = hash_password(plain_password)
    hash2 = hash_password(plain_password)
    assert hash1 != hash2


def test_verify_password_correct(plain_password):
    """verify_password returns True when the plain password matches the hash."""
    hashed = hash_password(plain_password)
    assert verify_password(plain_password, hashed) is True


def test_verify_password_wrong_password(plain_password):
    """verify_password returns False when the plain password does NOT match the hash."""
    hashed = hash_password(plain_password)
    assert verify_password("WrongPassword!", hashed) is False


def test_hash_password_uses_configured_rounds():
    """hash_password should use the BCRYPT_ROUNDS value from settings."""
    # Use a low round count to keep the test fast.
    with patch("app.utils.security.settings") as mock_settings:
        mock_settings.BCRYPT_ROUNDS = 4
        result = hash_password("test_password")
    # Verify the round count is embedded in the hash string.
    assert "$04$" in result or "$4$" in result or "04" in result.split("$")[2]
