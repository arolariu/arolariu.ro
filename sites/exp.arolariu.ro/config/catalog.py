"""Central target indexes and single-config registry for exp configuration contracts.

The module exposes two related concepts:

1. Target indexes for the build-time and run-time endpoints.
2. A config registry describing every individual key that the `/api/v1/config`
   endpoint is allowed to serve.

Both structures are derived from one source of truth so the endpoint behavior,
documentation, and authorization rules stay aligned.
"""

from __future__ import annotations

import hashlib
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import Final, TypeAlias

from config.settings import DEFAULT_REFRESH_INTERVAL_SECONDS, get_refresh_interval_seconds

ConfigKeys: TypeAlias = tuple[str, ...]
ConfigSnapshot: TypeAlias = Mapping[str, str]
DocumentNames: TypeAlias = tuple[str, ...]


@dataclass(frozen=True, slots=True)
class ConfigKeyDocumentation:
    """Human-readable metadata for a single configuration key."""

    description: str
    usage: str


@dataclass(frozen=True, slots=True)
class ConfigResolutionResult:
    """Represents the resolved values for a target document request."""

    missing_required_keys: tuple[str, ...]
    config: dict[str, str]


@dataclass(frozen=True, slots=True)
class ConfigValueDefinition:
    """Describes one configuration key exposed by ``GET /api/v1/config``."""

    name: str
    available_for_targets: tuple[str, ...]
    available_in_documents: DocumentNames
    required_in_documents: DocumentNames
    description: str
    usage: str


@dataclass(frozen=True, slots=True)
class ConfigValueResolution:
    """Represents the resolved value for a single configuration key."""

    definition: ConfigValueDefinition
    value: str
    is_missing_required: bool


@dataclass(frozen=True, slots=True)
class TargetConfigIndex:
    """Describes the indexed config documents for one exp consumer target."""

    target: str
    build_time_required_keys: ConfigKeys
    build_time_optional_keys: ConfigKeys
    runtime_required_keys: ConfigKeys
    runtime_optional_keys: ConfigKeys
    feature_ids: ConfigKeys
    refresh_interval_seconds: int
    contract_version: str = "1"

    @property
    def build_time_keys(self) -> ConfigKeys:
        """Return the build-time config keys in stable order."""

        return _dedupe(self.build_time_required_keys + self.build_time_optional_keys)

    @property
    def runtime_keys(self) -> ConfigKeys:
        """Return the run-time config keys in stable order."""

        return _dedupe(self.runtime_required_keys + self.runtime_optional_keys)

    @property
    def indexed_keys(self) -> ConfigKeys:
        """Return every config key indexed for this target."""

        return _dedupe(self.build_time_keys + self.runtime_keys)

    @property
    def build_time_version(self) -> str:
        """Return the version hash for the build-time config document."""

        return _document_version(self.target, "build-time", *self.build_time_keys)

    @property
    def runtime_version(self) -> str:
        """Return the version hash for the run-time config plus feature document."""

        return _document_version(self.target, "run-time", *self.runtime_keys, *self.feature_ids)


def _document_version(*entries: str) -> str:
    """Compute a deterministic document version hash from index content."""

    version_payload = "|".join(sorted(entries))
    return hashlib.sha256(version_payload.encode("utf-8")).hexdigest()[:12]


def _dedupe(keys: ConfigKeys) -> ConfigKeys:
    """Return keys in first-seen order without duplicates."""

    return tuple(dict.fromkeys(keys))


def _document_name(target: str, stage: str) -> str:
    """Return a stable document identifier used in metadata and docs."""

    return f"{target}.{stage}"


def _build_index(
    target: str,
    *,
    build_time_required_keys: Sequence[str],
    build_time_optional_keys: Sequence[str] | None = None,
    runtime_required_keys: Sequence[str] | None = None,
    runtime_optional_keys: Sequence[str] | None = None,
    feature_ids: Sequence[str] | None = None,
) -> TargetConfigIndex:
    """Build a target configuration index instance."""

    return TargetConfigIndex(
        target=target,
        build_time_required_keys=tuple(build_time_required_keys),
        build_time_optional_keys=tuple(build_time_optional_keys or []),
        runtime_required_keys=tuple(runtime_required_keys or build_time_required_keys),
        runtime_optional_keys=tuple(runtime_optional_keys or []),
        feature_ids=tuple(feature_ids or []),
        refresh_interval_seconds=get_refresh_interval_seconds(),
    )


