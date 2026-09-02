/**
 * @fileoverview Read-only local container runtime, port, certificate, and manifest diagnostics.
 * @module scripts.doctor.infrastructure
 *
 * @remarks
 * Every diagnostic row in this module is derived from two shared inspection fact sets obtained
 * through `context.inspection.inspect("infrastructure")` and
 * `context.inspection.inspect("aggregate")`, plus a bounded tooling-configuration read issued
 * through the injected read-only filesystem (`context.files`) for the engine-selection
 * diagnostic. This module never spawns a command, never reads a port directly, never imports a
 * Node filesystem API, and never uses an unrestricted runner or `context.probes` for any
 * diagnostic purpose.
 *
 * When the infrastructure inspection outcome is `unavailable` or `invalid`, every
 * fact-dependent row is an explicit failure; no diagnostic fabricates a healthy value from
 * missing facts. Aggregate unavailability degrades only the port-ownership classification for
 * ports not listed in the container facts; ports, certificates, and manifests remain
 * independently diagnosable.
 */

import {readToolingConfig} from "./common/tooling-config.ts";
import {resolveContainerEngine} from "./container-runtime/selection.ts";
import {ContainerRuntimeError, type ContainerEngine} from "./container-runtime/types.ts";
import {boundEvidence, diagnosticResult} from "./doctor.diagnostics.ts";
import {
  skippedDiagnostic,
  type DiagnosticFix,
  type DiagnosticModule,
  type DiagnosticPotentialCause,
  type DiagnosticResult,
  type DoctorContext,
} from "./doctor.types.ts";
import type {InfrastructureFacts} from "./inspection/infrastructure.ts";
import type {InspectionOutcome} from "./inspection/types.ts";

function engineLabel(engine: ContainerEngine): string {
  return engine === "rancher" ? "Rancher Desktop" : "Podman Desktop";
}

function cliName(engine: ContainerEngine): "docker" | "podman" {
  return engine === "rancher" ? "docker" : "podman";
}

const SETUP_REMEDIATION_FIX: DiagnosticFix = {
  description: "Select a supported local container engine.",
  command: "npm run setup",
};

function diagnostic(
  context: Readonly<DoctorContext>,
  startedAt: number,
  input: Omit<DiagnosticResult, "durationMs" | "module">,
): DiagnosticResult {
  return diagnosticResult(
    {
      module: "infrastructure",
      ...input,
    },
    startedAt,
    context.clock.monotonicNow,
  );
}

function issueDiagnostic(
  context: Readonly<DoctorContext>,
  startedAt: number,
  input: Readonly<{
    id: string;
    name: string;
    status: "warn" | "fail";
    summary: string;
    evidence: readonly string[];
    fixes: readonly DiagnosticFix[];
    rootCause?: string;
    potentialCauses?: readonly DiagnosticPotentialCause[];
  }>,
): DiagnosticResult {
  return diagnostic(context, startedAt, {
    id: input.id,
    name: input.name,
    status: input.status,
    summary: input.summary,
    evidence: input.evidence,
    ...(input.rootCause === undefined ? {} : {rootCause: input.rootCause}),
    potentialCauses: input.potentialCauses ?? [],
    fixes: input.fixes,
  });
}

function passDiagnostic(
  context: Readonly<DoctorContext>,
  startedAt: number,
  id: string,
  name: string,
  summary: string,
  evidence: readonly string[],
): DiagnosticResult {
  return diagnostic(context, startedAt, {
    id,
    name,
    status: "pass",
    summary,
    evidence,
    potentialCauses: [],
    fixes: [],
  });
}

function skipDiagnostic(id: string, name: string, summary: string, evidence: readonly string[]): DiagnosticResult {
  return skippedDiagnostic({id, module: "infrastructure", name, summary, evidence});
}

