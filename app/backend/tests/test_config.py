"""Tests for Settings — environment-driven configuration.

Reference: Etap 6.7a — CORS_ORIGINS must be overridable for production deploy
(the Vercel domain is not known at code-writing time).
"""

from __future__ import annotations

import pytest

from core.config import Settings


class TestCorsOrigins:
    """CORS allow-list must be configurable through the CORS_ORIGINS env var."""

    def test_cors_origins_defaults_to_localhost_when_env_absent(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Without CORS_ORIGINS the default localhost pair is used."""
        monkeypatch.delenv("CORS_ORIGINS", raising=False)
        settings = Settings(_env_file=None)
        assert settings.cors_origins == [
            "http://localhost:5173",
            "http://localhost:3000",
        ]

    def test_cors_origins_parses_comma_separated_env(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """A comma-separated CORS_ORIGINS string is split into a list.

        Production deploy sets CORS_ORIGINS to the Vercel domain; a plain
        comma-separated string is more ergonomic than JSON in an env var.
        """
        monkeypatch.setenv(
            "CORS_ORIGINS",
            "https://app.vercel.app,https://staging.vercel.app",
        )
        settings = Settings(_env_file=None)
        assert settings.cors_origins == [
            "https://app.vercel.app",
            "https://staging.vercel.app",
        ]

    def test_cors_origins_trims_whitespace_around_entries(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Spaces after commas must not leak into the parsed origins."""
        monkeypatch.setenv("CORS_ORIGINS", "https://a.com , https://b.com ,https://c.com")
        settings = Settings(_env_file=None)
        assert settings.cors_origins == [
            "https://a.com",
            "https://b.com",
            "https://c.com",
        ]


class TestAppVersion:
    """app_version tracks the released milestone."""

    def test_app_version_is_0_2_0(self) -> None:
        """Frontend MVP (Etap 6) complete → minor bump to 0.2.0."""
        assert Settings(_env_file=None).app_version == "0.2.0"
