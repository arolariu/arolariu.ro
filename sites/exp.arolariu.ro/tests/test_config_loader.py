"""Tests for config_loader module."""

import json
import pytest


@pytest.fixture(autouse=True)
def reset_config():
    """Reset global config between tests."""
    import config_loader
    config_loader._config = {}
    config_loader._loaded = False
    yield
    config_loader._config = {}
    config_loader._loaded = False


class TestGetConfigValue:
    def test_returns_value_for_existing_key(self):
        import config_loader
        config_loader._config = {"test:key": "test-value"}
        config_loader._loaded = True
        from config_loader import get_config_value
        assert get_config_value("test:key") == "test-value"

    def test_returns_none_for_missing_key(self):
        import config_loader
        config_loader._config = {"test:key": "test-value"}
        config_loader._loaded = True
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
        config_loader._loaded = True
        from config_loader import get_config_section
        result = get_config_section("Endpoints")
        assert len(result) == 2
        assert "Endpoints:Storage" in result
        assert "Endpoints:SQL" in result
        assert "Common:Auth" not in result


class TestLoadLocalConfig:
    def test_loads_explicit_local_config_path(self, tmp_path, monkeypatch):
        config_path = tmp_path / "local-config.json"
        payload = {"Common:Auth:Issuer": "https://example.test"}
        config_path.write_text(json.dumps(payload), encoding="utf-8")

        monkeypatch.setenv("EXP_LOCAL_CONFIG_PATH", str(config_path))

        from config_loader import _load_local_config

        result = _load_local_config()
        assert result["Common:Auth:Issuer"] == "https://example.test"

    def test_returns_empty_dict_for_malformed_json(self, tmp_path, monkeypatch):
        config_path = tmp_path / "broken-config.json"
        config_path.write_text("{ invalid json", encoding="utf-8")
        monkeypatch.setenv("EXP_LOCAL_CONFIG_PATH", str(config_path))

        from config_loader import _load_local_config

        assert _load_local_config() == {}

    def test_returns_empty_dict_for_non_object_payload(self, tmp_path, monkeypatch):
        config_path = tmp_path / "array-config.json"
        config_path.write_text(json.dumps(["not", "an", "object"]), encoding="utf-8")
        monkeypatch.setenv("EXP_LOCAL_CONFIG_PATH", str(config_path))

        from config_loader import _load_local_config

        assert _load_local_config() == {}

    def test_normalizes_local_config_values_to_strings(self, tmp_path, monkeypatch):
        config_path = tmp_path / "typed-config.json"
        payload = {"Feature:Enabled": True, "Feature:Limit": 5}
        config_path.write_text(json.dumps(payload), encoding="utf-8")
        monkeypatch.setenv("EXP_LOCAL_CONFIG_PATH", str(config_path))

        from config_loader import _load_local_config

        result = _load_local_config()
        assert result["Feature:Enabled"] == "True"
        assert result["Feature:Limit"] == "5"
