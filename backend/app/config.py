from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Application
    APP_ENV: str
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    API_BASE_URL: str
    DEBUG: bool = False
    WORKERS: int = 2

    # Database
    DATABASE_URL: str
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20
    DATABASE_POOL_TIMEOUT: int = 30
    DATABASE_ECHO: bool = False

    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    JWT_REFRESH_SECRET_KEY: str

    # Security
    BCRYPT_ROUNDS: int = 12

    # CORS
    CORS_ALLOWED_ORIGINS: str = "http://localhost:3000"
    CORS_ALLOW_CREDENTIALS: bool = True

    # Telematics
    TELEMATICS_MODE: str = "mock"
    TELEMATICS_LIVE_BASE_URL: str = "https://telematics-provider.example.com/api/v1"
    TELEMATICS_API_KEY: str = ""
    TELEMATICS_POLL_INTERVAL_SECONDS: int = 300
    TELEMATICS_REQUEST_TIMEOUT_SECONDS: int = 10

    # Rate Limiting
    RATE_LIMIT_WINDOW_SECONDS: int = 60
    RATE_LIMIT_MAX_REQUESTS: int = 100

    # Redis / Cache
    REDIS_URL: str = "redis://localhost:6379/0"
    CACHE_DEFAULT_TTL_SECONDS: int = 60
    CACHE_DUE_LIST_TTL_SECONDS: int = 30

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"

    def get_cors_allowed_origins(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ALLOWED_ORIGINS.split(",") if origin.strip()]


settings = Settings()