function skipBackendDependentChecks(reasonSuffix: string, reason: readonly string[]): readonly DiagnosticResult[] {
  return [
    skipDiagnostic("infrastructure.backend", "Container backend", `Backend check was skipped because ${reasonSuffix}.`, reason),
    skipDiagnostic("infrastructure.compose", "Compose provider", `Compose check was skipped because ${reasonSuffix}.`, reason),
    skipDiagnostic(
      "infrastructure.docker-conflict",
      "Docker Desktop conflict",
      `Docker Desktop conflict check was skipped because ${reasonSuffix}.`,
      reason,
    ),
    skipDiagnostic(
      "infrastructure.socket-context",
      "Socket and context state",
      `Socket/context check was skipped because ${reasonSuffix}.`,
      reason,
    ),
  ];
}

interface SelectionOutcome {
  readonly diagnostic: DiagnosticResult;
  readonly selection: Readonly<{engine: ContainerEngine; source: "argument" | "environment" | "configuration"}> | null;
}

async function diagnoseSelection(context: Readonly<DoctorContext>): Promise<SelectionOutcome> {
  const startedAt = context.clock.monotonicNow();
  const configRead = await readToolingConfig(context.paths.toolingConfig, context.files);
  const configuredEngine = configRead.status === "valid" ? configRead.config.containerEngine : undefined;

  let selection: Readonly<{engine: ContainerEngine; source: "argument" | "environment" | "configuration"}>;
  try {
    selection = resolveContainerEngine({
      argv: [],
      env: context.environment.variables,
      ...(configuredEngine === undefined ? {} : {configuredEngine}),
    });
  } catch (error) {
    const message = error instanceof ContainerRuntimeError ? error.message : String(error);
    const isInvalidConfiguredValue = /unsupported container engine|deprecated/iu.test(message);
    return {
      diagnostic: issueDiagnostic(context, startedAt, {
        id: "infrastructure.selection",
        name: "Container engine selection",
        status: "fail",
        summary: isInvalidConfiguredValue
          ? "An invalid or unsupported container engine value is configured."
          : "No supported local container engine is selected.",
        evidence: [message, ...(configRead.status === "invalid" ? [configRead.error] : [])],
        rootCause: isInvalidConfiguredValue
          ? "The configured container engine value is invalid, unsupported, or deprecated."
          : "No container engine is selected via environment variable or persisted local tooling configuration.",
        fixes: [SETUP_REMEDIATION_FIX],
      }),
      selection: null,
    };
  }

  if (configRead.status === "invalid") {
    return {
      diagnostic: issueDiagnostic(context, startedAt, {
        id: "infrastructure.selection",
        name: "Container engine selection",
        status: "warn",
        summary: `Container engine resolved to ${engineLabel(selection.engine)}, but local tooling configuration could not be read.`,
        evidence: [`Local tooling configuration is invalid: ${configRead.error}`],
        rootCause: "Local tooling configuration exists but failed to parse.",
        fixes: [SETUP_REMEDIATION_FIX],
      }),
      selection,
    };
  }

  return {
    diagnostic: passDiagnostic(
      context,
      startedAt,
      "infrastructure.selection",
      "Container engine selection",
      `Container engine resolved to ${engineLabel(selection.engine)} from ${selection.source}.`,
      [`Selected engine: ${selection.engine} (source: ${selection.source}).`],
    ),
    selection,
  };
}

function diagnoseCli(context: Readonly<DoctorContext>, facts: Readonly<InfrastructureFacts>, engine: ContainerEngine): DiagnosticResult {
  const startedAt = context.clock.monotonicNow();
  const cli = cliName(engine);

  if (!facts.cliAvailable) {
    return issueDiagnostic(context, startedAt, {
      id: "infrastructure.cli",
      name: `${cli} CLI`,
      status: "fail",
      summary: `The ${cli} CLI is not available.`,
      evidence: [`The ${cli} CLI could not be reached during infrastructure inspection.`],
      potentialCauses: [
        {cause: `The ${cli} CLI is not installed or not on PATH.`, confidence: "high"},
        {cause: `The ${cli} CLI command failed, timed out, or was terminated unexpectedly.`, confidence: "medium"},
      ],
      fixes: [{description: `Install ${engineLabel(engine)} and ensure ${cli} is available on PATH, then rerun doctor.`}],
    });
  }

  return passDiagnostic(context, startedAt, "infrastructure.cli", `${cli} CLI`, `The ${cli} CLI is available.`, []);
}

