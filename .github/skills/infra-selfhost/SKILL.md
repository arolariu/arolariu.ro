---
name: infra-selfhost
description: Start, observe, troubleshoot, restart, or stop local Aspire, selfhost, Rancher Desktop, Podman Desktop, container, and standalone-service environments. Use for local services, dashboards, health checks, logs, images, Compose operations, and startup troubleshooting.
---

# Local Infrastructure Selfhost Operations

## When to Use

- Start, observe, diagnose, restart, or stop a repository local environment.
- Investigate an Aspire dashboard/resource, selfhost container, health probe,
  local dependency, log stream, port conflict, or startup failure.
- Perform a narrow standalone-service fallback or an ad hoc local image or
  Compose operation.

## When Not to Use

- Do not use this skill to change application behavior, Bicep, deployment
  infrastructure, workflows, dependencies, credentials, or security policy.
- Do not treat the production status site or a cloud deployment as a local
  operations target.
- Do not use Docker Desktop. Select exactly `rancher` or `podman`; the Rancher
  adapter may use the Docker-compatible CLI owned by Rancher.

## Required Inputs

- The requested outcome: start, observe, troubleshoot, restart, or stop.
- The intended mode and scope: full environment, stack, or named service.
- An explicit engine selection: `rancher` or `podman`.
- Root `AGENTS.md`, live root `package.json` scripts, and the current source
  owners named in [Mode and source decisions](references/mode-and-source-decisions.md).
- Any data that must survive and whether the user has explicitly approved the
  expected bootstrap/reset or teardown semantics.

## Mode Decision

| Need | Mode |
| --- | --- |
| Normal development, native apps, hot reload, containerized dependencies, integrated telemetry | Aspire (default) |
| Full container/image/deployment-shape parity | Selfhost |
| One app or watcher without full-stack coordination | Standalone fallback |
| One image or one Compose file/action | Ad hoc image/Compose |

Do not silently substitute modes. Selfhost is not the default merely because
the issue mentions containers.

## Core Procedure

1. Read the live scripts and select a mode using the table above. Reopen
   `package.json` immediately before forming a command; script values, not this
   skill, own executable invocations.
2. Require `rancher` or `podman` explicitly. Read
   `scripts/container-runtime/{selection,adapters,preflight}.ts` to confirm the
   current adapter and capability checks. Reject Docker Desktop.
3. Run the triggered items in
   [Preflight and lifecycle checklist](checklists/preflight-and-lifecycle.md).
   Stop at any dependency-install, trust-store, credential, destructive-data,
   or infrastructure boundary.
4. Start only the requested scope through the current root script. Keep Aspire
   and standalone foreground owners visible. The selfhost wrapper intentionally
   starts Compose projects detached; after it exits, continue ownership through
   the selected engine's Compose status and logs rather than adding another
   background wrapper.
5. Observe startup in dependency order. For Aspire, use the AppHost terminal
   and dashboard resource graph. For selfhost, inspect each Compose project
   and then application logs. Do not declare readiness from a running process
   or container alone.
6. Derive service URLs and health paths from live source. Check readiness
   gates before dependents, then test the narrow user-facing path. Preserve
   HTTP status and structured failure details in the report, but redact
   credentials, connection strings, tokens, and config values.
7. If a concrete failure appears, load only the matching row in
   [Troubleshooting](references/troubleshooting.md). Trace the first unhealthy
   dependency rather than restarting the whole environment speculatively.
8. For restart or stop, use the smallest owning foreground process, Compose
   service, or stack. Recheck persistence semantics before any `down`. Never
   add volume deletion, pruning, or broad process termination implicitly.
9. Re-observe the affected health gate after a restart. On stop, verify only
   the requested resources stopped and report preserved versus removed state.

## Authority and Safety

- An explicit request to start or stop named local services authorizes the
  smallest reversible lifecycle action.
- Ask before deleting volumes/data, accepting an expected destructive reset
  that was not already acknowledged, changing credentials or security
  settings, installing dependencies/tools, changing certificates or a trust
  store, changing infrastructure/deployment files, or terminating unrelated
  or broad sets of processes.
- Never use name-based process killing (`Stop-Process -Name`, `taskkill /IM`,
  `pkill`, or `killall`). Attribute a listener to an exact PID and verify its
  command before stopping that PID.
- Never print or copy secret values. Refer to variable names and owning,
  ignored/user-secret files only.

## Resource Triggers

Load only the resource whose decision or failure is active:

| Named trigger | Resource |
| --- | --- |
| Before choosing Aspire, selfhost, standalone, or ad hoc operation, or before locating a URL/health/log source | [Mode and source decisions](references/mode-and-source-decisions.md) |
| Before every start, restart, or stop, and whenever ports, bootstrap, certificates, config, or persistence may be involved | [Preflight and lifecycle checklist](checklists/preflight-and-lifecycle.md) |
| After selecting a mode and immediately before forming a start/status/log/health/stop command | [Command derivation examples](examples/command-derivation.md) |
| Only after a concrete engine, Compose, port, dependency, config, API, website, TLS/OTLP, image, or build failure | [Troubleshooting](references/troubleshooting.md) |

## Verification

- The selected engine is explicit and the repository preflight accepted its
  backend and Compose provider.
- Readiness is proven from the current dashboard/probe source, not inferred
  from process existence.
- Status and logs cover the failing dependency and its immediate consumer.
- Stop/restart scope is minimal; persistence and bootstrap effects are stated.
- No secret value appears in commands or output, and no unapproved install,
  trust, credential, data, infrastructure, or deployment change occurred.

## Completion Contract

Report the mode, engine, requested scope, exact commands run, live source used
for URLs and probes, observed health/log evidence, and final lifecycle state.
State any bootstrap/data effect, certificate/security boundary, incomplete
check, or manual checkpoint. Do not commit.