_TARGET_INDEXES: Final[dict[str, TargetConfigIndex]] = {
    "api": _build_index(
        target="api",
        build_time_required_keys=[
            "Auth:JWT:Secret",
            "Auth:JWT:Issuer",
            "Auth:JWT:Audience",
            "Identity:Tenant:Id",
            "AI:OpenAI:Endpoint",
            "Database:SQL:ConnectionString",
            "Database:NoSQL:ConnectionString",
            "Storage:Blob:Endpoint",
            "Observability:Telemetry:Endpoint",
            "AI:OCR:Endpoint",
            "AI:OCR:Key",
        ],
    ),
    "website": _build_index(
        target="website",
        build_time_required_keys=[
            "Storage:Blob:Endpoint",
            "Auth:JWT:Issuer",
            "Auth:JWT:Audience",
            "Service:Api:Url",
        ],
        runtime_required_keys=[
            "Storage:Blob:Endpoint",
            "Auth:JWT:Issuer",
            "Auth:JWT:Audience",
            "Auth:JWT:Secret",
            "Service:Api:Url",
        ],
        runtime_optional_keys=[
            "Communication:Email:ApiKey",
        ],
        feature_ids=[
            "website.commander.enabled",
            "website.web-vitals.enabled",
        ],
    ),
}

_CONFIG_KEY_DOCUMENTATION: Final[dict[str, ConfigKeyDocumentation]] = {
    "AI:OCR:Endpoint": ConfigKeyDocumentation(
        description="OCR endpoint used by API document analysis and enrichment flows.",
        usage=(
            "API-only. Keep this endpoint inside the backend boundary and pair "
            "it with managed identity or the documented key when required."
        ),
    ),
    "AI:OCR:Key": ConfigKeyDocumentation(
        description="Credential for API integrations that still require an OCR service key.",
        usage=(
            "API-only and server-only. Prefer managed identity when supported, "
            "and never expose or log this secret value."
        ),
    ),
    "AI:OpenAI:Endpoint": ConfigKeyDocumentation(
        description="OpenAI endpoint used by API analysis and classification brokers.",
        usage="API-only. Use from backend broker code and keep AI endpoint resolution out of client-facing surfaces.",
    ),
    "Auth:JWT:Audience": ConfigKeyDocumentation(
        description="JWT audience used by both API and website server-side auth flows.",
        usage=(
            "Server-only authentication input. Keep API and website auth "
            "validation logic aligned to this audience string."
        ),
    ),
    "Auth:JWT:Issuer": ConfigKeyDocumentation(
        description="JWT issuer used by both API and website server-side auth flows.",
        usage=(
            "Server-only authentication input. Use this value whenever tokens "
            "are minted or validated across the platform."
        ),
    ),
    "Auth:JWT:Secret": ConfigKeyDocumentation(
        description="JWT signing secret shared by the API and by the website's server-side token bridge.",
        usage="Strictly server-only. Never log, serialize, or expose this value to the browser or client-side bundles.",
    ),
    "Communication:Email:ApiKey": ConfigKeyDocumentation(
        description="Optional email API key used by website server-side email features.",
        usage="Website run-time only. Empty string means email delivery is intentionally disabled.",
    ),
    "Database:NoSQL:ConnectionString": ConfigKeyDocumentation(
        description="NoSQL database connection string used by the API invoice document store.",
        usage="API-only and server-only. Treat the value as secret infrastructure configuration.",
    ),
    "Database:SQL:ConnectionString": ConfigKeyDocumentation(
        description="SQL database connection string used by the API authentication and relational storage flows.",
        usage="API-only and server-only. Treat the value as secret infrastructure configuration.",
    ),
    "Identity:Tenant:Id": ConfigKeyDocumentation(
        description="Identity tenant identifier used by API cloud integrations.",
        usage=(
            "API-only. Required when the backend resolves cloud resources or "
            "validates tenant-bound managed identity flows."
        ),
    ),
    "Observability:Telemetry:Endpoint": ConfigKeyDocumentation(
        description="Telemetry endpoint used by the API observability exporters.",
        usage="API-only. Feed this value into telemetry configuration, not into business logic.",
    ),
    "Service:Api:Url": ConfigKeyDocumentation(
        description="Base URL of the backend API that the website calls from server-only code.",
        usage=(
            "Website-only. Use this value for server-to-server fetches instead "
            "of hard-coding environment-specific API URLs."
        ),
    ),
    "Storage:Blob:Endpoint": ConfigKeyDocumentation(
        description=(
            "Blob storage endpoint used by both API and website for persisted "
            "binary assets and server-side storage helpers."
        ),
        usage=(
            "Safe for server-side rendering and upload helpers, "
            "but do not expose raw storage clients to browser code."
        ),
    ),
}