function diagnoseBackend(
  context: Readonly<DoctorContext>,
  facts: Readonly<InfrastructureFacts>,
  engine: ContainerEngine,
): DiagnosticResult {
  const startedAt = context.clock.monotonicNow();
  const label = engineLabel(engine);

  if (!facts.backendAvailable) {
    return issueDiagnostic(context, startedAt, {
      id: "infrastructure.backend",
      name: `${label} backend`,
      status: "fail",
      summary: `The ${label} backend did not respond.`,
      evidence: [`The ${label} backend was unreachable during infrastructure inspection.`],
      potentialCauses: [
        {cause: `The ${label} backend is not running.`, confidence: "high"},
        {cause: "The container runtime socket or context is misconfigured.", confidence: "medium"},
      ],
      fixes: [{description: `Start ${label} and confirm its backend is running, then rerun doctor.`}],
    });
  }

  return passDiagnostic(context, startedAt, "infrastructure.backend", `${label} backend`, `The ${label} backend is running.`, []);
}

function diagnoseCompose(
  context: Readonly<DoctorContext>,
  facts: Readonly<InfrastructureFacts>,
  engine: ContainerEngine,
): DiagnosticResult {
  const startedAt = context.clock.monotonicNow();
  const label = engineLabel(engine);

  if (!facts.composeAvailable) {
    return issueDiagnostic(context, startedAt, {
      id: "infrastructure.compose",
      name: "Compose provider",
      status: "fail",
      summary: "No Compose provider is available for the selected engine.",
      evidence: [`No Compose provider was found for ${label} during infrastructure inspection.`],
      potentialCauses: [
        {cause: "Compose is not installed for the selected engine.", confidence: "high"},
        {cause: "The Compose plugin is misconfigured.", confidence: "medium"},
      ],
      fixes: [{description: `Install a Compose provider for ${label}, then rerun doctor.`}],
    });
  }

  return passDiagnostic(
    context,
    startedAt,
    "infrastructure.compose",
    "Compose provider",
    "A Compose provider is available for the selected engine.",
    [],
  );
}

function diagnoseDockerConflict(
  context: Readonly<DoctorContext>,
  facts: Readonly<InfrastructureFacts>,
  engine: ContainerEngine,
): DiagnosticResult {
  const startedAt = context.clock.monotonicNow();

  if (facts.dockerConflict) {
    const summary =
      engine === "rancher"
        ? "Docker Desktop appears to be the active backend instead of Rancher Desktop."
        : "Podman Compose is delegated to a Docker Desktop compose provider.";
    const rootCause =
      engine === "rancher"
        ? "Rancher engine selected but Docker Desktop appears to be the active backend."
        : "Podman Compose is currently delegated to a Docker Desktop compose provider.";
    const fix =
      engine === "rancher"
        ? "Start Rancher Desktop in Moby/dockerd mode and stop Docker Desktop."
        : "Install podman-compose and set PODMAN_COMPOSE_PROVIDER to the podman-compose executable.";

    return issueDiagnostic(context, startedAt, {
      id: "infrastructure.docker-conflict",
      name: "Docker Desktop conflict",
      status: "fail",
      summary,
      evidence: ["Docker Desktop conflict was detected during infrastructure inspection."],
      rootCause,
      fixes: [{description: fix}],
    });
  }

  const summary =
    engine === "rancher"
      ? "Rancher Desktop, not Docker Desktop, owns the Docker-compatible backend."
      : "Podman Compose is not delegated to a Docker Desktop compose provider.";

  return passDiagnostic(context, startedAt, "infrastructure.docker-conflict", "Docker Desktop conflict", summary, []);
}

