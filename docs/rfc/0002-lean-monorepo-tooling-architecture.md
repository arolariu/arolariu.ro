# RFC 0002: Lean Monorepo Tooling Architecture

- **Status**: Accepted
- **Date**: 2026-08-31
- **Authors**: Alexandru-Razvan Olariu, GitHub Copilot
- **Related Components**: `scripts/`, `package.json`, `package-lock.json`, `.arolariu/tooling.local.json`

---

## Abstract

This RFC defines a leaner architecture for the repository tooling under
`scripts/`. It replaces bespoke command-line parsing, process mechanics,
workspace graph construction, and host inventory code with exact-pinned
industry packages while preserving repository-specific setup, diagnosis,
security, redaction, and orchestration policy.

The design keeps the existing specialist setup and doctor modules, introduces
a shared typed inspection core, removes obsolete persisted fingerprints and
serialization boundaries, and makes `npm run setup` the comprehensive
post-install workspace wizard. A normal doctor run performs comprehensive host
and tooling inspection; `--quick` remains the bounded path for status and
routine automation.

---

## 1. Context and Motivation

### 1.1 Current State

The tooling currently owns substantial infrastructure that mature packages or
existing platform APIs can provide:

- hand-written argument parsing and help output;
- low-level cross-platform child-process mechanics;
- an Nx-compatible workspace graph implementation;
- repeated setup and doctor discovery for the same toolchains and packages;
- dependency fingerprints persisted in local tooling configuration;
- a duplicated, documentation-heavy script environment type model;
- a serialized doctor report parser used only by the status command;
- a large TypeScript source interpreter that checks doctor read-only policy;
- temporary Postman collection mutation for authentication values already
  supported by Newman runtime variables;
- a second child-process implementation in the documentation assembler.

After excluding the lint and format worker stack, which is outside this RFC,
the current scope is approximately 23,061 production lines and 18,873 test
lines. Setup and doctor account for most of the remaining implementation and
test footprint.

The current design also repeats expensive observations. React, Svelte, setup,
doctor, and status independently inspect package trees, project metadata,
tool versions, infrastructure, and repository state. Failure paths can attach
large command payloads to diagnostics, producing noisy output that obscures
the actionable error.

### 1.2 Goals

This RFC has the following goals:

1. Reduce the net production and test code owned under `scripts/`.
2. Use established packages for generic CLI, process, graph, and host
   inspection mechanics.
3. Keep repository policy explicit, typed, testable, and independent of those
   packages.
4. Make the supported fresh-clone flow predictable:

   ```text
   git clone
   npm install  # or: npm ci
   npm run setup
   ```

5. Make setup a comprehensive, dependency-aware, consent-controlled wizard.
6. Make doctor comprehensive by default while keeping a fast `--quick` mode.
7. Preserve first-class Windows, Linux, and macOS behavior.
8. Prevent raw package or command output from flooding human diagnostics.
9. Keep doctor repository-read-only and keep secrets out of logs and reports.
10. Retain stable npm script names and existing behavior unless this RFC
    explicitly changes it.

### 1.3 Non-goals

This RFC does not:

- change `lint.ts`, `format.ts`, their Piscina workers, or their behavior;
- migrate Python tooling from pip and `.venv` to `uv`;
- add a Windows/macOS GitHub Actions matrix;
- replace repository-specific taxonomy, license, i18n, environment,
  exchange-rate, container lifecycle, or Newman report logic;
- make `npm run setup` bootstrap its own root npm dependencies;
- add a generic setup or doctor framework;
- make raw `envinfo` or `systeminformation` output part of a public contract.

The lint/format architecture and a potential `uv` migration require separate
designs.

---

## 2. Developer-facing Contracts

### 2.1 Bootstrap Contract

Contributors must run either `npm install` or `npm ci` before
`npm run setup`. This guarantees that Commander, Execa, Nx Devkit, envinfo,
systeminformation, and all other root tooling dependencies are available when
setup starts.