def _build_config_registry() -> dict[str, ConfigValueDefinition]:
    """Build the single-config registry derived from target indexes plus docs."""

    registry_builder: dict[str, dict[str, set[str]]] = {}

    def register(keys: ConfigKeys, *, target: str, stage: str, required: bool) -> None:
        document_name = _document_name(target, stage)
        for key in keys:
            entry = registry_builder.setdefault(
                key,
                {
                    "targets": set(),
                    "documents": set(),
                    "required_documents": set(),
                },
            )
            entry["targets"].add(target)
            entry["documents"].add(document_name)
            if required:
                entry["required_documents"].add(document_name)

    for target, index in _TARGET_INDEXES.items():
        register(index.build_time_required_keys, target=target, stage="build-time", required=True)
        register(index.build_time_optional_keys, target=target, stage="build-time", required=False)
        register(index.runtime_required_keys, target=target, stage="run-time", required=True)
        register(index.runtime_optional_keys, target=target, stage="run-time", required=False)

    registry: dict[str, ConfigValueDefinition] = {}
    for key, entry in registry_builder.items():
        docs = _CONFIG_KEY_DOCUMENTATION.get(
            key,
            ConfigKeyDocumentation(
                description="Platform configuration value served by exp.",
                usage="Use this value from server-only code that owns the corresponding integration boundary.",
            ),
        )
        registry[key] = ConfigValueDefinition(
            name=key,
            available_for_targets=tuple(sorted(entry["targets"])),
            available_in_documents=tuple(sorted(entry["documents"])),
            required_in_documents=tuple(sorted(entry["required_documents"])),
            description=docs.description,
            usage=docs.usage,
        )

    return registry


_CONFIG_REGISTRY: Final[dict[str, ConfigValueDefinition]] = _build_config_registry()


def get_target_index(target: str) -> TargetConfigIndex | None:
    """Return the indexed configuration document definition for a target."""

    return _TARGET_INDEXES.get(target.lower())


def get_config_definition(name: str) -> ConfigValueDefinition | None:
    """Return metadata for a single configuration key served by ``/api/v1/config``."""

    return _CONFIG_REGISTRY.get(name)


def get_config_registry() -> dict[str, ConfigValueDefinition]:
    """Return a shallow copy of the complete single-config registry."""

    return dict(_CONFIG_REGISTRY)


def get_refresh_interval_for_targets(targets: Sequence[str]) -> int:
    """Return the maximum refresh interval declared by the supplied targets."""

    intervals = [
        index.refresh_interval_seconds
        for target in targets
        if (index := get_target_index(target)) is not None
    ]
    return max(intervals, default=DEFAULT_REFRESH_INTERVAL_SECONDS)


def _resolve_config_snapshot(
    config_snapshot: ConfigSnapshot,
    required_keys: ConfigKeys,
    optional_keys: ConfigKeys,
) -> ConfigResolutionResult:
    """Resolve indexed config values and report any missing required keys."""

    missing_required_keys = tuple(
        sorted(
            key
            for key in required_keys
            if config_snapshot.get(key) is None
        )
    )

    resolved_config = {
        key: config_snapshot.get(key, "")
        for key in _dedupe(required_keys + optional_keys)
    }

    return ConfigResolutionResult(missing_required_keys=missing_required_keys, config=resolved_config)


def resolve_build_time_config(
    index: TargetConfigIndex,
    config_snapshot: ConfigSnapshot,
) -> ConfigResolutionResult:
    """Resolve build-time config values for the provided target index."""

    return _resolve_config_snapshot(
        config_snapshot,
        index.build_time_required_keys,
        index.build_time_optional_keys,
    )


def resolve_runtime_config(
    index: TargetConfigIndex,
    config_snapshot: ConfigSnapshot,
) -> ConfigResolutionResult:
    """Resolve run-time config values for the provided target index."""

    return _resolve_config_snapshot(
        config_snapshot,
        index.runtime_required_keys,
        index.runtime_optional_keys,
    )


def resolve_config_value(
    definition: ConfigValueDefinition,
    config_snapshot: ConfigSnapshot,
) -> ConfigValueResolution:
    """Resolve one indexed configuration value from the current config snapshot."""

    value = config_snapshot.get(definition.name)
    is_missing_required = value is None and bool(definition.required_in_documents)
    return ConfigValueResolution(
        definition=definition,
        value=value if value is not None else "",
        is_missing_required=is_missing_required,
    )
