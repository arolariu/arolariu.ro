# Python Migrations

Load only after live inspection establishes Python requirements/runtime
ownership.

## Live Ownership Model

- [`requirements.txt`](../../../../sites/exp.arolariu.ro/requirements.txt)
  owns production dependency specifiers, including compatible ranges.
- [`requirements-dev.txt`](../../../../sites/exp.arolariu.ro/requirements-dev.txt)
  includes production requirements and adds development/test/documentation
  tools.
- [`pyproject.toml`](../../../../sites/exp.arolariu.ro/pyproject.toml) owns the
  Python runtime floor and Ruff/pytest/build configuration, plus build-system
  constraints, not the application's dependency list.
- [`Dockerfile`](../../../../sites/exp.arolariu.ro/Dockerfile) installs the
  production layer, while
  [`project.json`](../../../../sites/exp.arolariu.ro/project.json) defines live
  local/Nx test and lint execution.

Preserve that layering. Do not duplicate a production specifier in the dev
file or move dependencies into `pyproject.toml` as incidental cleanup. The
repository has no committed Python lockfile; exact direct specifiers still do
not lock transitives, and compatible ranges may re-resolve differently.

## Read-Only Compatibility Pass

1. Locate the exact direct specifier text, all imports/configuration, tests,
   fixtures, telemetry, startup/lifespan code, and container/runtime use.
2. Read the exact PyPI metadata, supported Python classifiers, release notes,
   migration guide, dependency constraints, and security advisories.
3. Resolve the proposed graph with a resolver dry-run/report that ignores
   installed state, without installing into or altering any environment;
   compare direct and transitive packages. Record `pip inspect`/`pip freeze`
   from a pre-existing known-clean environment only as observed evidence, not
   as a lock or proof that the index can reproduce it later.
4. For FastAPI/Pydantic changes, inspect request/response validation,
   serialization, model config, dependency injection, exception handling,
   OpenAPI, test client, and the compatible Starlette/httpx graph.
5. For Ruff/pytest changes, inspect selected rules, discovery naming, fixtures,
   async behavior, warning/error defaults, plugins, and coverage configuration.
6. Check production image compatibility separately from the dev/test
   environment.

Read-only diagnostics may include registry metadata queries,
`python -m pip check`/`python -m pip inspect`, and a resolver `--dry-run` with
`--ignore-installed` and its report sent to standard output. Installing
packages into any environment, changing a specifier, writing a repository
lock/snapshot, or rebuilding an image remains blocked before approval.

## After Explicit Approval

1. Establish focused pytest/Ruff/runtime baselines from live project
   configuration.
2. Before changing a specifier, decide the approved rollback guarantee. If
   exact graph restoration is required, create an approved resolver-consumable
   fully pinned/hash-verified lock or constraints snapshot, or retain immutable
   environment/image artifacts. A diagnostic graph dump alone cannot enforce
   restoration.
3. Change the approved direct specifier in its owning requirements layer.
4. Resolve/install in a clean isolated environment and inspect all transitive
   changes before editing source.
5. Update one compatibility cohort at a time: models/validation,
   routes/dependencies, telemetry/lifespan, tests/tooling, then container.
6. Run focused tests and lint after each cohort, then exercise application
   startup and health/config routes.
7. Build or otherwise validate production-container dependency installation
   when runtime packages changed.
8. Confirm the dev layer still includes the production layer exactly once and
   no undeclared import is satisfied only by a stale local environment.

Without resolver-enforcing evidence, rollback restores the exact requirement
files and source/configuration, recreates a clean environment, and revalidates
behavior. It does not promise the same compatible or transitive versions that
were observed before mutation; record that limit and any graph drift.

## Stop Conditions

- The target excludes the live Python runtime or platform.
- FastAPI/Pydantic/Starlette/httpx constraints cannot resolve together.
- Tooling migration would silently reformat or rewrite unapproved files.
- Exact graph rollback is required but no approved resolver-enforcing
  lock/snapshot or immutable artifact exists before mutation.
- Request/response, OpenAPI, auth/security, schema/data, or runtime behavior
  changes without separate approval.
- Local tests pass only because the environment contains undeclared/stale
  packages or differs from the production image.
