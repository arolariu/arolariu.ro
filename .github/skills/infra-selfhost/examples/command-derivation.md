# Command Derivation Examples

These are construction patterns, not a frozen command catalog. Reopen the
root `package.json` and the named wrapper before each use.

## Root Script Pattern

1. Select the logical script (`dev`/Aspire, selfhost start/logs/stop,
   standalone service, image, or Compose) from `package.json`.
2. Read that script's current entrypoint and accepted arguments.
3. Invoke it as:

```text
npm run <current-script-name> -- --engine <rancher|podman> <current-arguments>
```

Do not add `--engine` to a standalone script that does not consume the
container-runtime selector. If it needs infrastructure, start that
infrastructure separately with an explicit engine.

## Status and Logs

For selfhost, keep operations within the owning Compose file:

```text
npm run <current-compose-script> -- --engine <engine> --file <live-compose-file> -- ps
npm run <current-compose-script> -- --engine <engine> --file <live-compose-file> -- logs --tail <lines> <service>
```

Use the current selfhost logs script for its declared application scope; read
`buildSelfhostPlan` before assuming it includes infrastructure. For Aspire,
prefer dashboard resource console output and the AppHost terminal.

## Health Lookup

Use tracked source to locate the endpoint rather than copying a URL:

```powershell
git --no-pager grep -n -E 'With(Http|Https)Endpoint|WithHttpHealthCheck|MapHealthChecks' -- tooling/AppHost sites
git --no-pager grep -n -E 'ports:|healthcheck:|Host\(' -- infra/Local
```

Combine the active mode's scheme/host/port with the route defined by its live
service source. Preserve certificate validation by default; bypassing local
TLS verification is a diagnostic exception, not a permanent fix.

## Port Attribution

On PowerShell, inspect a conflicting listener, then verify the exact process:

```powershell
Get-NetTCPConnection -LocalPort <port> | Select-Object LocalAddress,LocalPort,State,OwningProcess
Get-CimInstance Win32_Process -Filter 'ProcessId = <owning-process-id>' |
  Select-Object ProcessId,Name,ExecutablePath,CommandLine
```

Stop only the verified PID when it is the explicitly requested local service.
Never translate this into a process-name kill or broad termination command.

## Narrow Lifecycle

Use the Compose wrapper with the live file and exact service for
`stop`, `start`, or `restart`. Use the full selfhost stop script only after
checking its current `down` plan and persistence effect. For ad hoc images,
derive targets, Dockerfiles, ports, generated-artifact prerequisites, and
runtime environment from `scripts/container-runtime/image.ts`.
