"""Regression tests for api/deps.get_db transaction handling.

Before the auto-commit fix, POST endpoints flushed but never committed, so the
next HTTP request would not see persisted rows.  These tests pin the
commit-on-success and rollback-on-exception branches so the regression cannot
silently come back.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from unittest.mock import AsyncMock

import pytest

from api import deps


@asynccontextmanager
async def _fake_session_factory(mock_session: AsyncMock):
    yield mock_session


async def test_get_db_commits_on_clean_yield(monkeypatch: pytest.MonkeyPatch) -> None:
    """get_db must call session.commit() when the dependency body finishes cleanly."""
    mock_session = AsyncMock()
    monkeypatch.setattr(deps, "AsyncSessionLocal", lambda: _fake_session_factory(mock_session))

    async for session in deps.get_db():
        assert session is mock_session

    mock_session.commit.assert_awaited_once()
    mock_session.rollback.assert_not_awaited()


async def test_get_db_rolls_back_on_exception(monkeypatch: pytest.MonkeyPatch) -> None:
    """get_db must call session.rollback() when the dependency body raises.

    FastAPI invokes `agen.athrow(exc)` on dependency generators when the
    request handler raises — replicating that contract here.
    """
    mock_session = AsyncMock()
    monkeypatch.setattr(deps, "AsyncSessionLocal", lambda: _fake_session_factory(mock_session))

    agen = deps.get_db()
    session = await agen.__anext__()
    assert session is mock_session

    with pytest.raises(RuntimeError, match="boom"):
        await agen.athrow(RuntimeError("boom"))

    mock_session.rollback.assert_awaited_once()
    mock_session.commit.assert_not_awaited()
