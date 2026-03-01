"""Tests for config_loader module."""

import json
import pytest


@pytest.fixture(autouse=True)
def reset_config():
    """Reset global config between tests."""
    import config_loader
    config_loader._config = {}
    yield
    config_loader._config = {}


class TestGetConfigValue:
    def test_returns_value_for_existing_key(self):
        import config_loader
        config_loader._config = {"test:key": "test-value"}
        from config_loader import get_config_value
        assert get_config_value("test:key") == "test-value"

    def test_returns_none_for_missing_key(self):
        import config_loader
        config_loader._config = {"test:key": "test-value"}
        from config_loader import get_config_value
        assert get_config_value("missing:key") is None


class TestGetConfigSection:
    def test_returns_matching_keys(self):
        import config_loader
        config_loader._config = {
            "Endpoints:Storage": "http://storage",
            "Endpoints:SQL": "http://sql",
            "Common:Auth": "secret",
        }
        from config_loader import get_config_section
        result = get_config_section("Endpoints")
        assert len(result) == 2
        assert "Endpoints:Storage" in result
        assert "Endpoints:SQL" in result
        assert "Common:Auth" not in result