Setup validates the root npm tree and lock/manifests. It does not rerun root
`npm ci`. If the root tree is missing or invalid, setup fails early with a
concise explanation and the exact repair command.

Setup continues to own dependency restoration outside the root npm tree,
including:

- `.github/scripts` through `npm ci`;
- .NET packages through `dotnet restore`;
- the Python `.venv`, requirements installation, and `pip check`.

### 2.2 Stable Commands

Existing npm script names remain stable. Existing command flags remain stable
except for the doctor simplification in section 2.3.

Commander becomes the help and argument owner for migrated commands. Every
migrated command presents a consistent repository banner, usage, options,
examples, and logger-backed error output.

### 2.3 Doctor CLI

Doctor exposes only these user options:

| Purpose | Long | Short | Slash |
| --- | --- | --- | --- |
| Fast bounded profile | `--quick` | `-q` | `/q` |
| Additional bounded evidence | `--verbose` | `-v` | `/v` |
| Help | `--help` | `-h` | `/h` |

The following flags are removed:

- `--ci`: doctor no longer has a special CI mode;
- `--json`: the typed report becomes an internal API;
- `--score`: the health score and grade are always rendered.

A normal doctor run performs all local-host diagnostics regardless of the
`CI` environment variable. Callers that require the bounded profile use
`--quick` explicitly.

### 2.4 Read-only Contract

Doctor must not mutate tracked files, repository-local ignored state,
`.nx`, or `.arolariu`. Nx state is redirected to an operating-system
temporary directory.

A normal doctor run is not globally side-effect-free. The approved
`envinfo` and `systeminformation` collectors may execute observational native
commands, read container sockets and operating-system interfaces, populate
external operating-system caches, and perform their built-in network probes.
Those operations must not write into the checkout.

---

## 3. Architecture

### 3.1 Overview

```text
Commander CLI entrypoints
  |
  +-- setup policy modules --------------------------+
  |                                                  |
  +-- doctor policy modules -------------------------+--> shared InspectionSession
  |                                                  |      |
  +-- status and auxiliary commands ----------------+      +-- Nx workspace provider
                                                            +-- envinfo tooling provider
                                                            +-- systeminformation host provider
                                                            +-- package/repository inspectors
                                                            +-- Execa-backed CommandRunner
```

The architecture separates three responsibilities:

1. **Mechanics** are delegated to pinned packages and narrow adapters.
2. **Facts** are collected by read-only inspectors and represented as typed
   outcomes.
3. **Policy** remains in setup, doctor, status, and domain-specific scripts.

Inspectors do not return setup actions or doctor diagnostics. They return
facts such as installed versions, package state, project dependencies,
container state, host resources, and configuration presence. Setup and doctor
interpret the same fact differently without depending on one another.

### 3.2 CLI Adapter

A shared `createToolProgram()` factory wraps Commander and owns:

- repository banner and help layout;
- logger-backed help and error output;
- `exitOverride()` so entrypoints retain `main(): Promise<number>`;
- argument normalization for existing slash aliases;
- consistent unknown-option and missing-argument behavior;
- help-before-work behavior;
- examples and command-specific epilogues.

Each command declares only its arguments, options, subcommands, and semantic
validation. Command modules must not write directly to process streams.

### 3.3 Process Adapter

Execa replaces the low-level `spawn()` implementation but remains behind the
existing repository interfaces:

- `CommandSpec`;
- `CommandRunOptions`;
- `CommandResult`;
- `CommandRunner`.

The adapter preserves repository behavior that Execa does not own:

- a pre-aborted signal must not start a child process;
- results remain non-throwing and map transport failures explicitly;
- command execution remains injectable in tests;
- stdin and environment values are never logged;
- tee output passes through chunk-safe logger redaction;
- timeout classes and caller overrides remain repository policy;
- `shell` remains disabled unless an existing command explicitly requires it;
- repository-local executable preference is never enabled globally.

