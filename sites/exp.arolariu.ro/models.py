"""Typed request and response contracts exposed by exp.arolariu.ro.

The service intentionally models API and website payloads separately so each
consumer receives a documented contract that matches its own build-time and
run-time needs. The `/api/v1/config` endpoint uses a dedicated single-config
response model because it serves one indexed value at a time instead of an
entire target document.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ExpModel(BaseModel):
    """Base model configuration shared across immutable exp payload contracts."""

    model_config = ConfigDict(
        extra="forbid",
        frozen=True,
        populate_by_name=True,
        serialize_by_alias=True,
    )


class ErrorResponse(ExpModel):
    """Represents a standardized error payload returned by exp endpoints."""

    error: str = Field(description="Human-readable error message.")
    deniedKeys: list[str] | None = Field(default=None, description="Reserved denied-key metadata.")
    invalidKeys: list[str] | None = Field(default=None, description="Reserved invalid-key metadata.")
    missingRequiredKeys: list[str] | None = Field(
        default=None,
        description="Required configuration keys that could not be resolved.",
    )


class HealthResponse(ExpModel):
    """Represents a liveness response payload enriched with process diagnostics."""

    status: str = Field(description="Health classification for the current probe.")
    environment: str = Field(description="Infrastructure mode resolved from INFRA.")
    timestamp: str = Field(description="UTC timestamp for when the probe result was generated.")
    startedAt: str = Field(description="UTC timestamp for when the current microservice process started.")
    uptimeSeconds: float = Field(description="Observed process uptime in seconds for the current worker.")
    hostname: str = Field(description="Hostname of the container or machine serving the request.")
    processId: int = Field(description="Operating-system process identifier of the current worker.")
    requestsServed: int = Field(description="Number of HTTP requests observed by the current process lifetime.")
    requestsByPath: dict[str, int] = Field(
        default_factory=dict,
        description="Count of observed HTTP requests grouped by request path.",
    )
    configKeysLoaded: int = Field(description="Number of configuration keys currently held in the in-memory snapshot.")
    configLoadCount: int = Field(description="Number of times the in-memory configuration snapshot has been loaded.")
    lastConfigLoadedAt: str | None = Field(
        default=None,
        description="UTC timestamp for the last successful configuration snapshot load.",
    )
    configResponsesServed: int = Field(
        description="Number of successful build-time, run-time, or single-key config responses served by this process.",
    )
    configValuesServed: int = Field(
        description="Total number of configuration values returned across all successful config-serving responses.",
    )
    configResponsesByEndpoint: dict[str, int] = Field(
        default_factory=dict,
        description="Successful configuration responses grouped by endpoint category.",
    )
    configResponsesByTarget: dict[str, int] = Field(
        default_factory=dict,
        description="Successful configuration responses grouped by resolved consumer target.",
    )
    configResponsesByCaller: dict[str, int] = Field(
        default_factory=dict,
        description="Successful configuration responses grouped by caller identity or local consumer label.",
    )
    configValuesByTarget: dict[str, int] = Field(
        default_factory=dict,
        description="Returned configuration value counts grouped by resolved consumer target.",
    )
    configValuesByCaller: dict[str, int] = Field(
        default_factory=dict,
        description="Returned configuration value counts grouped by caller identity or local consumer label.",
    )
    configValuesByName: dict[str, int] = Field(
        default_factory=dict,
        description="Returned configuration value counts grouped by configuration key name.",
    )
    lastConfigServedAt: str | None = Field(
        default=None,
        description="UTC timestamp for the most recent successful config-serving response.",
    )


class ReadyResponse(HealthResponse):
    """Represents a readiness response payload."""

    keysLoaded: int = Field(default=0, description="Number of configuration keys currently loaded.")


class ApiBuildTimeConfig(ExpModel):
    """Configuration values required to boot the API service and schedule refreshes.

    Every field in this model is server-only. The API uses these values to wire
    authentication, dependency endpoints, and data-store connectivity.
    """

    jwt_secret: str = Field(
        alias="Auth:JWT:Secret",
        description="HS256 signing secret used by the API authentication flow. Never expose or log this value.",
    )
    jwt_issuer: str = Field(
        alias="Auth:JWT:Issuer",
        description="JWT issuer URI used when the API validates and issues tokens.",
    )
    jwt_audience: str = Field(
        alias="Auth:JWT:Audience",
        description="JWT audience identifier expected by the API authentication pipeline.",
    )
    azure_tenant_id: str = Field(
        alias="Identity:Tenant:Id",
        description="Identity tenant identifier used by cloud-dependent API integrations.",
    )
    open_ai_endpoint: str = Field(
        alias="Endpoint:AI:OpenAI",
        description="OpenAI endpoint under the Endpoint hierarchy, used by invoice analysis and classifier brokers.",
    )
    sql_server_connection_string: str = Field(
        alias="Endpoint:Database:SQL",
        description=(
            "SQL database endpoint under the Endpoint hierarchy, "
            "used by the API authentication and relational data flows."
        ),
    )
    no_sql_server_connection_string: str = Field(
        alias="Endpoint:Database:NoSQL",
        description="NoSQL database endpoint under the Endpoint hierarchy, used by invoice document storage flows.",
    )
    storage_account_endpoint: str = Field(
        alias="Endpoint:Storage:Blob",
        description=(
            "Blob storage endpoint under the Endpoint hierarchy, "
            "used for invoice scans and other persisted binary assets."
        ),
    )
    application_insights_endpoint: str = Field(
        alias="Endpoint:Observability:Telemetry",
        description="Telemetry endpoint under the Endpoint hierarchy, used by observability exporters.",
    )
    cognitive_services_endpoint: str = Field(
        alias="Endpoint:AI:OCR",
        description=(
            "OCR endpoint under the Endpoint hierarchy, "
            "used by document analysis and related enrichment flows."
        ),
    )
    cognitive_services_key: str = Field(
        alias="Endpoint:AI:OCR:Key",
        description=(
            "Credential under the Endpoint hierarchy, used by the API "
            "when an OCR integration still requires a key."
        ),
    )


class ApiRunTimeConfig(ApiBuildTimeConfig):
    """Configuration values used by the API during background refresh and request handling.

    The API currently requires the same key set at build-time and at run-time,
    but the separate model keeps the contract explicit and leaves room for
    future divergence without changing consumer semantics.
    """


class WebsiteBuildTimeConfig(ExpModel):
    """Configuration values needed to build and boot the website server runtime.

    These values are safe for server-side website bootstrap, but they do not
    include website-only secrets that must stay out of build-time payloads.
    """

    storage_account_endpoint: str = Field(
        alias="Endpoint:Storage:Blob",
        description=(
            "Blob storage endpoint under the Endpoint hierarchy, "
            "used by server-side upload helpers and storage clients."
        ),
    )
    jwt_issuer: str = Field(
        alias="Auth:JWT:Issuer",
        description="Issuer value used when the website validates BFF-authored JWTs.",
    )
    jwt_audience: str = Field(
        alias="Auth:JWT:Audience",
        description="Audience value used for server-side JWT validation and issuance flows.",
    )
    api_endpoint: str = Field(
        alias="Endpoint:Service:Api",
        description=(
            "Base URL of the API service under the Endpoint hierarchy, "
            "called by the website from server-side code."
        ),
    )


class WebsiteRunTimeConfig(WebsiteBuildTimeConfig):
    """Configuration values used by the website during server-side request execution.

    Run-time website config extends the build-time document with server-only
    secrets such as the JWT signing secret and optional communication-provider
    credentials.
    """

    jwt_secret: str = Field(
        alias="Auth:JWT:Secret",
        description=(
            "HS256 signing secret used by the website's server-side auth bridge. "
            "Never forward this value to the browser."
        ),
    )
    resend_api_key: str = Field(
        alias="Communication:Email:ApiKey",
        description=(
            "Optional email API key used by server-side email flows. Empty "
            "string means email is not configured."
        ),
    )


class BaseConfigDocumentResponse(ExpModel):
    """Shared envelope for target-scoped build-time and run-time config documents."""

    contractVersion: str = Field(default="1", description="Contract version for the response payload.")
    version: str = Field(description="Deterministic hash of the served document definition.")
    refreshIntervalSeconds: int = Field(
        default=300,
        description="Recommended refresh cadence for the caller snapshot cache.",
    )
    fetchedAt: str = Field(description="UTC timestamp for when the document was created.")


class ApiBuildTimeConfigDocumentResponse(BaseConfigDocumentResponse):
    """Build-time payload returned by ``GET /api/v1/build-time?for=api``."""

    target: Literal["api"] = Field(default="api", description="Target identifier for the API caller.")
    config: ApiBuildTimeConfig = Field(description="Build-time configuration values owned by the API contract.")


class WebsiteBuildTimeConfigDocumentResponse(BaseConfigDocumentResponse):
    """Build-time payload returned by ``GET /api/v1/build-time?for=website``."""

    target: Literal["website"] = Field(default="website", description="Target identifier for the website caller.")
    config: WebsiteBuildTimeConfig = Field(
        description="Build-time configuration values owned by the website contract.",
    )


class ApiRunTimeConfigDocumentResponse(BaseConfigDocumentResponse):
    """Run-time payload returned by ``GET /api/v1/run-time?for=api``."""

    target: Literal["api"] = Field(default="api", description="Target identifier for the API caller.")
    config: ApiRunTimeConfig = Field(description="Run-time configuration values owned by the API contract.")
    features: dict[str, bool] = Field(
        default_factory=dict,
        description="Feature-flag states available to the API caller. The API currently exposes none by default.",
    )


class WebsiteRunTimeConfigDocumentResponse(BaseConfigDocumentResponse):
    """Run-time payload returned by ``GET /api/v1/run-time?for=website``."""

    target: Literal["website"] = Field(default="website", description="Target identifier for the website caller.")
    config: WebsiteRunTimeConfig = Field(
        description="Run-time configuration values owned by the website contract.",
    )
    features: dict[str, bool] = Field(
        default_factory=dict,
        description="Website feature-flag states, such as Commander and Web Vitals toggles.",
    )


class ConfigValueResponse(ExpModel):
    """Single indexed configuration value returned by ``GET /api/v1/config?name=...``.

    This response surfaces one configuration entry at a time together with the
    server-authored documentation that explains where the value is used and
    which callers are allowed to request it.
    """

    name: str = Field(description="Canonical configuration key name, for example ``Endpoint:Service:Api``.")
    value: str = Field(description="Resolved configuration value for the requested key.")
    availableForTargets: tuple[str, ...] = Field(
        description="Targets allowed to request this configuration key through the config endpoint.",
    )
    availableInDocuments: tuple[str, ...] = Field(
        description="Document identifiers that include this key, such as ``website.run-time``.",
    )
    requiredInDocuments: tuple[str, ...] = Field(
        description="Document identifiers where this key is required instead of optional.",
    )
    description: str = Field(description="Short explanation of what the config value represents.")
    usage: str = Field(description="Operational guidance describing how callers should use the config value.")
    refreshIntervalSeconds: int = Field(
        default=300,
        description="Recommended refresh cadence for re-reading this configuration entry.",
    )
    fetchedAt: str = Field(description="UTC timestamp for when the configuration value was resolved.")
