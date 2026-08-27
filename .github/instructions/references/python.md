# Experimental Service Python Reference Catalog

Owner: `.github/instructions/python.instructions.md`. This catalog holds
extensive, repository-specific Python/FastAPI examples, anti-patterns, edge
cases, and rationale for `sites/exp.arolariu.ro`. It does not define a
workflow and it does not restate the service's local commands or Ruff/pytest
configuration — see `sites/exp.arolariu.ro/AGENTS.md` and `pyproject.toml`. It
does not duplicate `code-refactor`, `code-documentation`, `code-unit-test`, or `code-fix-bug`
skill workflow procedures; this catalog explains the module architecture and
typing/config/error conventions those workflows execute inside.

## Typing: PEP 695 aliases and boundary types

`config/catalog.py` defines every cross-module shape as a PEP 695 `type`
alias or a frozen, `slots=True` dataclass instead of a bare `dict`/`tuple`:

```python
# sites/exp.arolariu.ro/config/catalog.py
type ConfigKeys = tuple[str, ...]
type ConfigSnapshot = Mapping[str, str]
type DocumentNames = tuple[str, ...]


@dataclass(frozen=True, slots=True)
class TargetConfigIndex:
    """Describes the indexed config documents for one exp consumer target."""

    target: str
    build_time_required_keys: ConfigKeys
    ...
```

`frozen=True, slots=True` is the repository default for every value object in
this service — it prevents accidental mutation of a shared snapshot and keeps
memory flat. `config/loader.py`'s `ConfigLoaderStats` and
`security/authz.py`'s `AuthorizationResult` follow the same shape. When you
add a new cross-module value, match this pattern rather than returning a
loose `dict[str, Any]`.

`from __future__ import annotations` is the convention for new modules that
need deferred annotation evaluation and is present in representative runtime
modules such as `main.py`, `config/loader.py`, and `security/authz.py`. Several
existing health/test modules omit it, so do not create review churn solely to
make the import universal.

### Anti-pattern: returning a mutable shared reference

```python
# ❌ Anti-pattern: callers can mutate the process-global snapshot.
def get_config() -> ConfigSnapshot:
    return _config
```

```python
# ✅ Correction — sites/exp.arolariu.ro/config/loader.py get_config()
def get_config() -> ConfigSnapshot:
    with _config_lock:
        if not _loaded or _is_refresh_due():
            load_config()
        # Return a detached snapshot so callers cannot mutate shared state.
        return dict(_config)
```

### `Protocol` and `TypedDict` for external payload shapes

`security/authz.py` types the minimal request surface it needs with a
`Protocol` instead of importing FastAPI's concrete `Request` everywhere, and
types the Azure Easy Auth JSON payload with `TypedDict` so untyped
`json.loads()` output gets a checked shape immediately:

```python
# sites/exp.arolariu.ro/security/authz.py
class RequestLike(Protocol):
    """Minimal request protocol needed by authorization helpers."""

    headers: Mapping[str, str]


class EasyAuthPrincipal(TypedDict, total=False):
    """Represents the decoded Easy Auth principal payload."""

    claims: list[EasyAuthClaim]
```

`api/common.py`'s `ErrorDetails(TypedDict, total=False)` does the same for
optional error-response fields. Use `Protocol` when a function only needs a
narrow slice of a larger object (avoids importing a heavy dependency just for
a type), and `TypedDict` when a dict shape crosses a serialization boundary
(JSON, headers, env) and needs field-level typing without a full model.

## FastAPI boundaries: routers, DI-free composition, and thin handlers

Every route module (`api/health.py`, `api/config.py`, `api/build_time.py`,
`api/run_time.py`, `api/admin.py`) exports a module-level `router =
APIRouter(...)` that `main.py` includes with `app.include_router(...)`; there
is no dependency-injection container. Cross-cutting behavior needed by every
route lives once in `api/common.py` (query validation, error responses,
typed response assembly, cache-header decisions) and handlers stay thin:

