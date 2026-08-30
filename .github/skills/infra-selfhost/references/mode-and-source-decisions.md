# Mode and Source Decisions

## Choose the Owner

| Mode | Behavior | Live owners to reopen |
| --- | --- | --- |
| Aspire | AppHost runs applications natively and asks the selected engine for infrastructure containers | `package.json`; `scripts/container-runtime/aspire.ts`; `tooling/AppHost/Program.cs` |
| Selfhost | Management, storage, API, and website run through ordered Compose projects | `scripts/container-runtime/selfhost.ts`; `infra/Local/**/docker-compose.yml` |
| Standalone | One root/Nx development target runs without AppHost coordination | Root `package.json`, the service package/project manifest, and its nearest `AGENTS.md` |
| Ad hoc | One supported image target or Compose file is operated through the engine adapter | Root `package.json`; `scripts/container-runtime/{image,compose}.ts`; `infra/containers/**`; selected Compose file |

Use standalone only when missing dependencies are intentional or already
running. An API or website symptom usually needs its upstream chain, not an
isolated process.

## Engine Decision

- `scripts/container-runtime/selection.ts` owns accepted engine names and
  selection precedence.
- `adapters.ts` owns the executable used for each operation. Rancher uses its
  Docker-compatible backend; this does not make Docker Desktop supported.
- `preflight.ts` owns CLI/backend/Compose checks and collision warnings.
- Keep the engine explicit on every root wrapper invocation. An environment
  default may exist, but do not rely on invisible state in an operations
  report.

## Dependency Ordering

Read the graph before acting:

- Aspire ordering is expressed by `WaitFor`, `WaitForCompletion`, references,
  endpoint declarations, and health checks in `tooling/AppHost/Program.cs`.
  Infrastructure gates config/identity/bootstrap resources; those gate the
  API; the API gates the website. Independent sites should not block a narrow
  request unless their live declarations say otherwise.
- Selfhost ordering is the command plan in
  `scripts/container-runtime/selfhost.ts`: management before storage and its
  bootstrap, then backend, then frontend. Its normal teardown is the reverse.
- Compose `depends_on`, profiles, health checks, networks, ports, and volumes
  in each live file refine the wrapper order. Do not infer them from docs.

## URL and Health Lookup

Never use a remembered service table as authority. Derive the active endpoint:

1. Aspire dashboard and OTLP bindings:
   `tooling/AppHost/Properties/launchSettings.json`.
2. Aspire resource names, endpoints, schemes, dependencies, and health paths:
   `tooling/AppHost/Program.cs`; shared port symbols:
   `tooling/AppHost/Constants.cs`.
3. Selfhost host ports and container health checks:
   `infra/Local/**/docker-compose.yml`; generated HTTPS routes:
   `scripts/container-runtime/traefik.ts`.
4. Image-level health commands: `infra/containers/Dockerfile.*`.
5. Probe meaning and response:
   - API: the `MapHealthChecks` call under
     `sites/api.arolariu.ro/src/Core/Domain/General/Extensions/`.
   - exp: `sites/exp.arolariu.ro/api/health.py` (distinguish liveness from
     readiness).
   - website: `sites/arolariu.ro/src/app/api/health/route.ts` (includes
     upstream checks).
   - other services: search their live route source and manifest; absence of a
     dedicated probe means test the narrow serving endpoint without calling it
     a health contract.

## Observation Source

| Scope | First evidence | Follow-up |
| --- | --- | --- |
| Aspire | AppHost terminal and dashboard resource state | Resource console logs, traces, then live health route |
| Selfhost | Compose `ps` for each owning project | Selected container/service logs, health route, dependency logs |
| Standalone | Owning foreground terminal | Service route plus required upstream checks |
| Ad hoc image | Build/run command exit and selected-engine status | Image inspect or container logs, then Dockerfile probe |

The management healthchecks web application is not a substitute for current
container health, Aspire resource state, or direct service readiness.