function diagnoseSocketContext(
  context: Readonly<DoctorContext>,
  facts: Readonly<InfrastructureFacts>,
  backendOk: boolean,
  composeOk: boolean,
): DiagnosticResult {
  const followUpTriggered = !backendOk || !composeOk || context.options.verbose;
  if (!followUpTriggered) {
    return skipDiagnostic(
      "infrastructure.socket-context",
      "Socket and context state",
      "Socket/context follow-up was skipped because backend and Compose checks already passed.",
      ["Pass --verbose to force socket/context evidence collection."],
    );
  }

  const startedAt = context.clock.monotonicNow();

  if (facts.socketContextIssues.length > 0) {
    return issueDiagnostic(context, startedAt, {
      id: "infrastructure.socket-context",
      name: "Socket and context state",
      status: "warn",
      summary: "The active container runtime context or connection could not be determined.",
      evidence: boundEvidence(facts.socketContextIssues, context.options.verbose),
      potentialCauses: [{cause: "The container runtime context or connection is misconfigured.", confidence: "medium"}],
      fixes: [{description: "Inspect the container runtime context and connection state manually, then rerun doctor."}],
    });
  }

  return passDiagnostic(
    context,
    startedAt,
    "infrastructure.socket-context",
    "Socket and context state",
    "The active container runtime context state is healthy.",
    ["No socket/context issues were detected."],
  );
}

function diagnosePorts(context: Readonly<DoctorContext>, facts: Readonly<InfrastructureFacts>): DiagnosticResult {
  const startedAt = context.clock.monotonicNow();

  const portsWithErrors = facts.ports.filter((p) => p.error !== undefined);
  if (portsWithErrors.length > 0) {
    return issueDiagnostic(context, startedAt, {
      id: "infrastructure.ports",
      name: "Required local ports",
      status: "warn",
      summary: "Required local ports could not be fully inspected.",
      evidence: boundEvidence(
        portsWithErrors.map((p) => p.error!),
        context.options.verbose,
      ),
      potentialCauses: [
        {cause: "The port inspection command requires elevated permissions.", confidence: "medium"},
        {cause: "The port inspection tool is unavailable on this host.", confidence: "medium"},
      ],
      fixes: [{description: "Re-run doctor with sufficient permissions to inspect listening ports."}],
    });
  }

  const occupied = facts.ports.filter((p) => !p.available);

  if (occupied.length === 0) {
    return passDiagnostic(context, startedAt, "infrastructure.ports", "Required local ports", "All required local ports are free.", [
      `Inspected ${String(facts.ports.length)} required local port${facts.ports.length === 1 ? "" : "s"}.`,
    ]);
  }

  // Use repository-owned classification from aggregate (when available), supplemented by
  // the published ports of running known containers for cases where aggregate is unavailable.
  const knownContainerPorts = new Set(facts.containers.flatMap((c) => c.publishedPorts));

  function describeOccupied(p: (typeof facts.ports)[number]): string {
    const parts: string[] = [`Port ${String(p.port)} is occupied`];
    if (p.processName !== undefined) {
      parts.push(`by ${p.processName}`);
    }
    if (p.pid !== undefined) {
      parts.push(`(PID ${String(p.pid)})`);
    }
    return parts.join(" ") + ".";
  }

  const repositoryOwned = occupied.filter((p) => p.repositoryOwned === true || knownContainerPorts.has(p.port));
  const unrelated = occupied.filter((p) => p.repositoryOwned !== true && !knownContainerPorts.has(p.port));

  if (unrelated.length === 0) {
    return issueDiagnostic(context, startedAt, {
      id: "infrastructure.ports",
      name: "Required local ports",
      status: "warn",
      summary: "Required local ports are already occupied by the known local stack.",
      evidence: boundEvidence(
        repositoryOwned.map((p) => describeOccupied(p)),
        context.options.verbose,
      ),
      rootCause: "The local selfhost stack is already running and occupying required ports.",
      fixes: [{description: "Reuse the already-running local stack, or stop it before starting a new instance."}],
    });
  }

  return issueDiagnostic(context, startedAt, {
    id: "infrastructure.ports",
    name: "Required local ports",
    status: "fail",
    summary: "One or more required local ports are occupied by an unrelated process.",
    evidence: boundEvidence(
      unrelated.map((p) => describeOccupied(p)),
      context.options.verbose,
    ),
    potentialCauses: unrelated.map((p) => ({
      cause: describeOccupied(p),
      confidence: p.pid === undefined ? ("low" as const) : ("high" as const),
    })),
    fixes: [{description: "Stop the process occupying the required port, or free it before starting the local stack."}],
  });
}

