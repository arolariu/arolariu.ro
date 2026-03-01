"""Typed response models used by exp.arolariu.ro endpoints."""

from dataclasses import asdict, dataclass, field


@dataclass(frozen=True, slots=True)
class CatalogResponse:
    """Represents the catalog contract returned by /api/catalog."""

    target: str
    version: str
    requiredKeys: list[str]
    optionalKeys: list[str] = field(default_factory=list)
    allowedPrefixes: list[str] = field(default_factory=list)
    refreshIntervalSeconds: int = 300

    def to_dict(self) -> dict[str, object]:
        """Convert the model into a JSON-serializable dictionary."""
        return asdict(self)
