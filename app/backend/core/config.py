from __future__ import annotations

from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "EV Charging DSS"
    app_version: str = "0.2.0"

    database_url: str = Field(default="postgresql+asyncpg://postgres:postgres@db:5432/ev_charging")
    supabase_url: str = Field(default="")
    supabase_key: str = Field(default="")

    # NoDecode disables pydantic-settings' JSON pre-parsing so the validator
    # below can accept a plain comma-separated CORS_ORIGINS env value.
    cors_origins: Annotated[list[str], NoDecode] = [
        "http://localhost:5173",
        "http://localhost:3000",
    ]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_cors_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


settings = Settings()
