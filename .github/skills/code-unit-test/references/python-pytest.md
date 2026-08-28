# Python pytest Guidance

Use this reference only for tests under `sites/exp.arolariu.ro`. Read the
source under test, its nearest `*.test.py`, the service guide, the Python
instruction, and `pyproject.toml` before selecting a test boundary.

## Discovery and collection

- Name tests `*.test.py`. The project does not use pytest's default
  `test_*.py` convention.
- Preserve the configured importlib import mode. Do not rely on test-directory
  path insertion, duplicate module basenames, or import side effects that only
  work under prepend mode.
- Keep tests beside the owning service area: route tests under `api/`, config
  tests under `config/`, security tests under `security/`, and telemetry tests
  under `telemetry/`.

## Choose the smallest real boundary

| Behavior | Preferred proof | Live examples |
| --- | --- | --- |
| Parsing, normalization, precedence, catalog lookup, or immutable result shape | Call the real function directly with deterministic inputs | `config/loader.test.py`, `config/catalog.test.py`, `telemetry/health_policy.test.py` |
| Environment-derived settings | Set or delete the exact environment inputs, then call the real settings function | `telemetry/settings.test.py`, `security/authz.test.py` |
| Telemetry composition | Use the real bootstrap logic with a typed fake bundle at the external OpenTelemetry/Azure boundary | `telemetry/bootstrap.test.py` |
| Authorization decisions | Call the real helper with a minimal request protocol stub | `security/authz.test.py` |
| FastAPI routing, middleware, serialization, headers, status codes, or lifespan interaction | Use the shared `TestClient` fixture | `main.test.py`, `api/build_time.test.py`, `api/config.test.py`, `api/run_time.test.py` |

`TestClient` is for route and integration behavior. Do not use it to test a
pure config parser, feature resolver, settings function, telemetry policy, or
authorization helper that can be exercised directly.

## Shared fixtures and state isolation

`conftest.py` establishes deterministic local mode, disables telemetry for
routine tests, resets process metrics and telemetry module state, and suppresses
startup config loading while constructing `TestClient`.

Add narrower setup only when the behavior needs it:

- Use `monkeypatch.setenv` and `monkeypatch.delenv(..., raising=False)` for
  environment state. Do not mutate `os.environ` without pytest-managed cleanup.
- Restore every process-global config field touched by a test.
  `config/loader.py` owns the default snapshot, load timestamps/count, lock,
  and a separate per-label cache. A label-cache test must isolate
  `_config_by_label` as well as `_config`, `_loaded`, and load metadata.
- Use `reset_metrics()` and `reset_telemetry_state()` when a narrower fixture
  bypasses the shared autouse fixture or when the test deliberately initializes
  those runtimes.
- Prefer explicit time inputs such as `_is_refresh_due(current_time=...)` or a
  patched consuming clock over sleeps.
- Use fixed IDs, timestamps, config maps, principal payloads, and feature
  values. Never depend on a developer's config file, cloud identity, network,
  hostname value, or prior test order.

## Import-time state and reloads

`config/catalog.py` constructs target indexes and their refresh intervals at
module import time. When a test changes an environment value that feeds that
construction, reload the module with `importlib.reload` before asserting, as
`config/catalog.test.py` does.

Do not reload modules merely because a function reads the environment on every
call. First identify whether the value is computed:

1. at import time,
2. when a settings/helper function is called, or
3. when a process-global cache is refreshed.

Reset or reload the owning layer, not unrelated consumers.

## Patch the consuming module

Patch the name used by the code under test after import:

```python
with patch("api.config.get_config", return_value=snapshot):
    response = client.get(...)
```

Do not patch `config.loader.get_config` when `api.config` already imported that
function by name. The same rule applies to `api.health.get_config`,
`api.build_time.get_config`, `api.run_time.get_config`, middleware telemetry
functions imported by `main`, and `_import_telemetry_dependencies` consumed by
`telemetry.bootstrap`.

Patch only an owned external seam or a dependency needed to reach the public
behavior. Keep catalog resolution, response builders, authorization logic, and
the repository module whose behavior is asserted real.

## Async and sync boundaries

- The request middleware and lifespan in `main.py` are asynchronous and must
  await `call_next` or yield through the async lifespan.
- Most public config and probe routes are synchronous; FastAPI runs them at its
  sync boundary. Test them through `TestClient` rather than calling them inside
  a hand-built event loop.
- `api/admin.py` has an async update route because it awaits
  `request.json()`. Preserve that await when testing through HTTP.
- Do not mark a direct pure-function test async. Do not add an event-loop test
  dependency solely to exercise behavior already observable through
  `TestClient`.
- If a defect is specifically about scheduling, cancellation, or async I/O,
  prove it at the first real async boundary instead of wrapping a synchronous
  helper in an artificial coroutine.

## FastAPI response contracts

For route tests, assert the complete relevant contract rather than only a
status:

- exact status and error message for validation or authorization failures;
- `missingRequiredKeys` when a required config entry is absent;
- target, document metadata, config shape, feature booleans, and absence of
  server-only fields where applicable;
- `Cache-Control` and `Pragma` on runtime-derived `/api/v1` config responses;
- request-correlation and content-type-protection headers added by middleware;
- the distinction between the shared `/api/v1` `ErrorResponse`, health/readiness
  models, and admin routes' separate JSON shapes.

Use negative assertions for forbidden leakage, such as a build-time website
response containing a run-time signing secret, or an unauthorized request
recording a successful config delivery.

## Completion checks

- Run the smallest pytest selection covering the changed test and its owner.
- Run the configured Ruff check for changed Python tests.
- Confirm the test still executes real repository behavior, remains order
  independent under importlib mode, and leaves environment, config caches,
  metrics, telemetry, and logging state clean.

## Live evidence

- `sites/exp.arolariu.ro/pyproject.toml`
- `sites/exp.arolariu.ro/conftest.py`
- `sites/exp.arolariu.ro/main.test.py`
- `sites/exp.arolariu.ro/api/*.test.py`
- `sites/exp.arolariu.ro/config/*.test.py`
- `sites/exp.arolariu.ro/security/authz.test.py`
- `sites/exp.arolariu.ro/telemetry/*.test.py`
