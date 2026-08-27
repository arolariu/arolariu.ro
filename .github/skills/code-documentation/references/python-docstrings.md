# Python Docstring Guidance

Use this reference when documenting Python source in
`sites/exp.arolariu.ro`. Derive every contract from the live signature,
implementation, response model, consumer, and test. The generated API-doc
configuration reads selected service modules and applies smart/cross-reference
processing, so resolvable symbols and accurate module ownership matter.

## Match the live local style

The service uses concise triple-quoted module, class, and function docstrings.
For parameters that need explanation, live modules currently contain both:

- Google-style `Args:` sections, such as `_load_azure_config` in
  `config/loader.py`; and
- sectioned `Parameters` blocks, such as
  `get_refresh_interval_seconds` in `config/settings.py` and
  `record_config_delivery` in `runtime/metrics.py`.

Preserve the surrounding module's established style. Do not reformat an entire
module only to make these two accepted styles uniform. Add a section only when
it conveys caller-visible constraints, precedence, units, side effects, or
failure behavior that the type signature cannot.

## What to document

### Modules

Use the module docstring to explain ownership and boundary when that is not
obvious from the filename:

- route slice and intended response surface;
- config catalog versus provider/cache ownership;
- authorization flow ownership;
- process-local metrics lifetime;
- telemetry bootstrap or health-suppression policy.

Do not copy a route inventory, environment inventory, command, dependency
version, or framework version into a module docstring.

### Public functions and classes

Document public functions, Pydantic models, dataclasses, protocols, and typed
payload shapes. A useful summary states what the caller receives or what
observable side effect occurs.

Private helpers need docstrings when they encode non-obvious policy such as:

- precedence or fallback;
- normalization and exact-match behavior;
- lock/cache ownership;
- authorization classification;
- telemetry suppression or low-cardinality requirements;
- lazy external dependency loading;
- an async/sync boundary.

Do not narrate syntax or restate type annotations.

## FastAPI endpoint contracts

An endpoint docstring should describe the route's caller-visible purpose and,
when non-obvious:

- required query/header context and target ownership;
- whether it returns a typed model or a `JSONResponse` failure;
- missing-config, validation, or authorization outcomes;
- whether a label affects Azure loading but is ignored or falls back in local
  mode;
- server-only versus caller-visible config boundaries;
- side effects such as successful-delivery metrics.

Keep the decorator's `response_model`, the Python return union, Pydantic model,
response builders, and route tests aligned. Do not claim that every endpoint
uses the same error envelope:

- `/api/v1` config routes share `ErrorResponse` construction;
- health/readiness have dedicated models;
- admin routes have separate HTML/JSON contracts and external-provider error
  handling;
- middleware exceptions are logged and re-raised to FastAPI.

Document the boundary that exists rather than proposing a normalized one.

## Pydantic models and typed shapes

- Give each response model a domain-level summary.
- Use `Field(description=...)` for serialized field meaning, units, aliases,
  empty/optional semantics, and security restrictions.
- Keep descriptions consistent with `ExpModel` behavior: forbidden extras,
  frozen models, population/serialization by alias.
- For inherited document models, explain what the subtype adds or why the
  build-time and run-time contracts remain distinct.
- For `TypedDict`, describe the external serialized shape and optionality.
- For `Protocol`, describe the minimal behavior required from callers.
- For dataclasses, document whether the object is an immutable snapshot,
  resolution, index, decision, or mutable lifecycle container.

Never put credentials or realistic secret values in an example. Do not imply a
field is browser-safe merely because it is serialized by a model.

## Exceptions, side effects, and async behavior

Document only observable failures:

- local config file read/JSON failures are logged and return an empty snapshot;
- Azure mode requires its endpoint and may propagate provider/credential
  failures from the loader;
- readiness translates config-read failures to its readiness response;
- middleware records/logs exceptions and re-raises them;
- admin routes translate some provider failures to admin-specific JSON.

Use a `Raises:` section only for exceptions intentionally allowed to escape the
documented function. Do not list caught implementation exceptions.

Call out material side effects when applicable:

- mutation of the synchronized in-memory config snapshot;
- per-label cache updates;
- process-local metric increments;
- provider initialization, instrumentation, logging-handler installation,
  flushing, or shutdown;
- response-header mutation;
- ephemeral admin updates versus persisted Azure writes.

For async functions, explain why the boundary is async only when it affects
correct use. `main.py` middleware awaits the next handler, lifespan yields
around process initialization/shutdown, and the admin update route awaits JSON
body parsing. Do not label synchronous route/provider helpers async in prose.

## Configuration and feature precedence

Precedence is worth documenting where callers could otherwise misuse the API,
but keep it beside the owning resolver:

- infrastructure and environment fallbacks belong in settings/loader helpers;
- local file fallback and Azure label selection belong in `config/loader.py`;
- catalog construction and single-key resolution belong in
  `config/catalog.py`;
- run-time feature extraction precedence belongs in `config/loader.py`;
- authorization mode and target selection belong in `security/authz.py`.

Be precise: the single-key config resolver and run-time feature extractor do
not inspect the same representations in the same order. Avoid a generic
"feature flags prefer X" statement detached from the owning function.

## Cross-references and examples

- Use resolvable Python symbols in Sphinx-style roles already present in live
  docstrings, such as `:func:`, only when the generated docs can load the
  target module.
- Prefer a live route test or consumer pointer over a large copied example.
- If an example is necessary, use current imports, safe placeholder data, and
  the real sync/async calling context.
- Keep examples deterministic and omit copied output, current versions,
  command lines, route counts, config-key counts, and environment inventories.

## Review checklist

- Summary adds purpose or contract beyond the signature.
- Parameter names, defaults, aliases, units, and optionality match source.
- Return documentation matches the exact model/union and empty cases.
- Exceptions describe only escaping behavior.
- Side effects, cache/lock ownership, and async behavior are source-proven.
- Authorization and admin/public boundaries are not broadened.
- Config and feature precedence is owned by the documented resolver.
- Pydantic field descriptions match serialization and security behavior.
- Cross-references resolve under `pydoc-markdown.yml`.
- No commands, versions, generated output, credentials, or copied runtime
  facts were introduced.

## Live evidence

- `sites/exp.arolariu.ro/pydoc-markdown.yml`
- `sites/exp.arolariu.ro/main.py`
- `sites/exp.arolariu.ro/models.py`
- `sites/exp.arolariu.ro/api/*.py`
- `sites/exp.arolariu.ro/config/*.py`
- `sites/exp.arolariu.ro/security/authz.py`
- `sites/exp.arolariu.ro/runtime/metrics.py`
- `sites/exp.arolariu.ro/telemetry/*.py`
- Matching `sites/exp.arolariu.ro/**/*.test.py`