Direct Execa imports are restricted to the process adapter and approved
inspection-worker boundaries.

### 3.4 Inspection Session

One `InspectionSession` is created per setup, doctor, or status run. It
memoizes immutable typed observations so multiple policy modules do not repeat
the same command or host probe.

Representative providers are:

- workspace and package inventory;
- Nx projects and dependency graph;
- generic tool inventory;
- comprehensive host information;
- .NET SDK, workload, certificate, and AppHost state;
- Python interpreter, virtual environment, requirements, and package health;
- container runtime, port, process, and certificate state;
- React and Svelte package/configuration state;
- generated artifact and environment configuration state.

Mutating setup phases invalidate only the observations they changed and then
rerun those inspectors to verify postconditions. No cache survives the
process, and no inspection result is written to tooling configuration.

### 3.5 Inspection Outcomes

Providers return an outcome equivalent to:

```typescript
type InspectionOutcome<T> =
  | {readonly kind: "available"; readonly value: T; readonly durationMs: number}
  | {readonly kind: "unavailable"; readonly reason: string; readonly durationMs: number}
  | {readonly kind: "invalid"; readonly issues: readonly string[]; readonly durationMs: number};
```

The exact type may differ during implementation, but it must preserve these
semantics:

- absence, invalid state, and transport failure are distinct;
- no provider returns a success-shaped default;
- raw command or package output is not an outcome;
- callers decide whether an unavailable fact is a warning, failure, skipped
  check, or blocked setup phase.

---

## 4. Package Ownership

The following exact root dev dependencies are approved:

| Package | Version | Ownership |
| --- | --- | --- |
| `@nx/devkit` | `23.1.1` | Project discovery and dependency graph |
| `commander` | `15.0.0` | CLI parsing, validation, subcommands, and help |
| `execa` | `10.0.1` | Child-process mechanics behind `CommandRunner` |
| `envinfo` | `7.21.0` | Comprehensive generic tooling inventory |
| `systeminformation` | `5.33.6` | Comprehensive host and operating-system inventory |

`@nx/devkit@23.1.1` is already resolved transitively through the matching Nx
workspace package. Commander and envinfo have no declared runtime
dependencies. Execa adds its maintained process-support dependency graph.
Systeminformation is already present transitively at an older patch and
becomes an intentional exact direct dependency at the approved version.

The packages own generic acquisition and mechanics only. They do not own:

- repository version requirements;
- setup consent or mutation scopes;
- pass, warning, failure, and skipped policy;
- root-cause and fix text;
- secret classification or output redaction;
- diagnostic scoring;
- repository-specific package, framework, environment, or generated-artifact
  contracts.

Package versions remain exact. Updates to envinfo or systeminformation require
a targeted review of changed native commands, sockets, network behavior,
collected fields, and security advisories.

---

## 5. Workspace and Host Providers

### 5.1 Nx Workspace Provider

The custom workspace graph implementation is replaced by
`createProjectGraphAsync()` and other public Nx Devkit APIs.

The adapter must:

- disable the Nx daemon;
- disable Nx dotenv loading where supported;
- redirect workspace data and task cache to unique operating-system temporary
  paths;
- filter nodes and edges to repository projects;
- normalize duplicate static/dynamic edges into the repository's logical view;
- perform a small local cycle interpretation only if no suitable public Nx
  helper exists;
- clean its temporary namespace or leave it safe for operating-system cleanup;
- never mutate repository `.nx` state.

If dependencies are unavailable, the CLI itself cannot start under the
documented bootstrap contract. If Nx graph construction fails after startup,
the provider returns an unavailable or invalid outcome; it does not fall back
to a second graph implementation.

### 5.2 envinfo Tooling Provider

A normal run requests envinfo's full supported inventory. The adapter parses
the package JSON representation and projects it into a repository-owned typed
model.

