"""Unit tests for catalog metadata behavior."""

import importlib

import catalog


def _reload_catalog_module():
    return importlib.reload(catalog)


class TestCatalogRefreshInterval:
    def test_uses_default_when_interval_is_invalid(self, monkeypatch):
        monkeypatch.setenv("EXP_CONFIG_REFRESH_INTERVAL_SECONDS", "invalid")
        module = _reload_catalog_module()

        assert module.get_catalog("api").refreshIntervalSeconds == 300

    def test_uses_default_when_interval_is_non_positive(self, monkeypatch):
        monkeypatch.setenv("EXP_CONFIG_REFRESH_INTERVAL_SECONDS", "0")
        module = _reload_catalog_module()

        assert module.get_catalog("api").refreshIntervalSeconds == 300

    def test_uses_configured_positive_interval(self, monkeypatch):
        monkeypatch.setenv("EXP_CONFIG_REFRESH_INTERVAL_SECONDS", "120")
        module = _reload_catalog_module()

        assert module.get_catalog("api").refreshIntervalSeconds == 120