function diagnoseCertificates(context: Readonly<DoctorContext>, facts: Readonly<InfrastructureFacts>): DiagnosticResult {
  const startedAt = context.clock.monotonicNow();

  if (facts.certificateIssues.length > 0) {
    return issueDiagnostic(context, startedAt, {
      id: "infrastructure.certificates",
      name: "Selfhost TLS certificates",
      status: "warn",
      summary: "One or more selfhost TLS certificate files are missing.",
      evidence: boundEvidence(facts.certificateIssues, context.options.verbose),
      rootCause: "The local selfhost TLS certificate or key file has not been generated yet.",
      fixes: [{description: "Generate local selfhost TLS certificates.", command: "npm run setup"}],
    });
  }

  return passDiagnostic(
    context,
    startedAt,
    "infrastructure.certificates",
    "Selfhost TLS certificates",
    "Selfhost TLS certificate and key files are present.",
    ["Certificate and key files are present."],
  );
}

function diagnoseManifests(context: Readonly<DoctorContext>, facts: Readonly<InfrastructureFacts>): DiagnosticResult {
  const startedAt = context.clock.monotonicNow();

  if (facts.manifestIssues.length > 0) {
    return issueDiagnostic(context, startedAt, {
      id: "infrastructure.manifests",
      name: "Required runtime manifests",
      status: "fail",
      summary: "One or more required runtime manifests are missing.",
      evidence: boundEvidence(facts.manifestIssues, context.options.verbose),
      rootCause: "A required AppHost or Compose manifest is missing from the repository.",
      fixes: [{description: "Restore the missing runtime manifest from version control."}],
    });
  }

  return passDiagnostic(
    context,
    startedAt,
    "infrastructure.manifests",
    "Required runtime manifests",
    "All required runtime manifests are present.",
    [],
  );
}

function diagnoseContainers(context: Readonly<DoctorContext>, facts: Readonly<InfrastructureFacts>): DiagnosticResult {
  const startedAt = context.clock.monotonicNow();

  if (facts.containers.length === 0) {
    return passDiagnostic(
      context,
      startedAt,
      "infrastructure.containers",
      "Known local containers",
      "No known local containers are present.",
      ["No known selfhost containers were found."],
    );
  }

  const staleContainers = facts.containers.filter((c) => c.state.toLowerCase() !== "running");
  if (staleContainers.length > 0) {
    return issueDiagnostic(context, startedAt, {
      id: "infrastructure.containers",
      name: "Known local containers",
      status: "warn",
      summary: "One or more known local containers exist but are not running.",
      evidence: boundEvidence(
        staleContainers.map((c) => `${c.name}: ${c.state}`),
        context.options.verbose,
      ),
      rootCause: "A known local container exists in a stopped or stale state.",
      fixes: [{description: "Start, remove, or recreate the stale local container using the selfhost tooling."}],
    });
  }

  // A container reporting `state: "running"` can still be unhealthy: the `status` field carries
  // health-check evidence (e.g. `"Up 3 hours (unhealthy)"`), which is materially different from
  // `state`. A running-but-unhealthy known container must not PASS.
  const unhealthyContainers = facts.containers.filter(
    (c) => c.state.toLowerCase() === "running" && c.status !== undefined && /unhealthy/iu.test(c.status),
  );
  if (unhealthyContainers.length > 0) {
    return issueDiagnostic(context, startedAt, {
      id: "infrastructure.containers",
      name: "Known local containers",
      status: "warn",
      summary: "One or more known local containers are running but report an unhealthy status.",
      evidence: boundEvidence(
        unhealthyContainers.map((c) => `${c.name}: ${c.status ?? c.state}`),
        context.options.verbose,
      ),
      rootCause: "A known local container's health check is reporting an unhealthy status.",
      fixes: [{description: "Inspect the unhealthy local container's logs and restart it using the selfhost tooling."}],
    });
  }

  return passDiagnostic(
    context,
    startedAt,
    "infrastructure.containers",
    "Known local containers",
    "All known local containers are running.",
    boundEvidence(
      facts.containers.map((c) => `${c.name}: ${c.state}`),
      context.options.verbose,
    ),
  );
}