The normalized model may contain:

- operating-system and shell identity;
- Node and package-manager versions;
- language and build tool versions;
- utility and virtualization tool versions;
- package inventory facts needed by setup or doctor.

Repository-specific inspectors remain authoritative for contracts envinfo
cannot establish, including npm tree integrity, .NET SDK/workloads, Python
virtual-environment isolation, framework package relationships, certificates,
and generated artifacts.

Raw envinfo output is never rendered or persisted.

### 5.3 systeminformation Host Provider

A normal run uses the package's comprehensive aggregate host collectors. The
result can include OS, CPU, virtualization, memory, storage, processes,
network endpoints, hardware identifiers, services, and Docker information.
Built-in aggregate network probes are allowed.

The adapter immediately projects that raw result into repository facts such
as:

- supported platform and architecture;
- CPU and virtualization capability;
- available memory and storage;
- resource pressure relevant to local development;
- ownership of required development ports;
- container/runtime observations;
- network reachability evidence;
- conflicts that explain setup or doctor failures.

Unrelated process, network, user, serial, hardware, and container details are
discarded. Raw aggregate data is not logged, returned by the public provider,
or persisted.

### 5.4 Collector Isolation

The broad envinfo and systeminformation collection should execute in a
dedicated inspection worker invoked through the Execa-backed runner. The
worker:

- imports and invokes the third-party packages;
- accepts no user-controlled command, function, or field selectors;
- projects and redacts inside the worker;
- emits one normalized JSON document;
- is subject to a bounded parent timeout and best-effort descendant cleanup;
- emits no progress or package-native output.

This boundary limits memory retention, prevents raw host data from reaching
the main logger, and gives the parent a process-level timeout even though the
packages own their internal commands.

`--quick` does not start the aggregate worker.

---

## 6. Setup Design

### 6.1 Execution Flow

Setup executes four stages:

1. **Inspect**
   - Validate root dependencies and repository prerequisites.
   - Collect one shared host, tooling, workspace, and package snapshot.
   - Identify missing tools, invalid state, and already-satisfied
     postconditions.
2. **Plan**
   - Convert facts into dependency-ordered setup actions.
   - Preserve existing action scopes, consent, `--yes`, `--dry-run`, and
     interruption behavior.
   - Present platform-specific installation proposals for missing system
     tools.
3. **Execute**
   - Run approved mutations through the shared runner and logger.
   - Restore setup-owned dependency domains using their standard tools.
   - Prepare certificates, browsers, environments, framework state, and
     generated artifacts.
4. **Verify**
   - Refresh affected observations.
   - Check explicit postconditions.
   - Produce a final readiness summary from the same typed facts.

### 6.2 Root npm Validation

The root dependency phase:

- verifies `node_modules` is a directory;
- verifies the package manifest and lockfile are coherent;
- runs one structured npm integrity inspection;
- summarizes invalid, missing, or extraneous dependencies without attaching
  the entire npm tree.

It never runs root `npm ci`. Failure directs the contributor to run
`npm ci`, then rerun setup.

### 6.3 Setup-owned Restores

When their phases execute, setup runs deterministic tool-native operations:

- `.github/scripts`: `npm ci --prefer-offline --no-audit --no-fund`;
- .NET: the established `dotnet restore` selection;
- Python: create or reuse the canonical `.venv`, install the requirements
  files, and run `pip check`.

Framework sync, Playwright/browser preparation, certificates, environment
generation, and repository generators continue through their established
commands and policies.

### 6.4 Removal of Fingerprints

The following concepts are removed:

- `SetupFingerprints`;
- Node-version fingerprints;
- root and `.github/scripts` lockfile hashes;
- Python requirements hashes;
- fingerprint invalidation and merge rules;
- fingerprint write actions;
- fingerprint-specific setup tests;
- `sha256File` when no remaining caller needs it.

`.arolariu/tooling.local.json` retains only schema information and durable
non-secret preferences such as the selected container engine.

