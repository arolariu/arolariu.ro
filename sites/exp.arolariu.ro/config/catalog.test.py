"""Unit tests for target config index behavior."""

import importlib

import config.catalog as catalog


def _reload_catalog_module():
    return importlib.reload(catalog)


class TestCatalogRefreshInterval:
    def test_uses_default_when_interval_is_invalid(self, monkeypatch):
        monkeypatch.setenv("EXP_CONFIG_REFRESH_INTERVAL_SECONDS", "invalid")
        module = _reload_catalog_module()

        assert module.get_target_index("api").refresh_interval_seconds == 300

    def test_uses_default_when_interval_is_non_positive(self, monkeypatch):
        monkeypatch.setenv("EXP_CONFIG_REFRESH_INTERVAL_SECONDS", "0")
        module = _reload_catalog_module()

        assert module.get_target_index("api").refresh_interval_seconds == 300

    def test_uses_configured_positive_interval(self, monkeypatch):
        monkeypatch.setenv("EXP_CONFIG_REFRESH_INTERVAL_SECONDS", "120")
        module = _reload_catalog_module()

        assert module.get_target_index("api").refresh_interval_seconds == 120


class TestCatalogContractVersion:
    def test_api_index_has_contract_version(self):
        index = catalog.get_target_index("api")
        assert index is not None
        assert index.contract_version == "1"

    def test_website_index_has_contract_version(self):
        index = catalog.get_target_index("website")
        assert index is not None
        assert index.contract_version == "1"


class TestCatalogFeatureIds:
    def test_website_index_has_expected_feature_ids(self):
        index = catalog.get_target_index("website")
        assert index is not None
        assert "website.commander.enabled" in index.feature_ids
        assert "website.web-vitals.enabled" in index.feature_ids

    def test_api_index_has_empty_feature_ids_by_default(self):
        index = catalog.get_target_index("api")
        assert index is not None
        assert index.feature_ids == ()

    def test_feature_ids_included_in_runtime_version_hash(self):
        from config.catalog import _build_index

        built_without = _build_index("t", build_time_required_keys=["k1"])
        built_with = _build_index("t", build_time_required_keys=["k1"], feature_ids=["feat.x"])
        assert built_without.runtime_version != built_with.runtime_version


class TestCatalogWebsiteIndexedKeys:
    def test_website_runtime_requires_auth_secret(self):
        index = catalog.get_target_index("website")
        assert index is not None
        assert "Auth:JWT:Secret" in index.runtime_required_keys

    def test_website_build_time_excludes_auth_secret(self):
        index = catalog.get_target_index("website")
        assert index is not None
        assert "Auth:JWT:Secret" not in index.build_time_keys

    def test_website_indexed_keys_include_resend_key(self):
        index = catalog.get_target_index("website")
        assert index is not None
        assert "Communication:Email:ApiKey" in index.indexed_keys


class TestConfigRegistry:
    def test_shared_auth_secret_is_registered_for_both_targets(self):
        definition = catalog.get_config_definition("Auth:JWT:Secret")

        assert definition is not None
        assert definition.available_for_targets == ("api", "website")
        assert "api.build-time" in definition.available_in_documents
        assert "website.run-time" in definition.required_in_documents

    def test_unique_endpoint_key_is_registered_for_website_only(self):
        definition = catalog.get_config_definition("Endpoint:Service:Api")

        assert definition is not None
        assert definition.available_for_targets == ("website",)
        assert definition.available_in_documents == ("website.build-time", "website.run-time")

    def test_refresh_interval_resolves_from_target_owners(self, monkeypatch):
        monkeypatch.setenv("EXP_CONFIG_REFRESH_INTERVAL_SECONDS", "180")
        module = _reload_catalog_module()

        assert module.get_refresh_interval_for_targets(("website",)) == 180
        assert module.get_refresh_interval_for_targets(("missing",)) == 300