/**
 * Builds degraded diagnostic rows for all fact-dependent checks when the infrastructure
 * inspection outcome is unavailable or invalid.
 *
 * @param context - Shared read-only diagnostic context.
 * @param issues - Bounded issue strings describing why the facts could not be produced.
 * @returns Fail rows for all ten infrastructure diagnostics, starting at infrastructure.cli.
 */
function degradedInfraResults(context: Readonly<DoctorContext>, issues: readonly string[]): readonly DiagnosticResult[] {
  const startedAt = context.clock.monotonicNow();
  const evidence = boundEvidence(issues, context.options.verbose);
  const summary = "The shared infrastructure inspection facts could not be produced.";
  const fix: DiagnosticFix = {description: "Resolve the reported infrastructure inspection problem, then rerun doctor."};
  const [singleIssue] = issues;
  const rootCause = issues.length === 1 && singleIssue !== undefined ? singleIssue : undefined;
  const potentialCauses = issues.length !== 1 ? issues.slice(0, 5).map((cause) => ({cause, confidence: "high" as const})) : [];

  const genericFail = (id: string, name: string): DiagnosticResult =>
    issueDiagnostic(context, startedAt, {
      id,
      name,
      status: "fail",
      summary,
      evidence,
      ...(rootCause !== undefined ? {rootCause} : {}),
      potentialCauses,
      fixes: [fix],
    });

  return [
    genericFail("infrastructure.cli", "Container CLI"),
    genericFail("infrastructure.backend", "Container backend"),
    genericFail("infrastructure.compose", "Compose provider"),
    genericFail("infrastructure.docker-conflict", "Docker Desktop conflict"),
    genericFail("infrastructure.socket-context", "Socket and context state"),
    genericFail("infrastructure.ports", "Required local ports"),
    genericFail("infrastructure.certificates", "Selfhost TLS certificates"),
    genericFail("infrastructure.manifests", "Required runtime manifests"),
    genericFail("infrastructure.containers", "Known local containers"),
  ];
}