```python
# sites/exp.arolariu.ro/api/config.py
@router.get("/config", response_model=ConfigValueResponse)
def get_config_value_endpoint(
    req: Request,
    name: Annotated[str, Query(alias="name")] = "",
    label: Annotated[str, Query(alias="label")] = "",
) -> ConfigValueResponse | JSONResponse:
    """Return one indexed configuration value plus its ownership and usage metadata."""

    resolution, error = resolve_config_name_query(name, parameter_name="name")
    if error is not None:
        return error
    ...
```

Notice this configuration handler delegates expected validation and
authorization failures to named `build_*_error`/`error_response` helpers from
`api/common.py`. That shared envelope applies to the `/api/v1` configuration
surface, not every route in the service. When extending that surface, reuse
`resolve_target_query`/`resolve_config_name_query` and the
`build_*_response` helpers instead of hand-rolling validation or response
construction again.

### Request-scoped context via ASGI middleware, not `Depends`

`main.py`'s `attach_request_context` middleware is the one place request IDs,
timing, and telemetry span attributes are attached — it wraps `call_next`,
re-raises after logging, and adds standard/cache headers only when a response
is returned:

```python
# sites/exp.arolariu.ro/main.py
@app.middleware("http")
async def attach_request_context(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    ...
    try:
        response = await call_next(request)
    except Exception as exception:
        trace_context = get_current_trace_context()
        record_current_span_exception(exception)
        logger.exception(...)
        raise
    ...
    return response
```

Do not add a second middleware for the same concern (headers, logging,
telemetry) — extend `attach_request_context`, `_attach_standard_headers`, or
`_attach_cache_headers` instead, matching the existing single-owner shape.

### Anti-pattern: business logic inside the route handler

```python
# ❌ Anti-pattern: validation, authorization, and response shaping inline.
@router.get("/config")
def get_config_value_endpoint(req: Request, name: str = "") -> JSONResponse:
    if not name:
        return JSONResponse({"error": "name required"}, status_code=400)
    definition = get_config_definition(name)
    if definition is None:
        return JSONResponse({"error": "unknown"}, status_code=400)
    # ...authorization and response building repeated per-endpoint...
```

```python
# ✅ Correction — delegate to config.catalog + api.common + security.authz,
# as api/config.py does. The handler only sequences named steps and returns.
```

## Feature flags: bare catalog names, `FeatureManagement:` storage prefix

`config/catalog.py` registers feature IDs under their **bare** name
(`website.commander.enabled`), but two readers resolve different snapshot
shapes:

- `resolve_config_value` checks the bare key first, then
  `FeatureManagement:<id>`; it does not inspect Azure feature-flag JSON.
- `config/loader.py`'s `_resolve_feature_state` checks
  `FeatureManagement:<id>` first, then
  `.appconfig.featureflag/<id>` JSON; it does not check the bare key.

For feature snapshot extraction, an invalid value logs a warning and returns
`False` immediately rather than falling through to the next representation:

```python
# sites/exp.arolariu.ro/config/loader.py
def _resolve_feature_state(config: Mapping[str, str], feature_id: str) -> bool:
    feature_management_key = f"FeatureManagement:{feature_id}"
    feature_management_value = config.get(feature_management_key)
    if feature_management_value is not None:
        parsed = _parse_bool(feature_management_value)
        if parsed is None:
            logger.warning(
                "Feature flag %s has an invalid FeatureManagement value %r; defaulting to False.",
                feature_id,
                feature_management_value,
            )
            return False
        return parsed
    ...
```

### Anti-pattern: storing or comparing the prefixed name in the catalog

```python
# ❌ Anti-pattern: catalog now leaks a storage concern into every consumer.
feature_ids=["FeatureManagement:website.commander.enabled"]
```

