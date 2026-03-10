"""Shared pytest fixtures for exp.arolariu.ro tests."""

from __future__ import annotations

from collections.abc import Iterator
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from runtime.metrics import reset_metrics
from telemetry.bootstrap import reset_telemetry_state


@pytest.fixture(autouse=True)
def base_env(monkeypatch: pytest.MonkeyPatch) -> None:
    """Reset environment defaults so each test starts in deterministic local mode."""

    reset_metrics()
    reset_telemetry_state()
    monkeypatch.setenv("INFRA", "local")
    monkeypatch.setenv("EXP_OTEL_ENABLED", "false")
    monkeypatch.delenv("EXP_CALLER_API_IDS", raising=False)
    monkeypatch.delenv("EXP_CALLER_WEBSITE_IDS", raising=False)
    monkeypatch.delenv("EXP_LOCAL_SHARED_TOKEN", raising=False)


@pytest.fixture
def client() -> Iterator[TestClient]:
    """Create a test client with startup configuration loading suppressed."""

    with patch("main.load_config"):
        from main import app

        with TestClient(app) as test_client:
            yield test_client
