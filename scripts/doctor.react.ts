/**
 * @fileoverview Read-only React, Next.js, i18n, taxonomy, license, Playwright, and framework-config diagnostics.
 * @module scripts.doctor.react
 *
 * @remarks
 * Every diagnostic row in this module is derived exclusively from the shared
 * `ReactFacts` produced by `context.inspection.inspect("react")`. This module never spawns a
 * command, never reads a package manifest, environment file, message dictionary, artifact file,
 * or framework configuration file, and never uses `context.runner`. When the shared React
 * inspection outcome itself is `unavailable` or `invalid`, every row below is an explicit
 * failure or skip; no diagnostic ever fabricates a healthy value from missing facts.
 */

import {boundEvidence, diagnosticResult, skippedDiagnostic, STANDARD_EVIDENCE_LIMIT} from "./doctor.diagnostics.ts";
import type {DiagnosticFix, DiagnosticModule, DiagnosticPotentialCause, DiagnosticResult, DoctorContext} from "./doctor.types.ts";
import type {ReactFacts} from "./inspection/frontend.ts";
import type {InstalledPackageFact, PackageInventoryFacts} from "./inspection/packages.ts";
import type {InspectionOutcome} from "./inspection/types.ts";

const REACT_PACKAGE_NAMES = [
  "next",
  "react",
  "react-dom",
  "@arolariu/components",
  "@clerk/nextjs",
  "@docusaurus/core",
  "playwright",
] as const;
const WORKSPACE_LINKED_PACKAGE = "@arolariu/components";
const AUTHENTICATION_ENVIRONMENT_KEYS = ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"] as const;
const CHROMIUM_BROWSER_PATTERN = /chromium-\d/u;

const REACT_INSPECTION_RESOLUTION_FIX = "Resolve the reported React inspection problem, then rerun doctor.";

