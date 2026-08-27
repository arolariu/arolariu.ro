# Preflight and Lifecycle Checklist

## Decision Table

| Check | Evidence | Action |
| --- | --- | --- |
| Requested scope and mode | User request plus mode table | Clarify before starting a broader environment |
| Explicit engine | `rancher` or `podman` | Ask if absent; reject Docker Desktop |
| Runtime capability | Current wrapper preflight and selected adapter | Fix configuration only; ask before installing a provider/tool |
| Repository prerequisites | Root engines/scripts and existing installed state | Ask before any install or generated dependency state |
| Ports | AppHost constants/endpoints, Compose mappings, and current listeners | Attribute conflicts to exact PID/container before action |
| Config/secrets | Required variable names and ignored/user-secret source files | Report missing names only; never print values |
| Certificates | Current selfhost cert paths and startup certificate branch | Ask before certificate generation or local CA/trust-store mutation |
| Data/bootstrap | Current AppHost bootstrap and selfhost bootstrap paths | Explain reset/ensure behavior; ask before destructive effects |
| Persistence | Current Compose/AppHost volume declarations | Choose stop versus down based on data that must survive |

## Start

- Confirm the repository dependencies already exist. Aspire may create
  installer resources for native apps; do not authorize a missing package or
  Python environment install by calling it startup.
- Aspire startup generates an ignored exp Aspire config from the developer's
  Docker-mode source config. It must not mutate or expose that source's secret
  values. Inspect `ExpConfigGenerator` before diagnosing generation.
- Aspire's local scenario bootstrap deliberately clears and repopulates the
  guarded local Cosmos invoice-domain data, invoice blob container, and
  analysis queue. Obtain acknowledgement before risking unpreserved local
  work; verify the guard still restricts targets to local emulators.
- Selfhost startup requires the current SQL password variable in the shell and
  performs SQL/Cosmos/Azurite/storage bootstrap. The storage-only .NET branch
  ensures resources rather than running the Aspire scenario reset; verify this
  in current source.
- If selfhost certificates are absent, current startup may generate a key/cert
  and install a local CA when the certificate tool is available. Stop and ask
  before that security/trust change; do not display key material.

## Observe

- Wait for dependencies in the live graph; “running” is not “ready.”
- Aspire: inspect resource state and console output in the dashboard, then the
  declared health check. Use traces/logs only after resource readiness points
  to an application failure.
- Selfhost: run Compose `ps` per project. The root selfhost logs script may
  cover only application containers; query the owning storage or management
  Compose project for infrastructure logs.
- Record the first failing resource, its immediate dependency, probe status,
  and bounded log excerpt. Redact values after `Password`, `Key`, `Secret`,
  `Token`, authorization headers, and connection strings.

## Restart and Stop

| Intent | Preferred action |
| --- | --- |
| Restart one unhealthy selfhost service | Compose wrapper against its owning file and exact service |
| Pause a selfhost service while preserving its container layer | Compose `stop`, then `start` |
| Normal full selfhost teardown when removal semantics are accepted | Current root selfhost stop script |
| Stop Aspire | Send the normal interrupt to the owning AppHost foreground terminal |
| Stop a standalone service | Interrupt its owning terminal; otherwise verify and stop its exact PID |

Before selfhost `down`, inspect each live volume declaration. Named volumes
survive ordinary `down` unless volume removal is explicitly requested, but
data held only in a removed container writable layer does not. Ask if that
would destroy data the user expects to keep.

Never append `-v`/`--volumes`, remove a volume, prune runtime state, reset a
database, delete generated credentials, or terminate a process set without
specific approval. After stopping, use the selected engine's status command
or Compose `ps` to prove the requested scope is no longer running.