```python
# ✅ Correction — sites/exp.arolariu.ro/config/catalog.py _TARGET_INDEXES["website"]
feature_ids=[
    "website.commander.enabled",
    "website.web-vitals.enabled",
]
# The FeatureManagement: prefix is applied only at the resolution boundary
# (resolve_config_value / _resolve_feature_state), never in the catalog.
```

## Configuration: local/Azure loading, refresh, and label overrides

`config/loader.py` has exactly one load path selector,
`_load_config_for_infrastructure(infra)`, driven by `INFRA` (`local` or
`azure`); do not add a second branch elsewhere in the service that reads
`INFRA` directly. Local mode reads `config.json` and falls back to
`config.template.json` with a warning log — it never raises on a missing
file. Azure mode requires `AZURE_APPCONFIG_ENDPOINT` and raises
`RuntimeError` immediately if it is absent, because a silently-empty
snapshot in Azure mode would be a worse failure than a fast crash:

```python
# sites/exp.arolariu.ro/config/loader.py
def _load_azure_config(label: str | None = None) -> ConfigSnapshot:
    ...
    endpoint = os.getenv("AZURE_APPCONFIG_ENDPOINT")
    if not endpoint:
        raise RuntimeError("AZURE_APPCONFIG_ENDPOINT env var is required in azure mode")
```

Refresh is time-based via `EXP_CONFIG_REFRESH_INTERVAL_SECONDS`
(`config/settings.py get_refresh_interval_seconds`), and `0` is a valid,
intentional "disable automatic refresh" value — but only when the caller
passes `allow_zero=True`. The default path treats non-positive values as
invalid and falls back to `DEFAULT_REFRESH_INTERVAL_SECONDS` (300). Reuse
`allow_zero` rather than adding a second "is refresh disabled" check.

Per-label caching (`get_config_for_label`) only activates in Azure mode and
only for `DEVELOPMENT`/`PRODUCTION`; local/proxy mode and unknown labels
transparently fall back to the default `get_config()` snapshot — a label
argument is never an error in local mode, because the local JSON file has no
concept of labels.

### Edge case: concurrent access to the process-global snapshot

`_config`, `_loaded`, `_last_loaded_at`, and `_load_count` are module-level
globals guarded by one `threading.RLock()` (`_config_lock`). Every function
that reads or writes the snapshot — `load_config`, `get_config`,
`update_config_value`, `get_config_stats` — acquires that same lock. If you
add a new function that touches `_config`, acquire `_config_lock`; do not
introduce a second lock or an unguarded read, since FastAPI/uvicorn can serve
concurrent requests in the same process.

## Ruff: satisfying the configured rule set instead of suppressing it

`pyproject.toml` selects `E, F, I, W, UP, B, SIM, RUF` at 120 columns. When
Ruff flags something, fix the pattern rather than adding `# noqa`:

- `UP` (pyupgrade) is why every union is `str | None` instead of
  `Optional[str]`, and why type aliases use PEP 695 `type X = ...` instead of
  `TypeAlias`.
- `SIM` is why `_parse_bool` returns early with guard clauses instead of
  nested `if/else`, and why comprehensions are used over manual
  accumulation loops (see `_dedupe`, `_build_config_registry`).
