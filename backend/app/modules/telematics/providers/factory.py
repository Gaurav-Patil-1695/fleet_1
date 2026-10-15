"""OdometerProvider factory — returns the correct provider based on TELEMATICS_MODE.

Use this module to obtain an OdometerProvider instance. Application code must
never import LiveOdometerProvider or MockOdometerProvider directly; always call
get_provider() so that switching between modes requires only a configuration
change (TELEMATICS_MODE=mock|live) with no code change.
"""

import logging
from functools import lru_cache

from app.config import settings
from app.modules.telematics.providers import OdometerProvider

logger = logging.getLogger(__name__)

# Supported TELEMATICS_MODE values.
_MODE_MOCK = "mock"
_MODE_LIVE = "live"


@lru_cache(maxsize=1)
def get_provider() -> OdometerProvider:
    """Return the active OdometerProvider instance selected by TELEMATICS_MODE.

    The provider is instantiated once and cached for the lifetime of the
    process. Switching modes requires only changing the TELEMATICS_MODE
    environment variable and restarting the process — no code change is needed.

    Returns:
        An OdometerProvider implementation appropriate for the configured mode:
        - ``mock``: MockOdometerProvider — deterministic, no network I/O.
        - ``live``: LiveOdometerProvider — calls the real telematics endpoint.

    Raises:
        ValueError: If TELEMATICS_MODE is set to an unrecognised value.
    """
    mode: str = str(settings.TELEMATICS_MODE).strip().lower()

    if mode == _MODE_MOCK:
        # Import here to enforce that application code never imports directly.
        from app.modules.telematics.providers.mock_provider import MockOdometerProvider  # noqa: PLC0415

        logger.info("Telematics provider: MockOdometerProvider (TELEMATICS_MODE=mock)")
        return MockOdometerProvider()

    if mode == _MODE_LIVE:
        # Import here to enforce that application code never imports directly.
        from app.modules.telematics.providers.live_provider import LiveOdometerProvider  # noqa: PLC0415

        logger.info("Telematics provider: LiveOdometerProvider (TELEMATICS_MODE=live)")
        return LiveOdometerProvider()

    raise ValueError(
        f"Unknown TELEMATICS_MODE '{settings.TELEMATICS_MODE}'. "
        f"Supported values are '{_MODE_MOCK}' and '{_MODE_LIVE}'."
    )


__all__ = ["get_provider"]
