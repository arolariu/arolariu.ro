# Python Bug Diagnosis

Use this reference after reproducing a defect in
`sites/exp.arolariu.ro`. It narrows the generic fix-bug workflow to the
service's configuration, FastAPI, security, telemetry, and Azure boundaries.

## Start from the visible boundary

Capture the exact request or direct-function input, environment state, expected
contract, actual status/value/error, and first failing assertion. Then trace
through real modules to the first violated invariant.

| Symptom | Inspect first | Common ownership mistake |
| --- | --- | --- |
| Wrong source, label, or refresh result | `config/settings.py`, then `config/loader.py` | Reading `INFRA` or refresh settings in a second module instead of using the owning helper |
| Wrong feature value | Identify whether the caller uses `resolve_config_value` or `extract_features` | Treating the two supported snapshot shapes as one universal precedence chain |
| Wrong status/body/header | Route module, `api/common.py`, then `main.py` middleware | Fixing serialization in the loader or changing every response boundary |
| Unauthorized or overexposed config | `security/authz.py`, catalog target ownership, then the route | Treating a target hint, principal ID header, or admin token shape as authorization by itself |
| Missing or duplicate telemetry | `main.py`, `telemetry/health_policy.py`, `telemetry/settings.py`, then `telemetry/bootstrap.py` | Patching only a predicate while instrumentation or middleware still uses a different value |
| Cloud-only failure | The local wrapper that lazily imports Azure SDK types | Debugging SDK internals before validating endpoint, label, credential, and environment inputs |

## Configuration precedence and reloads

Do not guess at precedence:

- Infrastructure mode is normalized by `get_runtime_infra_mode`.
- Local loading uses an explicit local config path when present, otherwise the
  service-root config, then the template fallback, then an empty snapshot.
- Azure label selection resolves from the explicit label or the environment
  label helper. Label-specific caching is separate from the default snapshot.
- Refresh behavior depends on loaded state, monotonic load time, and the
  refresh interval; zero disables automatic refresh only on the path that
  requests `allow_zero=True`.
- Telemetry deployment environment checks its explicit environment keys in the
  order implemented by `telemetry/settings.py`.
- Catalog indexes are built at import time, so an environment change may
  require `importlib.reload(catalog)`. Settings helpers that read the
  environment per call do not.

When reproducing a stale-value defect, reset the default config globals and
the per-label cache. Record whether the failure survives a clean module state;
otherwise the root cause may be leaked test/process state rather than loading
logic.

## Feature-flag diagnosis

The service has two intentionally different readers:

1. Single-key resolution checks the bare catalog name, then the
   `FeatureManagement:` storage key.
2. Run-time feature extraction checks `FeatureManagement:` first, then the
   Azure App Configuration feature JSON key.

For run-time extraction, a present but invalid higher-precedence representation
resolves to `False`; it does not fall through to the next representation.
Before changing this behavior, confirm whether the report concerns the
single-key endpoint or the run-time feature document. Do not store prefixed
names in the catalog to mask a reader bug.

## Request middleware and response boundaries

`main.py` records the request and span attributes before awaiting the next
handler. On a returned response it adds request/security headers, applies
no-store headers to the configured `/api/v1` paths, records health failures,
and conditionally logs. On an exception it records/logs the exception and
re-raises it.

Trace bugs in this order:

1. route validation and authorization;
2. config/catalog resolution;
3. typed response construction;
4. middleware post-processing;
5. FastAPI's final exception/serialization handling.

Expected `/api/v1` validation, authorization, and missing-config failures use
the shared error builder. Health/readiness use their own Pydantic response
models. Admin endpoints return separate ad hoc JSON and currently translate
some Azure provider failures into admin-specific responses. Do not "normalize"
one boundary to another as a bug fix unless the public contract explicitly
requires it.

## Authorization diagnosis

- Local and proxy modes use optional shared-token enforcement and target-header
  validation.
- Azure mode requires a decodable Easy Auth principal whose relevant claims
  intersect the configured target policy.
- Unknown infrastructure mode fails closed.
- Shared keys may require `X-Exp-Target` to disambiguate the caller's target.
- A principal ID header without a valid principal payload is not sufficient.

Reproduce authorization at the pure `authorize_*` helper first, then through
the route if status translation or response exposure is also wrong. Any change
to accepted identities, token validation, target ownership, status visibility,
or admin security is an authentication/authorization change, not a routine bug
fix; follow the repository risk boundary.

## Patch-target diagnosis

Patch where the dependency is consumed. If `api.run_time` imported
`get_config` by name, patch `api.run_time.get_config`, not
`config.loader.get_config`. If middleware imported a metric recorder into
`main`, patch `main.record_health_failure_metric`.

When a patch appears to have no effect:

1. inspect the import form in the consuming module;
2. confirm whether importlib reload rebound the name after the patch;
3. confirm whether the request uses another route module or cached snapshot;
4. remove broad patches until the first real call is visible.

A regression test that replaces the repository function owning the defect
does not prove the fix.

## Async, sync, and external I/O

- Preserve `await call_next(request)` and `await request.json()` at their real
  async boundaries.
- Most config routes and Azure loader wrappers are synchronous. Diagnose them
  as sync code rather than adding an event loop around them.
- External Azure imports are deliberately inside wrapper functions. Patch the
  wrapper or lazy dependency importer for deterministic tests; do not require
  live cloud access for unit reproduction.
- Check missing endpoint/credential/label inputs before attributing a failure
  to Azure SDK behavior.
- If a synchronous cloud call inside an async route causes blocking, prove the
  scheduling symptom separately. Converting the I/O model is a structural
  change and must preserve request, error, and authorization contracts.

## Fail-without and pass-with

The regression must:

1. fail against the unfixed owning boundary for the identified cause;
2. pass with the smallest correction;
3. keep assertions equally strict;
4. cover a nearby negative or precedence case when the defect could otherwise
   be hidden by fallback behavior; and
5. leave environment, module reload state, config caches, metrics, telemetry,
   and logging state clean.

For HTTP defects, prove the exact status, body, headers, and absence of
forbidden values or side effects. For pure config/telemetry defects, prefer a
direct deterministic test over `TestClient`.

## Live evidence

- `sites/exp.arolariu.ro/config/settings.py`
- `sites/exp.arolariu.ro/config/catalog.py`
- `sites/exp.arolariu.ro/config/loader.py`
- `sites/exp.arolariu.ro/security/authz.py`
- `sites/exp.arolariu.ro/api/common.py`
- `sites/exp.arolariu.ro/api/*.py`
- `sites/exp.arolariu.ro/main.py`
- `sites/exp.arolariu.ro/telemetry/*.py`
- Matching `sites/exp.arolariu.ro/**/*.test.py`