/** Read-only local container runtime, port, certificate, and manifest diagnostics module. */
export const infrastructureDoctorModule: DiagnosticModule = {
  id: "infrastructure",
  title: "Infrastructure",
  async run(context): Promise<readonly DiagnosticResult[]> {
    // Selection is config-driven (tooling config + env); it is not raw runtime observation.
    const selectionOutcome = await diagnoseSelection(context);
    const results: DiagnosticResult[] = [selectionOutcome.diagnostic];

    if (selectionOutcome.selection === null) {
      // Engine selection failed: skip engine-dependent checks; still inspect ports/certs/manifests.
      results.push(
        skipDiagnostic("infrastructure.cli", "Container CLI", "Container CLI check was skipped because engine selection failed.", [
          selectionOutcome.diagnostic.summary,
        ]),
      );
      results.push(...skipBackendDependentChecks("engine selection failed", [selectionOutcome.diagnostic.summary]));
      // Even without an engine, the infrastructure provider can inspect ports, certs, and manifests.
      const outcome = await context.inspection.inspect("infrastructure");
      if (outcome.kind === "available") {
        results.push(diagnosePorts(context, outcome.value));
        results.push(diagnoseCertificates(context, outcome.value));
        results.push(diagnoseManifests(context, outcome.value));
      } else {
        const issues = outcome.kind === "invalid" ? outcome.issues : [outcome.reason];
        const evidence = boundEvidence(issues, context.options.verbose);
        const fix: DiagnosticFix = {description: "Resolve the reported infrastructure inspection problem, then rerun doctor."};
        const summary = "The shared infrastructure inspection facts could not be produced.";
        const startedAt = context.clock.monotonicNow();
        const [singleIssue] = issues;
        const rootCause = issues.length === 1 && singleIssue !== undefined ? singleIssue : undefined;
        const potentialCauses = issues.length !== 1 ? issues.slice(0, 5).map((c) => ({cause: c, confidence: "high" as const})) : [];
        results.push(
          issueDiagnostic(context, startedAt, {
            id: "infrastructure.ports",
            name: "Required local ports",
            status: "fail",
            summary,
            evidence,
            ...(rootCause !== undefined ? {rootCause} : {}),
            potentialCauses,
            fixes: [fix],
          }),
        );
        results.push(
          issueDiagnostic(context, startedAt, {
            id: "infrastructure.certificates",
            name: "Selfhost TLS certificates",
            status: "fail",
            summary,
            evidence,
            ...(rootCause !== undefined ? {rootCause} : {}),
            potentialCauses,
            fixes: [fix],
          }),
        );
        results.push(
          issueDiagnostic(context, startedAt, {
            id: "infrastructure.manifests",
            name: "Required runtime manifests",
            status: "fail",
            summary,
            evidence,
            ...(rootCause !== undefined ? {rootCause} : {}),
            potentialCauses,
            fixes: [fix],
          }),
        );
      }
      results.push(
        skipDiagnostic(
          "infrastructure.containers",
          "Known local containers",
          "Container inventory check was skipped because engine selection failed.",
          [selectionOutcome.diagnostic.summary],
        ),
      );
      return results;
    }

    const {engine} = selectionOutcome.selection;

    // Inform the session of the resolved engine so the infrastructure provider observes the same
    // engine the selection diagnostic resolved, then inspect the shared infrastructure facts.
    context.inspection.updateInfrastructureEngine(engine);
    context.inspection.invalidate("infrastructure");
    const outcome: InspectionOutcome<InfrastructureFacts> = await context.inspection.inspect("infrastructure");

    if (outcome.kind !== "available") {
      const issues = outcome.kind === "invalid" ? outcome.issues : [outcome.reason];
      results.push(...degradedInfraResults(context, issues));
      return results;
    }

    const facts = outcome.value;

    // CLI
    results.push(diagnoseCli(context, facts, engine));
    if (!facts.cliAvailable) {
      const reason = ["The container CLI is unavailable."];
      results.push(...skipBackendDependentChecks("the container CLI is unavailable", reason));
      results.push(diagnosePorts(context, facts));
      results.push(diagnoseCertificates(context, facts));
      results.push(diagnoseManifests(context, facts));
      results.push(
        skipDiagnostic(
          "infrastructure.containers",
          "Known local containers",
          "Container inventory check was skipped because the container CLI is unavailable.",
          reason,
        ),
      );
      return results;
    }

    // Backend, Compose, Docker-conflict, Socket-context
    results.push(diagnoseBackend(context, facts, engine));
    results.push(diagnoseCompose(context, facts, engine));

    const backendOk = facts.backendAvailable;
    const composeOk = facts.composeAvailable;

    results.push(diagnoseDockerConflict(context, facts, engine));
    results.push(diagnoseSocketContext(context, facts, backendOk, composeOk));

    // Engine-independent checks
    results.push(diagnosePorts(context, facts));
    results.push(diagnoseCertificates(context, facts));
    results.push(diagnoseManifests(context, facts));
    results.push(diagnoseContainers(context, facts));

    return results;
  },
};