- `B` (bugbear) is why mutable defaults never appear in function signatures;
  every default collection uses `default_factory=dict`
  (`models.py`'s `requestsByPath: dict[str, int] = Field(default_factory=dict, ...)`).
- `RUF` is why f-strings are preferred over `%`-formatting in new code, except
  inside `logger.*` calls, which intentionally use `%`-style lazy formatting
  (`logger.info("Loaded %d configuration keys", len(_config))`) so the string
  is only built when the log level is enabled.

If a rule genuinely cannot be satisfied for a specific line, that is a Ruff
rule-set change, not a suppression — ask before touching `pyproject.toml`.

## pytest: `*.test.py`, `importlib` mode, and fixture/patch conventions

`pyproject.toml`'s `[tool.pytest.ini_options]` sets
`python_files = ["*.test.py"]` and `addopts = "--import-mode=importlib"`.
`conftest.py` supplies the shared `client` fixture
(`fastapi.testclient.TestClient`) used across every `*.test.py` file. Tests
mock at the module-attribute level with `unittest.mock.patch`, targeting the
**consuming** module's imported name, not the defining module:

```python
# sites/exp.arolariu.ro/main.test.py
with patch("api.health.get_config", return_value=test_config):
    ...
```

not `patch("config.loader.get_config", ...)` — because `api/health.py`
imports `get_config` by name, patching the origin module would not affect the
already-bound reference in `api.health`.

Reloading a module under test to observe environment-driven behavior uses
`importlib.reload`, as in `config/catalog.test.py`:

```python
# sites/exp.arolariu.ro/config/catalog.test.py
def _reload_catalog_module():
    return importlib.reload(catalog)


class TestCatalogRefreshInterval:
    def test_uses_default_when_interval_is_invalid(self, monkeypatch):
        monkeypatch.setenv("EXP_CONFIG_REFRESH_INTERVAL_SECONDS", "invalid")
        module = _reload_catalog_module()
        assert module.get_target_index("api").refresh_interval_seconds == 300
```

Use `monkeypatch.setenv` plus a reload whenever a module derives module-level
state from an environment variable at import/build time — a bare `os.environ`
mutation without reload will not be observed by code that already computed
its value.

### Anti-pattern: `test_*.py` naming or patching the wrong module

```python
# ❌ Anti-pattern: pytest's default discovery name, ignored by this project's
# python_files = ["*.test.py"] config, and imprecise patch target.
# File: test_config.py
with patch("config.loader.get_config", return_value=...):
    ...
```

```python
# ✅ Correction: file named config.test.py, patch the importing module.
# File: config.test.py
with patch("api.config.get_config", return_value=...):
    ...
```

## Errors: boundary-specific response contracts

Expected validation, authorization, and missing-key failures on the
`/api/v1` configuration routes use the shared `ErrorResponse` Pydantic model
through `api/common.py error_response()`. When adding a failure to that
surface, add or reuse a named `build_*_error` helper rather than constructing
an ad hoc response in the handler.

Health/readiness routes return `HealthResponse`/`ReadyResponse`. Admin routes
currently return ad hoc JSON and some provider failures include exception
text. Middleware-level exceptions are logged with trace correlation and
re-raised for FastAPI's default 500 handling. Treat those as separate live
boundaries, not proof of a universal envelope; changing their public or
security behavior requires explicit scope and approval.

## Live source pointers

- `sites/exp.arolariu.ro/main.py` — composition root, middleware, request
  correlation.
- `sites/exp.arolariu.ro/models.py` — `ExpModel` base config
  (`extra="forbid"`, `frozen=True`), typed request/response contracts.
- `sites/exp.arolariu.ro/config/catalog.py` — target indexes, config
  registry, feature-ID registration.
- `sites/exp.arolariu.ro/config/loader.py` — local/Azure loading, refresh,
  label caching, feature extraction.
- `sites/exp.arolariu.ro/config/settings.py` — environment-driven settings
  helpers (`INFRA`, refresh interval).
- `sites/exp.arolariu.ro/security/authz.py` — Easy Auth decoding, local
  token, target authorization flows.
- `sites/exp.arolariu.ro/api/common.py` — shared query validation, error
  responses, typed response assembly.
- `sites/exp.arolariu.ro/api/config.py`, `build_time.py`, `run_time.py`,
  `health.py`, `admin.py` — endpoint modules.
- `sites/exp.arolariu.ro/main.test.py`, `config/catalog.test.py` — fixture,
  patch-target, and reload conventions.
- `sites/exp.arolariu.ro/pyproject.toml` — Ruff rule set and pytest
  configuration.
