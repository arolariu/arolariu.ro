# Python and FastAPI Review

Use for changes under `sites/exp.arolariu.ro`. Read its local guide, Python
instruction/catalog, live route/config/security/telemetry owners, and current
pytest configuration.

## FastAPI and authorization boundaries

- Validate route/query/header inputs before configuration lookup or external
  work.
- Preserve mode-specific caller and target authorization. Unknown
  infrastructure modes must not fail open.
- A target hint, principal ID header, or undecoded principal is not
  authorization by itself.
- Review route response models, aliases, status codes, headers, and the
  intentional differences among public config, health/readiness, and admin
  error contracts.
- Flag sensitive configuration, secret, identity, or internal provider detail
  exposed in a response, log, metric, or span.

## Configuration and process state

- Preserve local/Azure source precedence, explicit labels, default versus
  per-label caches, refresh timing, and import-time catalog construction.
- Check synchronized snapshot mutation, detached copies, cache growth, and
  stale state across requests/tests.
- Pydantic models must retain extra-field, frozen/mutability, alias,
  default/required, and serialization contracts.
- Lazy Azure/telemetry imports should not become eager cycles or make local
  startup require cloud dependencies.

## Async, external I/O, and errors

- Middleware/lifespan and async routes must await their real async boundaries.
- Flag blocking synchronous I/O newly introduced on a reachable async request
  path when the framework cannot isolate it.
- Preserve external-provider error translation and avoid broad catches or
  success-shaped fallbacks.
- Review telemetry setup/shutdown, duplicate instrumentation, and global state
  cleanup.

## Test evidence

Patch the consuming name and only a true external boundary. Keep repository
config resolution, authorization, response builders, and telemetry policy
real. Tests should isolate environment, import-time state, caches, metrics,
telemetry, and logging, and should use `TestClient` only when HTTP/middleware
behavior is the contract.

Live authorities include `python.md`, `code-unit-test`'s pytest guidance, and
the matching route/config/security/telemetry tests.
