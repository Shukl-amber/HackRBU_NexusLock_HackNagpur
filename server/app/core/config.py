"""Configuration management using pydantic-settings."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database URLs
    PUBLIC_DATABASE_URL: str
    PRIVATE_DATABASE_URL: str

    # Redis Configuration
    REDIS_URL: str

    # Security Keys
    SECRET_KEY: str
    MASTER_ENCRYPTION_KEY: str

    # Admin Credentials
    ADMIN_USERNAME: str
    ADMIN_PASSWORD: str

    # JWT Settings
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_MINUTES: int = 60

    # CORS Configuration
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    class Config:
        """Pydantic configuration."""

        env_file = ".env"
        case_sensitive = True


settings = Settings()