### 6.5 Failure Behavior

Critical prerequisite failures block dependent phases. Independent phases may
continue where their inputs are valid.

Setup must:

- distinguish declined, planned, failed, blocked, and succeeded actions;
- surface transport failures and postcondition failures explicitly;
- never install a system dependency without the existing consent policy;
- never report success solely because a mutation command exited zero;
- verify the resulting state through the relevant inspector.

---

## 7. Doctor and Status Design

### 7.1 Profiles

Normal doctor:

- runs the full envinfo and systeminformation aggregate worker;
- runs repository-specific workspace, .NET, React, Svelte, Python, and
  infrastructure checks;
- performs applicable network, package security, and slow checks;
- always renders the health score and grade.

Quick doctor:

- skips the aggregate worker;
- skips network and other expensive checks;
- emits explicit skipped diagnostics;
- remains suitable for status and routine automation.

There is no CI-specific profile.

### 7.2 Specialist Modules

The specialist modules remain:

- workspace;
- .NET;
- React;
- Svelte;
- Python;
- infrastructure.

They consume shared facts and own only diagnosis:

- status;
- concise summary;
- bounded evidence;
- root cause or potential causes;
- ordered fixes;
- duration and score weight.

Repeated diagnostic factories, command classification, error normalization,
version formatting, package inventory, and evidence formatting move to focused
shared helpers.

### 7.3 Evidence Budget

Diagnostic evidence is structured and bounded:

- parsers keep counts and the most actionable offending items;
- human output renders a limited number of entries plus an omitted count;
- verbose mode raises the limit but remains bounded;
- unparseable command failures show transport state and a short excerpt;
- full stdout, stderr, npm trees, and third-party payloads are never copied
  into diagnostics;
- JSON-like internal reports contain normalized facts, not raw payloads.

A large failing npm payload must produce a concise diagnosis rather than
hundreds of package lines.

### 7.4 Repository-authored Command Policy

Doctor modules receive a `DiagnosticProbeRunner` that accepts opaque commands
created by named registry factories. Modules cannot construct arbitrary
`CommandSpec` values for diagnostic execution.

Scoped ESLint rules:

- forbid direct Execa and `node:child_process` imports in doctor modules;
- forbid runtime imports of the unrestricted process runner;
- forbid mutating filesystem imports;
- permit the narrow read APIs required for repository inspection.

This replaces the custom TypeScript source interpreter test. The command
registry remains covered by focused unit tests.

The registry governs repository-authored commands. It does not claim to
enumerate the internal native commands executed by the separately approved
envinfo and systeminformation worker.

### 7.5 Reporting

`createDoctorReport()` validates typed diagnostics and constructs the report
directly. It does not serialize and parse its own output.

The following remain:

- diagnostic semantic validation;
- duplicate identifier rejection;
- score weights and grade calculation;
- grouped human rendering;
- suggested fixes;
- nonzero exit status when failures exist.

The serialized `parseDoctorReport()` boundary and its untrusted-report tests
are removed.

### 7.6 Status

Status calls `runDoctor({quick: true, verbose: false})` in-process and consumes
the typed report. It does not spawn doctor or parse doctor JSON.

Status obtains projects from the Nx provider instead of a hard-coded workspace
list. Every current and future Nx project is included unless status has an
explicit documented exclusion.

Status retains its own public output options and report format.

---

## 8. Auxiliary Script Simplifications

| Current implementation | Replacement |
| --- | --- |
| `scripts/common/workspace-graph.ts` | Isolated Nx Devkit adapter |
| `scripts/types/environment.ts` | Types derived from `APP_CONFIGURATION_MAPPING` and a narrow partial record |
| Manual dotenv line parsing where compatible | `node:util.parseEnv` |
| Manual discovery walks where compatible | `node:fs/promises.glob` |
| Hand-written CLI loops and help arrays | Shared Commander factory |
| Low-level `spawn()` implementation | Execa-backed `CommandRunner` |
| `docs-assemble.ts` private runner | Shared `CommandRunner` |
| Doctor subprocess and report parser in status | In-process typed doctor API |
| Newman collection mutation/restoration | Runtime `--env-var` injection only |
| Repeated package and host inspection | Shared `InspectionSession` providers |

