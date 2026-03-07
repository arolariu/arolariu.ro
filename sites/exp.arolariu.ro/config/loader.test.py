"""Tests for config_loader module."""

import json
from datetime import datetime, timezone

import pytest


@pytest.fixture(autouse=True)
def reset_config():
    """Reset global config between tests."""
    import config.loader as config_loader
    config_loader._config = {}
    config_loader._loaded = False
    config_loader._last_loaded_at = None
    config_loader._last_loaded_at_utc = None
    config_loader._load_count = 0
    yield
    config_loader._config = {}
    config_loader._loaded = False
    config_loader._last_loaded_at = None
    config_loader._last_loaded_at_utc = None
    config_loader._load_count = 0


class TestGetConfigValue:
    def test_returns_value_for_existing_key(self):
        import config.loader as config_loader
        config_loader._config = {"test:key": "test-value"}
        config_loader._loaded = True
        from config.loader import get_config_value
        assert get_config_value("test:key") == "test-value"

    def test_returns_none_for_missing_key(self):
        import config.loader as config_loader
        config_loader._config = {"test:key": "test-value"}
        config_loader._loaded = True
        from config.loader import get_config_value
        assert get_config_value("missing:key") is None


class TestGetConfigSection:
    def test_returns_matching_keys(self):
        import config.loader as config_loader
        config_loader._config = {
            "Endpoints:Storage": "http://storage",
            "Endpoints:SQL": "http://sql",
            "Common:Auth": "secret",
        }
        config_loader._loaded = True
        from config.loader import get_config_section
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

        from config.loader import _load_local_config

        result = _load_local_config()
        assert result["Common:Auth:Issuer"] == "https://example.test"

    def test_loads_default_service_root_config_when_override_is_not_set(self, tmp_path, monkeypatch):
        config_path = tmp_path / "config.json"
        config_path.write_text(json.dumps({"Endpoints:Api": "http://exp"}), encoding="utf-8")
        monkeypatch.delenv("EXP_LOCAL_CONFIG_PATH", raising=False)

        import config.loader as config_loader

        monkeypatch.setattr(config_loader, "_service_root", lambda: tmp_path)

        result = config_loader._load_local_config()
        assert result["Endpoints:Api"] == "http://exp"

    def test_returns_empty_dict_for_malformed_json(self, tmp_path, monkeypatch):
        config_path = tmp_path / "broken-config.json"
        config_path.write_text("{ invalid json", encoding="utf-8")
        monkeypatch.setenv("EXP_LOCAL_CONFIG_PATH", str(config_path))

        from config.loader import _load_local_config

        assert _load_local_config() == {}

    def test_returns_empty_dict_for_non_object_payload(self, tmp_path, monkeypatch):
        config_path = tmp_path / "array-config.json"
        config_path.write_text(json.dumps(["not", "an", "object"]), encoding="utf-8")
        monkeypatch.setenv("EXP_LOCAL_CONFIG_PATH", str(config_path))

        from config.loader import _load_local_config

        assert _load_local_config() == {}

    def test_normalizes_local_config_values_to_strings(self, tmp_path, monkeypatch):
        config_path = tmp_path / "typed-config.json"
        payload = {"Feature:Enabled": True, "Feature:Limit": 5}
        config_path.write_text(json.dumps(payload), encoding="utf-8")
        monkeypatch.setenv("EXP_LOCAL_CONFIG_PATH", str(config_path))

        from config.loader import _load_local_config

        result = _load_local_config()
        assert result["Feature:Enabled"] == "True"
        assert result["Feature:Limit"] == "5"