function diagnostic(
  context: Readonly<DoctorContext>,
  startedAt: number,
  input: Omit<DiagnosticResult, "durationMs" | "module">,
): DiagnosticResult {
  return diagnosticResult(
    {
      module: "react",
      ...input,
    },
    startedAt,
    context.now,
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

/**
 * Bounds a raw issue list to {@link STANDARD_EVIDENCE_LIMIT} entries, appending a deterministic
 * omitted-count summary when entries were truncated.
 *
 * @param issues - Raw, unbounded issue strings sourced from shared inspection facts.
 * @returns At most {@link STANDARD_EVIDENCE_LIMIT} entries, never a full unbounded copy.
 */
function boundedIssues(issues: readonly string[]): readonly string[] {
  return boundEvidence(issues, false);
}

function buildIssueDiagnosis(
  issues: readonly string[],
): Readonly<{rootCause?: string; potentialCauses: readonly DiagnosticPotentialCause[]}> {
  const [rootCause] = issues;
  if (issues.length === 1 && rootCause !== undefined) {
    return {rootCause, potentialCauses: []};
  }
  return {
    potentialCauses: issues.slice(0, STANDARD_EVIDENCE_LIMIT).map((cause) => ({cause, confidence: "high" as const})),
  };
}

function skippedPackagesForInvalidRequirements(): DiagnosticResult {
  return skippedDiagnostic({
    id: "react.packages",
    module: "react",
    name: "React ecosystem packages",
    summary: "Package comparison was skipped because requirement sources are invalid.",
    evidence: ["Blocked by invalid runtime requirement sources."],
  });
}

function skippedPlaywrightForInvalidRequirements(): DiagnosticResult {
  return skippedDiagnostic({
    id: "react.playwright",
    module: "react",
    name: "Playwright browser inventory",
    summary: "Playwright inventory comparison was skipped because requirement sources are invalid.",
    evidence: ["Blocked by invalid runtime requirement sources."],
  });
}

function skippedPlaywrightForMissingLockedVersion(): DiagnosticResult {
  return skippedDiagnostic({
    id: "react.playwright",
    module: "react",
    name: "Playwright browser inventory",
    summary: "Playwright inventory comparison was skipped because no locked Playwright requirement exists.",
    evidence: ["package.json does not declare an exact-pinned playwright dependency."],
  });
}

function diagnosePackages(context: Readonly<DoctorContext>, facts: Readonly<ReactFacts>): DiagnosticResult {
  const startedAt = context.now();
  if (context.requirements.status === "invalid") {
    return skippedPackagesForInvalidRequirements();
  }

  const packages: PackageInventoryFacts = facts.packages;
  const requiredPackages = context.requirements.requirements.packages;
  const issues: string[] = packages.malformed.map((name) => `${name}: installed package manifest is malformed.`);
  const okEvidence: string[] = [];

  for (const name of REACT_PACKAGE_NAMES) {
    const required = requiredPackages.get(name)?.version;
    if (required === undefined) {
      issues.push(`${name} has no exact-pinned root requirement to compare against.`);
      continue;
    }

    const entry: InstalledPackageFact | undefined = packages.installed[name];
    if (entry === undefined) {
      issues.push(`${name} is required at ${required} but is not installed.`);
      continue;
    }

    if (name === WORKSPACE_LINKED_PACKAGE) {
      if (entry.workspaceRoot === undefined) {
        issues.push(`${name} is not linked to the local workspace package.`);
        continue;
      }
      okEvidence.push(`${name} is linked to workspace root ${entry.workspaceRoot}.`);
      continue;
    }

    if (entry.version !== required) {
      issues.push(`${name} installed version '${entry.version}' does not match the locked version '${required}'.`);
      continue;
    }

    okEvidence.push(`${name}@${entry.version} matches the locked requirement.`);
  }

  if (issues.length === 0) {
    return passDiagnostic(
      context,
      startedAt,
      "react.packages",
      "React ecosystem packages",
      "Installed React ecosystem packages match locked requirements.",
      okEvidence,
    );
  }

  const evidence = boundedIssues(issues);
  return issueDiagnostic(context, startedAt, {
    id: "react.packages",
    name: "React ecosystem packages",
    status: "fail",
    summary: `${String(issues.length)} React ecosystem package${issues.length === 1 ? "" : "s"} failed installation verification.`,
    evidence,
    ...buildIssueDiagnosis(issues),
    fixes: [{description: "Reinstall root dependencies and verify workspace links, then rerun doctor.", command: "npm install"}],
  });
}

function diagnoseWorkspaceLink(context: Readonly<DoctorContext>, facts: Readonly<ReactFacts>): DiagnosticResult {
  const startedAt = context.now();
  const issues = facts.workspaceLinkIssues;

  if (issues.length === 0) {
    return passDiagnostic(
      context,
      startedAt,
      "react.workspace-link",
      "Website components workspace link",
      "The website declares and links its dependency on @arolariu/components.",
      [
        "sites/arolariu.ro/package.json declares @arolariu/components.",
        "sites/arolariu.ro/project.json build and dev targets depend on components:build.",
      ],
    );
  }

  const evidence = boundedIssues(issues);
  return issueDiagnostic(context, startedAt, {
    id: "react.workspace-link",
    name: "Website components workspace link",
    status: "fail",
    summary: "The website's dependency on @arolariu/components is not fully linked.",
    evidence,
    ...buildIssueDiagnosis(issues),
    fixes: [{description: "Restore the @arolariu/components dependency declaration and Nx dependsOn linkage."}],
  });
}

function diagnoseEnvironment(context: Readonly<DoctorContext>, facts: Readonly<ReactFacts>): DiagnosticResult {
  const startedAt = context.now();
  const environment = facts.environment;

  if (environment.syntaxErrors.length > 0) {
    const evidence = boundedIssues(environment.syntaxErrors);
    return issueDiagnostic(context, startedAt, {
      id: "react.environment",
      name: "React environment",
      status: "fail",
      summary: "The website .env file contains syntax errors.",
      evidence,
      ...buildIssueDiagnosis(environment.syntaxErrors),
      fixes: [{description: "Correct the malformed or duplicate entries in sites/arolariu.ro/.env, then rerun doctor."}],
    });
  }

  if (environment.missingCoreKeys.length > 0) {
    const issues = environment.missingCoreKeys.map((key) => `Missing required core key: ${key}`);
    const evidence = boundedIssues(issues);
    return issueDiagnostic(context, startedAt, {
      id: "react.environment",
      name: "React environment",
      status: "fail",
      summary: "The website .env file is missing required core site keys.",
      evidence,
      ...buildIssueDiagnosis(issues),
      fixes: [{description: "Add the missing core site keys to sites/arolariu.ro/.env, then rerun doctor."}],
    });
  }

  if (environment.missingAuthenticationKeys.length === 2) {
    const keylessDevelopmentSummary = "Both Clerk credentials are absent; ordinary non-CI Next.js development may use Clerk keyless mode.";
    return issueDiagnostic(context, startedAt, {
      id: "react.environment",
      name: "React environment",
      status: "warn",
      summary: keylessDevelopmentSummary,
      evidence: environment.missingAuthenticationKeys.map((key) => `${key}: absent`),
      rootCause: keylessDevelopmentSummary,
      fixes: [{description: "Configure both Clerk keys for CI, production, or authenticated local development."}],
    });
  }

  if (environment.missingAuthenticationKeys.length === 1) {
    return issueDiagnostic(context, startedAt, {
      id: "react.environment",
      name: "React environment",
      status: "fail",
      summary: "Only one Clerk credential is present; the publishable/secret key pair is inconsistent.",
      evidence: AUTHENTICATION_ENVIRONMENT_KEYS.map(
        (key) => `${key}: ${environment.missingAuthenticationKeys.includes(key) ? "absent" : "present"}`,
      ),
      rootCause: "Only one Clerk credential is present; the publishable/secret key pair is inconsistent.",
      fixes: [{description: "Configure both Clerk keys, or remove both, in sites/arolariu.ro/.env, then rerun doctor."}],
    });
  }

  return passDiagnostic(
    context,
    startedAt,
    "react.environment",
    "React environment",
    "Required core site keys are present and the Clerk credential pair is consistent.",
    environment.presentKeys.map((key) => `${key}: present`),
  );
}

function diagnoseI18n(context: Readonly<DoctorContext>, facts: Readonly<ReactFacts>): DiagnosticResult {
  const startedAt = context.now();
  const issues = facts.i18nIssues;

  if (issues.length === 0) {
    return passDiagnostic(
      context,
      startedAt,
      "react.i18n",
      "React i18n dictionaries",
      "Locale dictionaries share an identical key shape and the generated declaration is current.",
      ["Locale dictionaries en, ro, and fr share an identical key shape.", "messages/en.d.json.ts key shape matches messages/en.json."],
    );
  }

  const evidence = boundedIssues(issues);
  return issueDiagnostic(context, startedAt, {
    id: "react.i18n",
    name: "React i18n dictionaries",
    status: "fail",
    summary: "Source locale dictionaries or the generated message declaration have issues.",
    evidence,
    ...buildIssueDiagnosis(issues),
    fixes: [{description: "Restore identical key shape across en.json, ro.json, and fr.json.", command: "npm run generate:i18n"}],
  });
}

function diagnoseTaxonomyAndLicenses(context: Readonly<DoctorContext>, facts: Readonly<ReactFacts>): DiagnosticResult {
  const startedAt = context.now();
  const issues = facts.artifactIssues;

  if (issues.length === 0) {
    return passDiagnostic(
      context,
      startedAt,
      "react.taxonomy-and-licenses",
      "React taxonomy and licenses",
      "Website taxonomy artifacts and license metadata are present and valid.",
      ["Website taxonomy artifacts are present and metadata-valid.", "licenses.json production entries are present and valid."],
    );
  }

  const evidence = boundedIssues(issues);
  return issueDiagnostic(context, startedAt, {
    id: "react.taxonomy-and-licenses",
    name: "React taxonomy and licenses",
    status: "fail",
    summary: "Website taxonomy artifacts or license metadata are incomplete or invalid.",
    evidence,
    ...buildIssueDiagnosis(issues),
    fixes: [{description: "Regenerate taxonomy and license artifacts, then rerun doctor.", command: "npm run generate -- /a"}],
  });
}

function diagnosePlaywright(context: Readonly<DoctorContext>, facts: Readonly<ReactFacts>): DiagnosticResult {
  const startedAt = context.now();
  if (context.requirements.status === "invalid") {
    return skippedPlaywrightForInvalidRequirements();
  }

  const required = context.requirements.requirements.packages.get("playwright")?.version;
  if (required === undefined) {
    return skippedPlaywrightForMissingLockedVersion();
  }

  const {playwright} = facts;
  if (playwright.version === undefined) {
    return issueDiagnostic(context, startedAt, {
      id: "react.playwright",
      name: "Playwright browser inventory",
      status: "fail",
      summary: "No installed Playwright browser inventory was reported.",
      evidence: [`Locked Playwright version: ${required}`, "No browser inventory versions were reported."],
      rootCause: "No installed browser inventory was reported for the locked Playwright version.",
      fixes: [{description: "Install Playwright browsers for the locked version.", command: "npx playwright install chromium"}],
    });
  }

  if (playwright.version !== required) {
    return issueDiagnostic(context, startedAt, {
      id: "react.playwright",
      name: "Playwright browser inventory",
      status: "fail",
      summary: "No installed browser inventory was found for the locked Playwright version.",
      evidence: [`Locked Playwright version: ${required}`, `Reported version: ${playwright.version}`],
      rootCause: `No installed browser inventory matches the locked Playwright version ${required}.`,
      fixes: [{description: "Install Playwright browsers for the locked version.", command: "npx playwright install chromium"}],
    });
  }

  if (!playwright.browsers.some((entry) => CHROMIUM_BROWSER_PATTERN.test(entry))) {
    return issueDiagnostic(context, startedAt, {
      id: "react.playwright",
      name: "Playwright browser inventory",
      status: "fail",
      summary: "Chromium is not installed for the locked Playwright version.",
      evidence: [`Locked Playwright version: ${required}`, `Installed browsers: ${playwright.browsers.join(", ") || "(none)"}`],
      rootCause: `Chromium is not installed for the locked Playwright version ${required}.`,
      fixes: [{description: "Install the Chromium browser for Playwright.", command: "npx playwright install chromium"}],
    });
  }

  return passDiagnostic(
    context,
    startedAt,
    "react.playwright",
    "Playwright browser inventory",
    "The installed Playwright browser inventory matches the locked version and includes Chromium.",
    [`Locked Playwright version: ${required}`, `Installed browsers: ${playwright.browsers.join(", ")}`],
  );
}

function diagnoseFrameworkConfig(context: Readonly<DoctorContext>, facts: Readonly<ReactFacts>): DiagnosticResult {
  const startedAt = context.now();
  const issues = facts.frameworkIssues;

  if (issues.length === 0) {
    return passDiagnostic(
      context,
      startedAt,
      "react.framework-config",
      "React framework configuration",
      "Next.js and Docusaurus configuration wiring is intact.",
      ["next.config.ts wires next-intl message declaration generation.", "docusaurus.config.ts exports a classic-preset configuration."],
    );
  }

  const evidence = boundedIssues(issues);
  return issueDiagnostic(context, startedAt, {
    id: "react.framework-config",
    name: "React framework configuration",
    status: "fail",
    summary: "Website or docs framework configuration is missing required wiring.",
    evidence,
    ...buildIssueDiagnosis(issues),
    fixes: [{description: "Restore the required Next.js and Docusaurus configuration wiring."}],
  });
}

/**
 * Produces the seven explicit degraded diagnostic rows for a React inspection outcome that was
 * `unavailable` or `invalid`.
 *
 * @remarks
 * `react.packages` and `react.playwright` preserve their independent requirement-based skip
 * policy even when the shared React facts could not be produced, exactly as they do when facts
 * are available. Every other row is an explicit failure describing the degraded outcome; none is
 * ever reported as a pass.
 *
 * @param context - Shared doctor execution context.
 * @param evidence - Bounded, non-empty evidence describing the degraded outcome.
 * @returns The seven `react.*` diagnostic rows, in required order.
 */
function degradedResults(context: Readonly<DoctorContext>, issues: readonly string[]): readonly DiagnosticResult[] {
  const startedAt = context.now();
  const summary = "The shared React inspection facts could not be produced.";
  const evidence = boundedIssues(issues);
  const diagnosis = buildIssueDiagnosis(issues);

  const genericFail = (id: string, name: string): DiagnosticResult =>
    issueDiagnostic(context, startedAt, {
      id,
      name,
      status: "fail",
      summary,
      evidence,
      ...diagnosis,
      fixes: [{description: REACT_INSPECTION_RESOLUTION_FIX}],
    });

  const packagesResult =
    context.requirements.status === "invalid"
      ? skippedPackagesForInvalidRequirements()
      : genericFail("react.packages", "React ecosystem packages");

  const playwrightResult = (() => {
    if (context.requirements.status === "invalid") {
      return skippedPlaywrightForInvalidRequirements();
    }
    if (context.requirements.requirements.packages.get("playwright")?.version === undefined) {
      return skippedPlaywrightForMissingLockedVersion();
    }
    return genericFail("react.playwright", "Playwright browser inventory");
  })();

  return [
    packagesResult,
    genericFail("react.workspace-link", "Website components workspace link"),
    genericFail("react.environment", "React environment"),
    genericFail("react.i18n", "React i18n dictionaries"),
    genericFail("react.taxonomy-and-licenses", "React taxonomy and licenses"),
    playwrightResult,
    genericFail("react.framework-config", "React framework configuration"),
  ];
}

/** Read-only React diagnostic module, sourced exclusively from shared `ReactFacts`. */
export const reactDoctorModule: DiagnosticModule = {
  id: "react",
  title: "React",
  async run(context): Promise<readonly DiagnosticResult[]> {
    const outcome: InspectionOutcome<ReactFacts> = await context.inspection.inspect("react");

    if (outcome.kind === "unavailable") {
      return degradedResults(context, [outcome.reason]);
    }
    if (outcome.kind === "invalid") {
      return degradedResults(context, outcome.issues);
    }

    const facts = outcome.value;
    return [
      diagnosePackages(context, facts),
      diagnoseWorkspaceLink(context, facts),
      diagnoseEnvironment(context, facts),
      diagnoseI18n(context, facts),
      diagnoseTaxonomyAndLicenses(context, facts),
      diagnosePlaywright(context, facts),
      diagnoseFrameworkConfig(context, facts),
    ];
  },
};
