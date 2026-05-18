from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "EV Charging DSS"
    app_version: str = "0.1.0"

    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@db:5432/ev_charging"
    )
    supabase_url: str = Field(default="")
    supabase_key: str = Field(default="")
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]


settings = Settings()