The E2E runner retains:

- target and authentication policy;
- runtime token redaction;
- Newman execution and timeouts;
- report sanitization;
- JSON and JUnit reports;
- assertion summaries.

The following remain custom because they encode repository behavior:

- console logger, semantic output, and chunk-safe secret redaction;
- prompt adapter, consent, dry-run, and setup action scopes;
- repository diagnoses and fixes;
- taxonomy and license artifact generation;
- next-intl synchronization;
- environment value generation and Azure mapping;
- exchange-rate transformation;
- container lifecycle policy;
- Newman report and token sanitization;
- lint and format worker tooling.

---

## 9. Proposed Module Boundaries

The exact file split may be refined during implementation, but responsibilities
must remain equivalent to:

```text
scripts/
  common/
    cli.ts                 Commander factory and slash-alias normalization
    process.ts             Execa-backed CommandRunner
    logger.ts              Existing logger and redaction
    prompts.ts             Existing prompt boundary
  inspection/
    session.ts             Per-run memoization and invalidation
    types.ts               Inspection outcomes and normalized facts
    workspace.ts           Nx and repository metadata
    packages.ts            npm and installed-package inventory
    tooling.ts             envinfo projection
    host.ts                systeminformation projection
    aggregate-worker.ts    Isolated comprehensive collection
  setup.ts
  setup.*.ts               Mutation planning and postcondition policy
  doctor.ts
  doctor.*.ts              Diagnosis policy
  doctor.probes.ts         Opaque approved command registry
  doctor.reporter.ts       Typed report construction and human rendering
  status.ts
```

Strong deletion candidates are:

- `scripts/common/workspace-graph.ts`;
- `scripts/common/workspace-graph.test.ts`;
- `scripts/types/environment.ts`;
- fingerprint-related code and tests;
- serialized doctor report parsing and tests;
- most of `scripts/doctor.readonly.test.ts`;
- collection mutation/restoration helpers in `test-e2e.ts`;
- the private process runner in `docs-assemble.ts`;
- duplicated argument parsers, help arrays, and common result factories.

---

## 10. Security and Privacy

### 10.1 Explicit Boundary Change

The current doctor can enumerate repository-authored child commands. Under
this RFC, a normal doctor also invokes pinned third-party aggregate collectors
whose internal commands, sockets, and network calls are not governed by that
registry.

This is an explicit accepted trade-off. The mitigation is boundary isolation,
exact version ownership, no user-controlled selectors, bounded execution, and
strict projection before data leaves the worker.

### 10.2 Sensitive Host Data

The aggregate collectors may observe:

- usernames and home paths;
- process names, arguments, and executable paths;
- IP addresses and network endpoints;
- MAC addresses;
- hardware and filesystem identifiers;
- container names, roots, and socket data;
- globally installed package information.

The worker must remove or normalize those values before emitting its result.
Raw aggregate data:

- remains in worker memory only;
- is never logged;
- is never written to disk;
- is never included in doctor or status reports;
- is never attached to thrown errors.

The existing logger redaction remains the final output boundary.

### 10.3 Package Updates

Updates to the five direct tooling packages require:

- exact target versions;
- release-note and security-advisory review;
- review of new dependencies;
- review of changed native commands and platform behavior;
- adapter contract tests;
- rollback to the prior exact version if behavior regresses.

### 10.4 Repository Mutation

Doctor and status must leave the checkout unchanged. Tests must verify that Nx
does not modify repository workspace data and that E2E authentication values
are never written to collections.

---

## 11. Performance

