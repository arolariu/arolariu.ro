# Local Environment Troubleshooting

Enter through the concrete symptom. Capture the first failed command, resource,
probe, or dependency; do not restart everything first.

| Failure | Inspect | Decision / correction |
| --- | --- | --- |
| Engine unavailable or wrong backend | `selection.ts`, `adapters.ts`, wrapper preflight output | Confirm explicit engine. Rancher must own its Docker-compatible backend; Podman and its Compose provider must answer. Docker Desktop is unsupported. Ask before installing/configuring a provider. |
| Compose provider failure | Selected adapter's Compose version, provider path, owning Compose file | Reject delegation to Docker Desktop. Correct runtime/provider configuration; do not bypass the wrapper. |
| Existing container/name/network collision | Preflight warning, selected-engine `ps -a`, Compose project status | Identify exact owning project/container. Stop or remove only reversible requested resources; ask before deleting state. |
| Port already bound | Live endpoints/mappings, listener PID, exact process/container identity | Stop the verified requested service or choose a mode-compatible port only if live configuration supports it. Never kill by process name. |
| SQL unhealthy | SQL container/resource logs, live readiness check, current password parameter/variable name, host mapping | Wait for query readiness, distinguish missing shell config from auth/TDS/TLS failure, and keep credential values out of output. Do not reset the database without approval. |
| Cosmos unhealthy | Emulator logs, gateway endpoint, health check, AppHost/Compose persistence and bootstrap | Allow cold initialization, then verify endpoint mode and local bootstrap resources. Do not delete emulator data/volumes as a shortcut. |
| Azurite unhealthy or uploads fail | Blob/queue endpoints, resource health, CORS/bootstrap logs, container/queue existence | Distinguish transport readiness from CORS/resource bootstrap. Aspire applies its bootstrap; selfhost has its own bootstrap path. Ask before container/volume deletion. |
| Redis unhealthy | Current AppHost/Compose password and TLS declarations, resource logs, health command | Match the active mode's injected secret/TLS behavior without printing values. Do not copy a checked-in example value into guidance. |
| exp config generation/start failure | `ExpConfigGenerator.cs`, `config/loader.py`, source/target file existence and JSON shape, active mode path | Docker-mode config is the developer-owned source; Aspire output is generated and ignored. Fix endpoints only through the existing overlay contract. Ask before changing secrets or installing Python packages. |
| exp live but not ready | Compare exp liveness and readiness route implementations and payload/status | Treat readiness failure as config unreadiness; follow its log before starting API dependents. |
| API startup/health failure | AppHost/selfhost dependency graph, API health report entries, exp readiness, identity/bootstrap completion | Trace the named failed health check or upstream. Do not diagnose the website until API dependencies are ready. |
| Website unhealthy | Website foreground/container logs and its live health route dependency entries | Separate website serving/build failure from exp/API dependency failure; repair the first unhealthy upstream. |
| Local TLS failure | Active mode scheme, website dev script, Traefik routes/TLS file, cert existence and trust | Native website HTTPS and selfhost Traefik have different owners. Ask before mkcert generation, CA install, host-file, certificate, or trust changes. |
| OTLP export/TLS or protocol failure | AppHost launch settings and exp OTLP environment in `Program.cs`; dashboard endpoint logs | Verify the injected HTTP/protobuf versus gRPC endpoint and scheme. Do not disable TLS or telemetry globally to hide a protocol mismatch. |
| Image/build failure | Root image script, target mapping, Dockerfile, repository-root context, generator step | Frontend/backend may require generated artifacts before build; derive that gate from `image.ts`. Ask before dependency installation. Preserve the first failing build stage. |
| Health says running but user path fails | Probe semantics, direct route, reverse proxy, immediate upstreams | A liveness probe may not prove readiness or dependencies. Check the narrow user path after readiness and report both outcomes. |

## Bounded Recovery Order

1. Correct engine/provider selection.
2. Resolve exact port or stale-resource ownership.
3. Recover infrastructure transport and readiness in dependency order.
4. Verify bootstrap/config resources.
5. Recover exp/config and local identity resources.
6. Recover API, then website.
7. Recheck only the affected route and one immediate consumer.

Use current `Program.cs` and `buildSelfhostPlan` to adjust this order if the
graph changes.

## Unsafe Shortcuts

- Do not switch to Docker Desktop, direct unwrapped Compose, or an unrelated
  engine to “see if it works.”
- Do not expose config endpoints, connection strings, secret parameters, or
  generated config content in logs or reports.
- Do not solve readiness by deleting volumes, pruning images/networks,
  recreating all containers, disabling TLS, or weakening health checks without
  separate approval.
- Do not run dependency installers, certificate trust commands, infrastructure
  changes, or broad/name-based process termination as troubleshooting.
