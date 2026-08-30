/**
 * @fileoverview Read-only React, Next.js, i18n, taxonomy, license, Playwright, and framework-config diagnostics.
 * @module scripts.doctor.react
 */

import {access, readFile} from "node:fs/promises";
import {basename, dirname, resolve} from "node:path";

import type {CommandResult, CommandSpec} from "./common/process.ts";
import {getExpectedTaxonomyArtifactPaths} from "./common/taxonomy-artifacts.ts";
import {
  diagnosticResult,
  skippedDiagnostic,
  type DiagnosticFix,
  type DiagnosticPotentialCause,
  type DiagnosticResult,
  type DoctorContext,
  type DiagnosticModule,
} from "./doctor.types.ts";

type UnknownRecord = Readonly<Record<string, unknown>>;

/** Website environment classification exposing only key names and classifications, never values. */
export interface EnvironmentDiagnostic {
  readonly syntaxErrors: readonly string[];
  readonly presentKeys: readonly string[];
  readonly missingCoreKeys: readonly string[];
  readonly missingAuthenticationKeys: readonly string[];
}

interface PlaywrightVersionInventory {
  readonly version: string;
  readonly browsers: readonly string[];
}

interface PackageIssue {
  readonly name: string;
  readonly kind: "missing-package" | "invalid-workspace-link" | "version-drift";
  readonly detail: string;
}

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
const CORE_ENVIRONMENT_KEYS = ["SITE_ENV", "SITE_NAME", "SITE_URL", "USE_CDN"] as const;
const AUTHENTICATION_ENVIRONMENT_KEYS = ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"] as const;
const RECOGNIZED_ENVIRONMENT_KEYS: ReadonlySet<string> = new Set([...CORE_ENVIRONMENT_KEYS, ...AUTHENTICATION_ENVIRONMENT_KEYS]);
const ENVIRONMENT_KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/u;
const CHROMIUM_BROWSER_PATTERN = /chromium-\d/u;

const NPM_LS_JSON_COMMAND = {command: "npm", args: ["ls", "--json"]} as const satisfies CommandSpec;
const PLAYWRIGHT_INSTALL_LIST_COMMAND = {
  command: "npx",
  args: ["--no-install", "playwright", "install", "--list"],
} as const satisfies CommandSpec;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function hasErrorCode(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}

function isSuccessfulCommand(result: Readonly<CommandResult>): boolean {
  return result.code === 0 && !result.timedOut && result.signal === undefined && result.spawnError === undefined;
}

function commandStatusEvidence(result: Readonly<CommandResult>): readonly string[] {
  return [
    ...(result.spawnError === undefined ? [] : [`Unable to start command: ${result.spawnError}`]),
    ...(result.timedOut ? ["Command timed out."] : []),
    ...(result.signal === undefined ? [] : [`Command stopped with signal ${result.signal}.`]),
    ...(result.code === 0 ? [] : [`Command exited with code ${String(result.code)}.`]),
  ];
}

function commandEvidence(result: Readonly<CommandResult>): readonly string[] {
  return [
    ...commandStatusEvidence(result),
    ...(result.stdout.trim() === "" ? [] : [`stdout: ${result.stdout.trim()}`]),
    ...(result.stderr.trim() === "" ? [] : [`stderr: ${result.stderr.trim()}`]),
  ];
}

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
 * Classifies one website `.env` file's recognized keys without retaining configured values.
 *
 * @param content - Complete `.env` file contents.
 * @returns Syntax errors, recognized present keys, and missing core or authentication keys.
 */
