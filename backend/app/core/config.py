"""
Central configuration for the app.
All values can be overridden by environment variables (see .env.example).
Using pydantic-settings means values are validated and typed automatically.
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # --- General ---
    PROJECT_NAME: str = "VendorIQ - Vendor Reliability Intelligence Platform"
    API_V1_PREFIX: str = "/api/v1"

    # --- Database ---
    # Default points to the "postgres" service name used in docker-compose.yml
    DATABASE_URL: str = "postgresql+psycopg2://vendoriq:vendoriq@postgres:5432/vendoriq"

    # --- Redis (used later for caching / Celery background jobs) ---
    REDIS_URL: str = "redis://redis:6379/0"

    # --- JWT Auth ---
    # Required: never run with a known signing secret.
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8  # 8 hours

    # --- CORS: which frontend origins are allowed to call this API ---
    # Covers common ways of serving the plain HTML/CSS/JS frontend locally:
    # `python -m http.server`, VS Code "Live Server", etc.
    CORS_ORIGINS: list[str] = [
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5000",
        "http://127.0.0.1:5000",
    ]

    class Config:
        env_file = ".env"


settings = Settings()
