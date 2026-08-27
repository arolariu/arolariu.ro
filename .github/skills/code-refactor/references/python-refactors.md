# Python Refactor Guidance

Use this reference only after current behavior in
`sites/exp.arolariu.ro` is characterized and the requested change is explicitly
structural. A refactor must preserve route schemas, status codes, authorization,
configuration precedence, telemetry, side-effect order, and external
boundaries.

## Preserve typed boundaries

Choose the narrowest live shape:

- Use a PEP 695 `type` alias for a named cross-module collection or mapping
  shape, as `config/catalog.py` and `config/loader.py` do.
- Use `Protocol` for a narrow behavioral input such as the request-header
  surface in `security/authz.py`.
- Use `TypedDict` for dictionary-shaped serialized data such as Easy Auth
  claims or optional error metadata.
- Use `@dataclass(frozen=True, slots=True)` for immutable indexes, resolutions,
  authorization results, metrics snapshots, and telemetry settings.
- Keep lifecycle containers mutable where the implementation mutates them.
  `TelemetryRuntime` uses `slots=True` without `frozen=True` for this reason.
- Preserve `ExpModel`'s Pydantic configuration and field aliases. Moving fields
  between models must not loosen extra-field rejection, immutability,
  alias-based serialization, defaults, or response schema.

Do not replace a precise shape with `dict[str, object]`, an untyped tuple, or a
generic dependency bag merely to simplify imports.

## Keep routers thin

Route modules should sequence existing owners:

1. validate and resolve the query through `api/common.py`;
2. authorize through `security/authz.py`;
3. obtain a snapshot through `config/loader.py`;
4. resolve catalog values through `config/catalog.py`;
5. build the typed response through `api/common.py`;
6. record process and telemetry metrics.

Extract repeated request validation, error construction, response assembly, or
caller labeling to `api/common.py` only when all affected routes have the same
contract. Keep target indexes, feature registration, and resolution semantics
in `config/catalog.py`; keep storage/provider loading, refresh, and caches in
`config/loader.py`; keep environment parsing in `config/settings.py`; keep
identity policy in `security/authz.py`.

Do not move business/configuration policy into `main.py` middleware or duplicate
middleware-owned headers, request correlation, logging, and span enrichment in
routers.

## Configuration ownership and precedence

Refactors must preserve:

- the single infrastructure-mode selector;
- local config override, service-root, template, and empty-snapshot behavior;
- Azure endpoint, credential, environment-label, and explicit-label handling;
- independent default and per-label caches;
- the shared lock around default snapshot state;
- refresh-disabled behavior when the interval is zero;
- bare feature IDs in the catalog and storage prefixes at reader boundaries;
- the intentionally different precedence used by single-value resolution and
  run-time feature extraction;
- false-on-invalid behavior for a present feature representation.

Consolidation is safe only when tests prove the affected readers are
semantically equivalent. Similar-looking feature or label code is not enough.

## Import graph and lazy boundaries

The current composition flows broadly from `main.py` to routers, then to common
helpers, catalog/loader, authorization, metrics, and telemetry. Preserve that
direction while moving code.

Pay special attention to these cycle-avoidance boundaries:

- Azure SDK imports live inside provider wrapper functions.
- Telemetry dependencies are lazily imported by
  `_import_telemetry_dependencies`.
- Telemetry gauge callbacks dynamically resolve runtime metrics and config
  loader state rather than eagerly importing them into the bootstrap cycle.
- Tests use importlib mode and patch the consumer's imported name.

After moving a function, update every direct import and every consuming-module
patch target. Do not add a package-level re-export solely to preserve a stale
test patch or hide a cycle.

## Async and sync preservation

- Keep lifespan and request middleware asynchronous.
- Keep the middleware's await, exception re-raise, and response post-processing
  order unchanged.
- Most config and probe routes are synchronous. Do not convert them to async
  merely because FastAPI supports async handlers.
- The admin update route awaits JSON body parsing. Preserve that request
  boundary if extracting its validation.
- Do not move synchronous Azure calls into general async helpers without a
  characterized scheduling and error contract.

An async conversion is not a cosmetic refactor when it changes thread-pool
execution, cancellation, exception timing, or patch/test seams.

## Behavior that must not drift

Characterize the applicable items before editing:

- query aliases, normalization, accepted characters, and validation messages;
- target and shared-key authorization decisions;
- public/admin response-boundary differences;
- Pydantic response aliases, defaults, required fields, and server-only field
  exclusion;
- exact status codes and error metadata;
- cache, request ID, and security headers;
- feature values and precedence;
- config load/refresh counters and detached snapshots;
- metric/span names, attributes, suppression behavior, and shutdown cleanup;
- lock ownership and side-effect order;
- lazy cloud imports and escaping provider failures.

If preserving these exposes a defect or requires an auth/schema/public-contract
change, stop the refactor and route that work separately.

## Safe transformation sequence

1. Pin the current behavior with the nearest direct unit tests and route tests.
2. Name one smell and one owning destination.
3. Move or extract one coherent responsibility.
4. Update imports, type aliases, docstrings, and consuming patch targets for
   that move only.
5. Run the smallest affected pytest selection.
6. Run Ruff on the changed Python scope.
7. Inspect the import graph and scoped diff before another transformation.

Use route tests only for HTTP behavior and direct tests for config, authz, and
telemetry logic. Re-run the route contract tests whenever a helper move crosses
the router/common/catalog/loader/security boundary.

## Refactor candidates and exclusions

| Candidate | Safe when | Do not do |
| --- | --- | --- |
| Extract shared query or response helper | All callers have the same validation and envelope | Force health or admin responses into the `/api/v1` error contract |
| Extract typed value object | The shape is stable and immutable | Replace a mutable runtime lifecycle object with a frozen snapshot |
| Consolidate config resolution | Valid, missing, invalid, and precedence cases are equivalent | Merge single-value and feature-document precedence because names look similar |
| Split a large module | Ownership and initialization order are pinned | Eagerly import Azure or telemetry dependencies and create a cycle |
| Move environment parsing | One settings module becomes the sole owner | Leave direct `os.getenv` branches implementing the same policy elsewhere |

## Live evidence

- `sites/exp.arolariu.ro/models.py`
- `sites/exp.arolariu.ro/api/common.py`
- `sites/exp.arolariu.ro/api/*.py`
- `sites/exp.arolariu.ro/config/catalog.py`
- `sites/exp.arolariu.ro/config/loader.py`
- `sites/exp.arolariu.ro/config/settings.py`
- `sites/exp.arolariu.ro/security/authz.py`
- `sites/exp.arolariu.ro/runtime/metrics.py`
- `sites/exp.arolariu.ro/telemetry/bootstrap.py`
- Matching `sites/exp.arolariu.ro/**/*.test.py`