export function inspectWebsiteEnvironment(content: string): EnvironmentDiagnostic {
  const syntaxErrors: string[] = [];
  const seenAtLine = new Map<string, number>();
  const presentKeys = new Set<string>();

  const lines = content.split(/\r\n|\n|\r/u);
  lines.forEach((rawLine, index) => {
    const lineNumber = index + 1;
    const trimmed = rawLine.trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      return;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      syntaxErrors.push(`Line ${String(lineNumber)}: expected KEY=VALUE syntax.`);
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!ENVIRONMENT_KEY_PATTERN.test(key)) {
      syntaxErrors.push(`Line ${String(lineNumber)}: '${key}' is not a valid environment key name.`);
      return;
    }

    if (seenAtLine.has(key)) {
      syntaxErrors.push(`Line ${String(lineNumber)}: '${key}' duplicates the key first defined on line ${String(seenAtLine.get(key))}.`);
      return;
    }
    seenAtLine.set(key, lineNumber);

    let value = trimmed.slice(separatorIndex + 1).trim();
    if (value.length >= 2 && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) {
      value = value.slice(1, -1);
    }

    if (RECOGNIZED_ENVIRONMENT_KEYS.has(key) && value.trim() !== "") {
      presentKeys.add(key);
    }
  });

  return {
    syntaxErrors,
    presentKeys: [...presentKeys].toSorted(),
    missingCoreKeys: CORE_ENVIRONMENT_KEYS.filter((key) => !presentKeys.has(key)).toSorted(),
    missingAuthenticationKeys: AUTHENTICATION_ENVIRONMENT_KEYS.filter((key) => !presentKeys.has(key)).toSorted(),
  };
}

function extractMessageKeySet(value: UnknownRecord, prefix = ""): Set<string> {
  const keys = new Set<string>();
  for (const [key, entryValue] of Object.entries(value)) {
    const path = prefix === "" ? key : `${prefix}.${key}`;
    if (isRecord(entryValue)) {
      for (const nested of extractMessageKeySet(entryValue, path)) {
        keys.add(nested);
      }
    } else {
      keys.add(path);
    }
  }
  return keys;
}

