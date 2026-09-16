"""Runtime configuration loaded from environment variables."""

from __future__ import annotations

from pathlib import Path

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[2]
DEFAULT_DEVELOPMENT_SECRET = "change-this-development-secret-before-deployment"


class Settings(BaseSettings):
    """Validated application settings.

    A local development default lets the app start before a `.env` file has
    been created. Production settings reject that default secret so deployments
    must provide their own value through the environment or `.env`.
    """

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        env_prefix="VENDORIQ_",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "VendorIQ"
    app_environment: str = "development"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"

    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/vendoriq"

    jwt_secret_key: str = DEFAULT_DEVELOPMENT_SECRET
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = Field(default=30, ge=1)
    refresh_token_expire_days: int = Field(default=7, ge=1)

    # A file:// page sends the literal Origin: null header. Keeping it in the
    # default allows the requested direct-open frontend workflow.
    cors_origins: str = "http://localhost:5500,http://127.0.0.1:5500,http://localhost:5501,http://127.0.0.1:5501,null"
    procurement_finance_threshold: float = Field(default=100000, ge=0)
    uploads_dir: Path = BACKEND_DIR / "uploads"

    @property
    def cors_origin_list(self) -> list[str]:
        """Return the comma-separated CORS setting as a clean origin list."""

        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def contract_upload_dir(self) -> Path:
        return self.uploads_dir / "contracts"

    @property
    def purchase_order_upload_dir(self) -> Path:
        return self.uploads_dir / "purchase-orders"

    @model_validator(mode="after")
    def validate_production_secret(self) -> "Settings":
        """Prevent the documented development secret from being deployed."""

        if self.app_environment.lower() == "production":
            if self.jwt_secret_key == DEFAULT_DEVELOPMENT_SECRET or len(self.jwt_secret_key) < 32:
                raise ValueError(
                    "VENDORIQ_JWT_SECRET_KEY must be a unique value of at least 32 characters in production."
                )
        return self


settings = Settings()