A normal doctor run intentionally performs more host discovery than the
current implementation. The shared inspection session offsets that cost by
executing each provider once per process and reusing normalized facts across
modules.

The aggregate worker has a bounded timeout. Its result is projected before
crossing the process boundary to limit serialization and memory cost.

`--quick` avoids:

- envinfo full inventory;
- systeminformation aggregate collection;
- generic outbound host probes;
- network and other slow repository checks.

Setup performs the full snapshot once, refreshes only invalidated facts after
mutations, and does not repeat root dependency installation.

---

## 12. Testing Strategy

### 12.1 Adapter Contract Tests

Tests cover repository behavior at each package boundary:

- Commander aliases, help, logger routing, semantic validation, and exit codes;
- Execa success, spawn failure, timeout, cancellation, pre-aborted no-spawn,
  capture, tee, and chunk-safe redaction mapping;
- Nx project and edge normalization plus zero checkout mutation;
- envinfo parsing, projection, malformed output, and redaction;
- systeminformation projection, malformed/partial data, and redaction;
- aggregate-worker timeout, nonzero exit, and single-document output.

Tests do not duplicate upstream parsing, spawning, or host-detection test
suites.

### 12.2 Setup Tests

Setup tests cover:

- root npm validation without root reinstall;
- deterministic `.github/scripts`, .NET, and Python restores;
- action dependencies, consent, decline, dry-run, and interruption;
- missing-tool installation proposals;
- inspector invalidation and postcondition verification;
- tooling configuration without fingerprints;
- final ready, blocked, and failed summaries.

### 12.3 Doctor and Status Tests

Tests cover:

- normal full profile and quick profile;
- accepted `-q`, `/q`, `--quick`, `-v`, `/v`, and `--verbose` forms;
- Commander help through `-h`, `/h`, and `--help`;
- rejection of removed and unknown doctor flags;
- always-visible score and grade;
- no CI-specific suppression;
- bounded evidence for a very large npm failure;
- explicit provider and module failure behavior;
- opaque diagnostic command registry use;
- status consuming typed doctor and Nx results;
- inclusion of all Nx projects.

### 12.4 Auxiliary Tests

Tests cover:

- Newman runtime authentication without collection mutation;
- token absence from reports and logs;
- documentation command execution through the shared runner;
- derived environment keys and compatible dotenv parsing;
- unchanged CLI contracts for migrated auxiliary commands.

### 12.5 Cross-platform Validation

No new GitHub Actions operating-system matrix is added. Platform branches are
tested through injected platform values and fixtures, and implementation
validation runs on the available Windows development host.

Commander, Execa, and systeminformation have upstream Windows, Linux, and
macOS coverage, but that does not replace repository-specific live
integration. Live macOS and Linux execution remains a documented residual
risk until a future workflow or manual validation adds that evidence.

---

## 13. Migration and Rollback

Implementation proceeds in reversible layers:

1. Add exact dependencies and adapters without changing orchestration.
2. Replace the process backend and migrate eligible CLIs.
3. Add the shared inspection session and package-backed providers.
4. Move setup modules onto shared facts and remove fingerprints.
5. Move doctor and status onto shared facts and typed in-process reporting.
6. Remove redundant graph, environment, E2E mutation, docs runner, helpers,
   and tests.
7. Update setup, doctor, development, and tooling documentation.

Old implementations are deleted only after their replacement contract tests
pass. Each package is contained behind a narrow repository interface, so a
failed adoption can roll back one adapter without rewriting specialist setup
or doctor policy.

The doctor flag removal and bootstrap contract are intentional user-facing
changes and must land with their documentation updates.

---

## 14. Alternatives Considered

### 14.1 Native-only Consolidation

This option would use Node built-ins and shared helpers without adding direct
dependencies. It has the lowest package risk but retains the custom graph,
process mechanics, and substantial CLI code. It removes less owned code and
provides fewer host-diagnostic capabilities.