class TestRefreshInterval:
    def test_is_refresh_due_when_interval_elapsed(self, monkeypatch):
        import config.loader as config_loader
        monkeypatch.setenv("EXP_CONFIG_REFRESH_INTERVAL_SECONDS", "10")
        config_loader._loaded = True
        config_loader._last_loaded_at = 0.0

        assert config_loader._is_refresh_due(current_time=11.0) is True

    def test_is_not_due_when_interval_disabled(self, monkeypatch):
        import config.loader as config_loader
        monkeypatch.setenv("EXP_CONFIG_REFRESH_INTERVAL_SECONDS", "0")
        config_loader._loaded = True
        config_loader._last_loaded_at = 0.0

        assert config_loader._is_refresh_due(current_time=100.0) is False

    def test_get_config_triggers_refresh_when_due(self, monkeypatch):
        import config.loader as config_loader

        config_loader._config = {"x": "1"}
        config_loader._loaded = True
        config_loader._last_loaded_at = 0.0
        monkeypatch.setenv("EXP_CONFIG_REFRESH_INTERVAL_SECONDS", "10")
        monkeypatch.setattr(config_loader, "_load_local_config", lambda: {"x": "2"})
        monkeypatch.setattr(config_loader, "_is_refresh_due", lambda current_time=None: True)
        monkeypatch.setenv("INFRA", "local")

        result = config_loader.get_config()
        assert result["x"] == "2"


class TestConfigStats:
    def test_returns_current_snapshot_metadata(self):
        import config.loader as config_loader

        config_loader._config = {"Endpoints:Api": "https://localhost:5000"}
        config_loader._loaded = True
        config_loader._load_count = 2
        config_loader._last_loaded_at_utc = datetime(2026, 3, 7, tzinfo=timezone.utc)

        result = config_loader.get_config_stats()

        assert result.keys_loaded == 1
        assert result.load_count == 2
        assert result.last_loaded_at == "2026-03-07T00:00:00+00:00"


class TestExtractFeatures:
    def test_defaults_to_false_for_unknown_feature(self):
        from config.loader import extract_features

        result = extract_features({}, ["some.flag"])
        assert result == {"some.flag": False}

    def test_reads_feature_management_key_true(self):
        from config.loader import extract_features

        config = {"FeatureManagement:my.flag": "true"}
        result = extract_features(config, ["my.flag"])
        assert result["my.flag"] is True

    def test_reads_feature_management_key_false(self):
        from config.loader import extract_features

        config = {"FeatureManagement:my.flag": "False"}
        result = extract_features(config, ["my.flag"])
        assert result["my.flag"] is False

    def test_reads_feature_management_numeric_one(self):
        from config.loader import extract_features

        config = {"FeatureManagement:my.flag": "1"}
        result = extract_features(config, ["my.flag"])
        assert result["my.flag"] is True

    def test_reads_feature_management_numeric_zero(self):
        from config.loader import extract_features

        config = {"FeatureManagement:my.flag": "0"}
        result = extract_features(config, ["my.flag"])
        assert result["my.flag"] is False

    def test_reads_appconfig_featureflag_json_enabled(self):
        from config.loader import extract_features

        payload = json.dumps({"id": "my.flag", "enabled": True})
        config = {".appconfig.featureflag/my.flag": payload}
        result = extract_features(config, ["my.flag"])
        assert result["my.flag"] is True

    def test_reads_appconfig_featureflag_json_disabled(self):
        from config.loader import extract_features

        payload = json.dumps({"id": "my.flag", "enabled": False})
        config = {".appconfig.featureflag/my.flag": payload}
        result = extract_features(config, ["my.flag"])
        assert result["my.flag"] is False

    def test_feature_management_takes_precedence_over_appconfig(self):
        from config.loader import extract_features

        # FeatureManagement key says True; appconfig payload says False
        payload = json.dumps({"enabled": False})
        config = {
            "FeatureManagement:my.flag": "true",
            ".appconfig.featureflag/my.flag": payload,
        }
        result = extract_features(config, ["my.flag"])
        assert result["my.flag"] is True

    def test_unrecognised_feature_management_value_defaults_false(self):
        from config.loader import extract_features

        config = {"FeatureManagement:my.flag": "maybe"}
        result = extract_features(config, ["my.flag"])
        assert result["my.flag"] is False

    def test_invalid_json_appconfig_defaults_false(self):
        from config.loader import extract_features

        config = {".appconfig.featureflag/my.flag": "not-json"}
        result = extract_features(config, ["my.flag"])
        assert result["my.flag"] is False

    def test_returns_all_requested_ids(self):
        from config.loader import extract_features

        config = {"FeatureManagement:a": "true"}
        result = extract_features(config, ["a", "b", "c"])
        assert set(result.keys()) == {"a", "b", "c"}
        assert result["a"] is True
        assert result["b"] is False
        assert result["c"] is False
