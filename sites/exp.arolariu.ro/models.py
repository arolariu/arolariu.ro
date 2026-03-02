"""Typed request/response contracts used by exp.arolariu.ro endpoints."""

from pydantic import BaseModel, ConfigDict, Field


class ErrorResponse(BaseModel):
    """Represents a standardized error payload."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    error: str
    deniedKeys: list[str] | None = None
    invalidKeys: list[str] | None = None
    missingRequiredKeys: list[str] | None = None


class HealthResponse(BaseModel):
    """Represents a liveness response payload."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    status: str
    environment: str
    timestamp: str


class ReadyResponse(HealthResponse):
    """Represents a readiness response payload."""

    keysLoaded: int = 0


class ConfigValueResponse(BaseModel):
    """Represents a single config value payload."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    key: str
    value: str
    fetchedAt: str


class ConfigBatchResponse(BaseModel):
    """Represents a batch config value payload."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    values: list[ConfigValueResponse]
    fetchedAt: str


class CatalogResponse(BaseModel):
    """Represents the catalog contract returned by /api/v2/catalog."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    target: str
    version: str
    requiredKeys: list[str]
    optionalKeys: list[str] = Field(default_factory=list)
    allowedPrefixes: list[str] = Field(default_factory=list)
    refreshIntervalSeconds: int = 300

    def to_dict(self) -> dict[str, object]:
        """Convert the model into a JSON-serializable dictionary."""
        return self.model_dump()


class CatalogPayload(CatalogResponse):
    """Represents the catalog response envelope returned by API."""

    fetchedAt: str