### 14.2 Narrow Package Adoption

This option would adopt only Nx Devkit, Commander, and Execa while keeping
custom host inspection. It preserves the strongest command audit boundary but
does not meet the accepted goal of broad default envinfo and
systeminformation coverage.

### 14.3 Generic Setup or Doctor Framework

No mature framework was found that models this repository's toolchains,
consent scopes, read-only requirements, fixes, scoring, and specialist
framework diagnostics. Adopting one would replace clear policy with adapter
code and framework constraints rather than materially reducing maintenance.

### 14.4 Dev Container as the Only Setup

A dev container could eliminate much host setup logic, but it would replace
rather than improve the supported native Windows, Linux, and macOS workflow.
It is not acceptable as the sole development path.

---

## 15. Expected Reduction

The target net reduction, after adding adapters and richer diagnostics, is:

- approximately 4,500 to 6,000 production lines;
- approximately 5,000 to 7,000 test lines.

This is a planning range, not a delivery quota. The implementation must not
weaken redaction, consent, error handling, repository read-only behavior, or
cross-platform contracts to meet a line-count target.

The largest expected reductions are:

- duplicated environment type documentation and definitions;
- custom workspace graph and graph tests;
- setup fingerprint state and tests;
- duplicated setup/doctor inspectors and result factories;
- doctor source-interpreter and serialized-report tests;
- manual CLI parsing/help;
- low-level process mechanics;
- status, E2E, and documentation-runner duplication.

---

## 16. Documentation Requirements

Implementation must update:

- `scripts/README.md`;
- `DEVELOPMENT.md`;
- setup and doctor help output;
- root package dependency declarations;
- any examples that use removed doctor flags;
- the repository RFC indexes.

Documentation must state that contributors run `npm install` or `npm ci`
before setup, that normal doctor performs comprehensive host inspection, and
that `--quick` is the bounded profile.

---

## 17. Success Criteria

The redesign is complete when:

1. The documented clone/install/setup flow succeeds on a supported
   development environment.
2. Root npm dependencies are validated but not reinstalled by setup.
3. Setup-owned dependency domains use deterministic restores and verified
   postconditions.
4. Doctor accepts only the approved quick, verbose, and help aliases.
5. Doctor always renders its score and has no CI-specific mode.
6. A large npm failure produces concise bounded evidence.
7. Status consumes doctor and Nx through typed in-process APIs.
8. Doctor and status do not modify the checkout.
9. Raw envinfo/systeminformation data and authentication values never reach
   logs, reports, or repository files.
10. The custom workspace graph, setup fingerprints, duplicated script
    environment type, doctor serialized parser, and E2E collection mutation
    are removed.
11. Lint/format behavior remains unchanged.
12. Targeted tooling tests, lint, TypeScript validation, and repository diff
    checks pass.

---

## 18. Future Work

The following work is intentionally deferred:

- evaluate Astral `uv` as a separate Python toolchain migration;
- evaluate Nx-native lint/format execution after the current worker behavior
  is reconsidered;
- add live Windows/Linux/macOS repository tooling validation in CI;
- narrow Nx cache inputs so unrelated script changes do not invalidate every
  project target;
- evaluate a separately exportable redacted support bundle if consumers need
  a shareable host report.

---

## 19. References

- [Nx Devkit API](https://nx.dev/reference/core-api/devkit/documents/createProjectGraphAsync)
- [Commander](https://github.com/tj/commander.js)
- [Execa](https://github.com/sindresorhus/execa)
- [envinfo](https://github.com/tabrindle/envinfo)
- [systeminformation](https://systeminformation.io/)
- [systeminformation security guidance](https://systeminformation.io/security.html)
- [`scripts/README.md`](../../scripts/README.md)
- [`AGENTS.md`](../../AGENTS.md)

---

**Document Version**: 1.0.0
**Last Updated**: 2026-08-31
**Status**: Accepted