function extractDeclaredMessagesObject(source: string): UnknownRecord | null {
  const markerIndex = source.indexOf("declare const messages:");
  if (markerIndex === -1) {
    return null;
  }

  const braceStart = source.indexOf("{", markerIndex);
  const braceEnd = source.lastIndexOf("};");
  if (braceStart === -1 || braceEnd === -1 || braceEnd < braceStart) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(source.slice(braceStart, braceEnd + 1));
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function parsePlaywrightInstallList(stdout: string): readonly PlaywrightVersionInventory[] {
  const inventories: PlaywrightVersionInventory[] = [];
  for (const block of stdout.split(/\r?\n\r?\n/u).map((entry) => entry.trim()).filter((entry) => entry !== "")) {
    const versionMatch = /^Playwright version:\s*(\S+)/mu.exec(block);
    const version = versionMatch?.[1];
    if (version === undefined) {
      continue;
    }

    const browsersSection = /Browsers:\r?\n([\s\S]*?)(?:\r?\n\s*References:|$)/mu.exec(block)?.[1] ?? "";
    const browsers = browsersSection
      .split(/\r?\n/u)
      .map((line) => basename(line.trim()))
      .filter((line) => line !== "");
    inventories.push({version, browsers});
  }
  return inventories;
}

function buildIssueDiagnosis(
  issues: readonly string[],
): Readonly<{rootCause?: string; potentialCauses: readonly DiagnosticPotentialCause[]}> {
  const [rootCause] = issues;
  if (issues.length === 1 && rootCause !== undefined) {
    return {rootCause, potentialCauses: []};
  }
  return {potentialCauses: issues.map((cause) => ({cause, confidence: "high" as const}))};
}

async function diagnosePackages(context: Readonly<DoctorContext>): Promise<DiagnosticResult> {
  const startedAt = context.now();
  if (context.requirements.status === "invalid") {
    return skippedDiagnostic({
      id: "react.packages",
      module: "react",
      name: "React ecosystem packages",
      summary: "Package comparison was skipped because requirement sources are invalid.",
      evidence: ["Blocked by invalid runtime requirement sources."],
    });
  }

  try {
    await access(resolve(context.paths.root, "node_modules"));
  } catch {
    return issueDiagnostic(context, startedAt, {
      id: "react.packages",
      name: "React ecosystem packages",
      status: "fail",
      summary: "The root dependency tree is not installed.",
      evidence: ["node_modules was not found at the repository root."],
      rootCause: "Root dependencies have never been installed or were removed.",
      fixes: [{description: "Install root dependencies, then rerun doctor.", command: "npm install"}],
    });
  }

  const result = await context.runner.run(NPM_LS_JSON_COMMAND, {cwd: context.paths.root});
  const commandFailureEvidence = commandStatusEvidence(result);
  let dependencies: UnknownRecord | undefined;
  let metadataRootCause: string | undefined;
  let structuredRootCause: string | undefined;
  const npmDocumentEvidence: string[] = [];
  if (result.stdout.trim() !== "") {
    try {
      const parsed: unknown = JSON.parse(result.stdout);
      if (!isRecord(parsed)) {
        metadataRootCause = "npm ls JSON did not contain an object document.";
      } else {
        const rawDependencies = parsed["dependencies"];
        if (isRecord(rawDependencies)) {
          dependencies = rawDependencies;
        } else if (rawDependencies !== undefined) {
          metadataRootCause = "npm ls JSON contained malformed dependency metadata.";
        }

        const rawError = parsed["error"];
        if (isRecord(rawError)) {
          const code = typeof rawError["code"] === "string" ? rawError["code"].trim() : "";
          const summary = typeof rawError["summary"] === "string" ? rawError["summary"].trim() : "";
          const detail = typeof rawError["detail"] === "string" ? rawError["detail"].trim() : "";
          if (code !== "") {
            npmDocumentEvidence.push(`npm code: ${code}`);
          }
          if (summary !== "") {
            npmDocumentEvidence.push(`npm summary: ${summary}`);
          }
          if (detail !== "") {
            npmDocumentEvidence.push(`npm detail: ${detail}`);
          }
          structuredRootCause = summary !== "" ? summary : code === "" ? (detail === "" ? undefined : detail) : `npm reported ${code}.`;
        }

        const rawProblems = parsed["problems"];
        if (Array.isArray(rawProblems)) {
          for (const problem of rawProblems) {
            if (typeof problem !== "string" || problem.trim() === "") {
              metadataRootCause ??= "npm ls JSON contained malformed problem metadata.";
              continue;
            }
            const normalizedProblem = problem.trim();
            npmDocumentEvidence.push(`npm problem: ${normalizedProblem}`);
            structuredRootCause ??= normalizedProblem;
          }
        } else if (rawProblems !== undefined) {
          metadataRootCause ??= "npm ls JSON contained malformed problem metadata.";
        }
      }
    } catch (error: unknown) {
      metadataRootCause = `Unable to parse npm ls JSON: ${errorMessage(error)}`;
    }
  } else {
    metadataRootCause = "npm ls produced no JSON output.";
  }

  if (dependencies === undefined) {
    const rootCause = structuredRootCause
      ?? metadataRootCause
      ?? "npm ls JSON did not include React ecosystem dependency metadata.";
    const evidence = [
      ...commandFailureEvidence,
      ...npmDocumentEvidence,
      ...(metadataRootCause === undefined ? [] : [metadataRootCause]),
      ...(commandFailureEvidence.length === 0 && npmDocumentEvidence.length === 0 && metadataRootCause === undefined ? [rootCause] : []),
    ];

    return issueDiagnostic(context, startedAt, {
      id: "react.packages",
      name: "React ecosystem packages",
      status: "fail",
      summary: "npm could not produce React ecosystem package metadata.",
      evidence,
      rootCause,
      fixes: [{description: "Correct the reported npm metadata problem, restore root dependencies, then rerun doctor."}],
    });
  }

  const issues: PackageIssue[] = [];
  const okEvidence: string[] = [];
  const packages = context.requirements.requirements.packages;
  for (const name of REACT_PACKAGE_NAMES) {
    const required = packages.get(name)?.version;
    if (required === undefined) {
      issues.push({name, kind: "missing-package", detail: `${name} has no exact-pinned root requirement to compare against.`});
      continue;
    }

    const entry = dependencies[name];
    if (!isRecord(entry) || entry["missing"] === true) {
      issues.push({name, kind: "missing-package", detail: `${name} is required at ${required} but is not installed.`});
      continue;
    }

    if (name === WORKSPACE_LINKED_PACKAGE) {
      const resolvedField = entry["resolved"];
      if (typeof resolvedField !== "string" || !resolvedField.startsWith("file:")) {
        issues.push({
          name,
          kind: "invalid-workspace-link",
          detail: `${name} is not linked to the local workspace package (resolved: ${resolvedField === undefined ? "unknown" : String(resolvedField)}).`,
        });
        continue;
      }
    }

    const installedVersion = entry["version"];
    if (typeof installedVersion !== "string" || installedVersion !== required) {
      issues.push({
        name,
        kind: "version-drift",
        detail: `${name} installed version '${installedVersion === undefined ? "unknown" : String(installedVersion)}' does not match the locked version '${required}'.`,
      });
      continue;
    }

    okEvidence.push(`${name}@${installedVersion} matches the locked requirement.`);
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

  const evidence = [...commandFailureEvidence, ...npmDocumentEvidence, ...issues.map((issue) => issue.detail)];
  const diagnosisEntries = issues.map((issue) => issue.detail);
  return issueDiagnostic(context, startedAt, {
    id: "react.packages",
    name: "React ecosystem packages",
    status: "fail",
    summary: `${String(issues.length)} React ecosystem package${issues.length === 1 ? "" : "s"} failed installation verification.`,
    evidence,
    ...buildIssueDiagnosis(diagnosisEntries),
    fixes: [{description: "Reinstall root dependencies and verify workspace links, then rerun doctor.", command: "npm install"}],
  });
}

function getDependsOn(targets: UnknownRecord, targetName: string): readonly string[] {
  const target = targets[targetName];
  if (!isRecord(target)) {
    return [];
  }
  const dependsOn = target["dependsOn"];
  return Array.isArray(dependsOn) ? dependsOn.filter((entry): entry is string => typeof entry === "string") : [];
}

async function diagnoseWorkspaceLink(context: Readonly<DoctorContext>): Promise<DiagnosticResult> {
  const startedAt = context.now();
  const websitePackageJsonPath = resolve(context.paths.websiteRoot, "package.json");
  const websiteProjectJsonPath = resolve(context.paths.websiteRoot, "project.json");
  const evidence: string[] = [];

  let packageJson: UnknownRecord | null = null;
  let projectJson: UnknownRecord | null = null;
  try {
    const parsed: unknown = JSON.parse(await readFile(websitePackageJsonPath, "utf8"));
    packageJson = isRecord(parsed) ? parsed : null;
    if (packageJson === null) {
      evidence.push(`${websitePackageJsonPath} must contain a JSON object.`);
    }
  } catch (error: unknown) {
    evidence.push(`Unable to read or parse ${websitePackageJsonPath}: ${errorMessage(error)}`);
  }
  try {
    const parsed: unknown = JSON.parse(await readFile(websiteProjectJsonPath, "utf8"));
    projectJson = isRecord(parsed) ? parsed : null;
    if (projectJson === null) {
      evidence.push(`${websiteProjectJsonPath} must contain a JSON object.`);
    }
  } catch (error: unknown) {
    evidence.push(`Unable to read or parse ${websiteProjectJsonPath}: ${errorMessage(error)}`);
  }

  if (packageJson === null || projectJson === null) {
    return issueDiagnostic(context, startedAt, {
      id: "react.workspace-link",
      name: "Website components workspace link",
      status: "fail",
      summary: "Website workspace-link configuration could not be read.",
      evidence,
      ...buildIssueDiagnosis(evidence),
      fixes: [{description: "Restore the website package.json and project.json files, then rerun doctor."}],
    });
  }

  const dependencies = isRecord(packageJson["dependencies"]) ? packageJson["dependencies"] : {};
  const hasComponentsDependency = Object.hasOwn(dependencies, WORKSPACE_LINKED_PACKAGE);
  const targets = isRecord(projectJson["targets"]) ? projectJson["targets"] : {};
  const buildLinked = getDependsOn(targets, "build").includes("components:build");
  const devLinked = getDependsOn(targets, "dev").includes("components:build");

  const problems: string[] = [
    ...(hasComponentsDependency ? [] : ["sites/arolariu.ro/package.json does not declare a dependency on @arolariu/components."]),
    ...(buildLinked ? [] : ["sites/arolariu.ro/project.json build target does not depend on components:build."]),
    ...(devLinked ? [] : ["sites/arolariu.ro/project.json dev target does not depend on components:build."]),
  ];

  if (problems.length > 0) {
    return issueDiagnostic(context, startedAt, {
      id: "react.workspace-link",
      name: "Website components workspace link",
      status: "fail",
      summary: "The website's dependency on @arolariu/components is not fully linked.",
      evidence: problems,
      ...buildIssueDiagnosis(problems),
      fixes: [{description: "Restore the @arolariu/components dependency declaration and Nx dependsOn linkage."}],
    });
  }

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

async function diagnoseEnvironment(context: Readonly<DoctorContext>): Promise<DiagnosticResult> {
  const startedAt = context.now();
  let content: string;
  try {
    content = await readFile(context.paths.websiteEnvironment, "utf8");
  } catch (error: unknown) {
    return issueDiagnostic(context, startedAt, {
      id: "react.environment",
      name: "React environment",
      status: "fail",
      summary: "The website .env file could not be read.",
      evidence: [errorMessage(error)],
      rootCause: "The website .env file is absent or unreadable.",
      fixes: [{description: "Create sites/arolariu.ro/.env from .env.example, then rerun doctor."}],
    });
  }

  const diagnosis = inspectWebsiteEnvironment(content);

  if (diagnosis.syntaxErrors.length > 0) {
    return issueDiagnostic(context, startedAt, {
      id: "react.environment",
      name: "React environment",
      status: "fail",
      summary: "The website .env file contains syntax errors.",
      evidence: diagnosis.syntaxErrors,
      ...buildIssueDiagnosis(diagnosis.syntaxErrors),
      fixes: [{description: "Correct the malformed or duplicate entries in sites/arolariu.ro/.env, then rerun doctor."}],
    });
  }

  if (diagnosis.missingCoreKeys.length > 0) {
    const missingEvidence = diagnosis.missingCoreKeys.map((key) => `Missing required core key: ${key}`);
    return issueDiagnostic(context, startedAt, {
      id: "react.environment",
      name: "React environment",
      status: "fail",
      summary: "The website .env file is missing required core site keys.",
      evidence: missingEvidence,
      ...buildIssueDiagnosis(missingEvidence),
      fixes: [{description: "Add the missing core site keys to sites/arolariu.ro/.env, then rerun doctor."}],
    });
  }

  if (diagnosis.missingAuthenticationKeys.length === 2) {
    const keylessDevelopmentSummary =
      "Both Clerk credentials are absent; ordinary non-CI Next.js development may use Clerk keyless mode.";
    return issueDiagnostic(context, startedAt, {
      id: "react.environment",
      name: "React environment",
      status: "warn",
      summary: keylessDevelopmentSummary,
      evidence: diagnosis.missingAuthenticationKeys.map((key) => `${key}: absent`),
      rootCause: keylessDevelopmentSummary,
      fixes: [{description: "Configure both Clerk keys for CI, production, or authenticated local development."}],
    });
  }

  if (diagnosis.missingAuthenticationKeys.length === 1) {
    return issueDiagnostic(context, startedAt, {
      id: "react.environment",
      name: "React environment",
      status: "fail",
      summary: "Only one Clerk credential is present; the publishable/secret key pair is inconsistent.",
      evidence: [
        ...AUTHENTICATION_ENVIRONMENT_KEYS.map((key) =>
          `${key}: ${diagnosis.missingAuthenticationKeys.includes(key) ? "absent" : "present"}`,
        ),
      ],
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
    diagnosis.presentKeys.map((key) => `${key}: present`),
  );
}

async function diagnoseI18n(context: Readonly<DoctorContext>): Promise<DiagnosticResult> {
  const startedAt = context.now();
  const messagesRoot = resolve(context.paths.websiteRoot, "messages");
  const localePaths = {
    en: resolve(messagesRoot, "en.json"),
    ro: resolve(messagesRoot, "ro.json"),
    fr: resolve(messagesRoot, "fr.json"),
  } as const;

  const parsedLocales = new Map<string, UnknownRecord>();
  const structuralErrors: string[] = [];

  for (const [locale, path] of Object.entries(localePaths)) {
    try {
      const parsed: unknown = JSON.parse(await readFile(path, "utf8"));
      if (!isRecord(parsed)) {
        structuralErrors.push(`${locale}.json must contain a JSON object.`);
        continue;
      }
      parsedLocales.set(locale, parsed);
    } catch (error: unknown) {
      structuralErrors.push(`Unable to read or parse ${locale}.json: ${errorMessage(error)}`);
    }
  }

  if (structuralErrors.length === 0) {
    const enMessages = parsedLocales.get("en")!;
    const enKeys = extractMessageKeySet(enMessages);
    for (const locale of ["ro", "fr"] as const) {
      const localeMessages = parsedLocales.get(locale)!;
      const localeKeys = extractMessageKeySet(localeMessages);
      const missing = [...enKeys].filter((key) => !localeKeys.has(key));
      const extra = [...localeKeys].filter((key) => !enKeys.has(key));
      if (missing.length > 0) {
        structuralErrors.push(`${locale}.json is missing ${String(missing.length)} key(s) present in en.json, e.g. '${missing[0]}'.`);
      }
      if (extra.length > 0) {
        structuralErrors.push(`${locale}.json declares ${String(extra.length)} key(s) not present in en.json, e.g. '${extra[0]}'.`);
      }
    }
  }

  if (structuralErrors.length > 0) {
    return issueDiagnostic(context, startedAt, {
      id: "react.i18n",
      name: "React i18n dictionaries",
      status: "fail",
      summary: "Source locale dictionaries have structural errors.",
      evidence: structuralErrors,
      ...buildIssueDiagnosis(structuralErrors),
      fixes: [{description: "Restore identical key shape across en.json, ro.json, and fr.json.", command: "npm run generate:i18n"}],
    });
  }

  const enKeys = extractMessageKeySet(parsedLocales.get("en")!);
  const declarationPath = resolve(messagesRoot, "en.d.json.ts");
  let staleReason: string | undefined;
  try {
    const declarationSource = await readFile(declarationPath, "utf8");
    const declaredObject = extractDeclaredMessagesObject(declarationSource);
    if (declaredObject === null) {
      staleReason = "messages/en.d.json.ts could not be parsed as a generated declaration object.";
    } else {
      const declaredKeys = extractMessageKeySet(declaredObject);
      const missing = [...enKeys].filter((key) => !declaredKeys.has(key));
      const extra = [...declaredKeys].filter((key) => !enKeys.has(key));
      if (missing.length > 0 || extra.length > 0) {
        staleReason = "messages/en.d.json.ts key shape does not match messages/en.json.";
      }
    }
  } catch {
    staleReason = "messages/en.d.json.ts was not found.";
  }

  if (staleReason !== undefined) {
    return issueDiagnostic(context, startedAt, {
      id: "react.i18n",
      name: "React i18n dictionaries",
      status: "warn",
      summary: "The generated messages type declaration is missing or stale.",
      evidence: [staleReason],
      rootCause: staleReason,
      fixes: [{description: "Regenerate the messages declaration by running the Next.js dev or build process."}],
    });
  }

  return passDiagnostic(
    context,
    startedAt,
    "react.i18n",
    "React i18n dictionaries",
    "Locale dictionaries share an identical key shape and the generated declaration is current.",
    [`Verified ${String(enKeys.size)} message keys across en, ro, and fr.`, "messages/en.d.json.ts key shape matches messages/en.json."],
  );
}

async function diagnoseTaxonomyAndLicenses(context: Readonly<DoctorContext>): Promise<DiagnosticResult> {
  const startedAt = context.now();
  const websiteTaxonomyDirectory = resolve(context.paths.websiteRoot, "src", "data", "taxonomies");
  const websiteTaxonomyPaths = getExpectedTaxonomyArtifactPaths(context.paths.root).filter(
    (path) => dirname(path) === websiteTaxonomyDirectory,
  );

  const evidence: string[] = [];
  const issues: string[] = [];

  for (const path of websiteTaxonomyPaths) {
    try {
      const parsed: unknown = JSON.parse(await readFile(path, "utf8"));
      if (!isRecord(parsed)) {
        issues.push(`${basename(path)}: taxonomy artifact must be a JSON object.`);
        continue;
      }

      const {system, version, sourceUrl, attribution, generatedAt} = parsed;
      const metadataValid =
        typeof system === "string"
        && system.trim() !== ""
        && typeof version === "string"
        && version.trim() !== ""
        && typeof sourceUrl === "string"
        && sourceUrl.trim() !== ""
        && typeof attribution === "string"
        && attribution.trim() !== ""
        && typeof generatedAt === "string"
        && !Number.isNaN(Date.parse(generatedAt));

      if (!metadataValid) {
        issues.push(`${basename(path)}: missing or invalid required taxonomy metadata.`);
        continue;
      }
      evidence.push(`${basename(path)}: version ${version}, generated ${generatedAt}.`);
    } catch (error: unknown) {
      if (hasErrorCode(error, "ENOENT")) {
        issues.push(`Missing website taxonomy artifact: ${path}`);
      } else {
        issues.push(`${basename(path)}: ${errorMessage(error)}`);
      }
    }
  }

  const licensesPath = resolve(context.paths.websiteRoot, "licenses.json");
  try {
    const parsed: unknown = JSON.parse(await readFile(licensesPath, "utf8"));
    if (!isRecord(parsed)) {
      issues.push("licenses.json must contain a JSON object.");
    } else {
      const productionEntries = parsed["production"];
      const validEntry = (entry: unknown): boolean =>
        isRecord(entry)
        && typeof entry["name"] === "string"
        && entry["name"].trim() !== ""
        && typeof entry["license"] === "string"
        && entry["license"].trim() !== ""
        && typeof entry["version"] === "string"
        && entry["version"].trim() !== "";

      if (!Array.isArray(productionEntries) || productionEntries.length === 0) {
        issues.push("licenses.json production entries are missing or empty.");
      } else if (!productionEntries.every(validEntry)) {
        issues.push("licenses.json contains malformed license entries.");
      } else {
        evidence.push(`licenses.json: ${String(productionEntries.length)} production package licenses recorded.`);
      }
    }
  } catch (error: unknown) {
    issues.push(hasErrorCode(error, "ENOENT") ? "licenses.json was not found." : `Unable to parse licenses.json: ${errorMessage(error)}`);
  }

  if (issues.length > 0) {
    return issueDiagnostic(context, startedAt, {
      id: "react.taxonomy-and-licenses",
      name: "React taxonomy and licenses",
      status: "fail",
      summary: "Website taxonomy artifacts or license metadata are incomplete or invalid.",
      evidence: [...issues, ...evidence],
      ...buildIssueDiagnosis(issues),
      fixes: [{description: "Regenerate taxonomy and license artifacts, then rerun doctor.", command: "npm run generate -- /a"}],
    });
  }

  return passDiagnostic(
    context,
    startedAt,
    "react.taxonomy-and-licenses",
    "React taxonomy and licenses",
    "Website taxonomy artifacts and license metadata are present and valid.",
    evidence,
  );
}

async function diagnosePlaywright(context: Readonly<DoctorContext>): Promise<DiagnosticResult> {
  const startedAt = context.now();
  if (context.requirements.status === "invalid") {
    return skippedDiagnostic({
      id: "react.playwright",
      module: "react",
      name: "Playwright browser inventory",
      summary: "Playwright inventory comparison was skipped because requirement sources are invalid.",
      evidence: ["Blocked by invalid runtime requirement sources."],
    });
  }

  const required = context.requirements.requirements.packages.get("playwright")?.version;
  if (required === undefined) {
    return skippedDiagnostic({
      id: "react.playwright",
      module: "react",
      name: "Playwright browser inventory",
      summary: "Playwright inventory comparison was skipped because no locked Playwright requirement exists.",
      evidence: ["package.json does not declare an exact-pinned playwright dependency."],
    });
  }

  const result = await context.runner.run(PLAYWRIGHT_INSTALL_LIST_COMMAND, {cwd: context.paths.root});
  if (!isSuccessfulCommand(result) && result.stdout.trim() === "") {
    return issueDiagnostic(context, startedAt, {
      id: "react.playwright",
      name: "Playwright browser inventory",
      status: "fail",
      summary: "The Playwright browser inventory could not be read.",
      evidence: commandEvidence(result),
      potentialCauses: [{cause: "The Playwright CLI is not installed or failed to run.", confidence: "high"}],
      fixes: [{description: "Verify the Playwright installation, then rerun doctor.", command: "npx --no-install playwright install --list"}],
    });
  }

  const inventories = parsePlaywrightInstallList(result.stdout);
  const matching = inventories.find((inventory) => inventory.version === required);
  if (matching === undefined) {
    return issueDiagnostic(context, startedAt, {
      id: "react.playwright",
      name: "Playwright browser inventory",
      status: "fail",
      summary: "No installed browser inventory was found for the locked Playwright version.",
      evidence: [
        `Locked Playwright version: ${required}`,
        `Reported versions: ${inventories.map((inventory) => inventory.version).join(", ") || "(none)"}`,
      ],
      rootCause: `No installed browser inventory matches the locked Playwright version ${required}.`,
      fixes: [{description: "Install Playwright browsers for the locked version.", command: "npx playwright install chromium"}],
    });
  }

  if (!matching.browsers.some((entry) => CHROMIUM_BROWSER_PATTERN.test(entry))) {
    return issueDiagnostic(context, startedAt, {
      id: "react.playwright",
      name: "Playwright browser inventory",
      status: "fail",
      summary: "Chromium is not installed for the locked Playwright version.",
      evidence: [`Locked Playwright version: ${required}`, `Installed browsers: ${matching.browsers.join(", ") || "(none)"}`],
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
    [`Locked Playwright version: ${required}`, `Installed browsers: ${matching.browsers.join(", ")}`],
  );
}

async function diagnoseFrameworkConfig(context: Readonly<DoctorContext>): Promise<DiagnosticResult> {
  const startedAt = context.now();
  const nextConfigPath = resolve(context.paths.websiteRoot, "next.config.ts");
  const docusaurusConfigPath = resolve(context.paths.docsRoot, "docusaurus.config.ts");
  const issues: string[] = [];
  const evidence: string[] = [];

  try {
    const nextConfigSource = await readFile(nextConfigPath, "utf8");
    if (!/createNextIntlPlugin\s*\(/u.test(nextConfigSource)) {
      issues.push("next.config.ts does not call createNextIntlPlugin.");
    } else if (!/createMessagesDeclaration:\s*["']\.\/messages\/en\.json["']/u.test(nextConfigSource)) {
      issues.push("next.config.ts does not declare createMessagesDeclaration for ./messages/en.json.");
    } else if (!/export default/u.test(nextConfigSource)) {
      issues.push("next.config.ts does not export a default configuration.");
    } else {
      evidence.push("next.config.ts wires next-intl message declaration generation.");
    }
  } catch (error: unknown) {
    issues.push(`Unable to read next.config.ts: ${errorMessage(error)}`);
  }

  try {
    const docusaurusConfigSource = await readFile(docusaurusConfigPath, "utf8");
    if (!/@docusaurus\/preset-classic/u.test(docusaurusConfigSource)) {
      issues.push("docusaurus.config.ts does not reference @docusaurus/preset-classic.");
    } else if (!/export default/u.test(docusaurusConfigSource)) {
      issues.push("docusaurus.config.ts does not export a default configuration.");
    } else {
      evidence.push("docusaurus.config.ts exports a classic-preset configuration.");
    }
  } catch (error: unknown) {
    issues.push(`Unable to read docusaurus.config.ts: ${errorMessage(error)}`);
  }

  if (issues.length > 0) {
    return issueDiagnostic(context, startedAt, {
      id: "react.framework-config",
      name: "React framework configuration",
      status: "fail",
      summary: "Website or docs framework configuration is missing required wiring.",
      evidence: issues,
      ...buildIssueDiagnosis(issues),
      fixes: [{description: "Restore the required Next.js and Docusaurus configuration wiring."}],
    });
  }

  return passDiagnostic(
    context,
    startedAt,
    "react.framework-config",
    "React framework configuration",
    "Next.js and Docusaurus configuration wiring is intact.",
    evidence,
  );
}

/** Read-only React diagnostic module. */
export const reactDoctorModule: DiagnosticModule = {
  id: "react",
  title: "React",
  async run(context): Promise<readonly DiagnosticResult[]> {
    return [
      await diagnosePackages(context),
      await diagnoseWorkspaceLink(context),
      await diagnoseEnvironment(context),
      await diagnoseI18n(context),
      await diagnoseTaxonomyAndLicenses(context),
      await diagnosePlaywright(context),
      await diagnoseFrameworkConfig(context),
    ];
  },
};
