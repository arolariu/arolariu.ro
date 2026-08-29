/**
 * @fileoverview React workspace, website environment, and Playwright setup phase.
 * @module scripts.setup.react
 */

import {chmod, readFile, stat, writeFile} from "node:fs/promises";
import {resolve} from "node:path";

import type {CommandResult, CommandSpec} from "./common/process.ts";
import {appendMissingEnvironmentValues, parseEnvironmentFile} from "./generate.env.ts";
import {getExpectedTaxonomyArtifactPaths} from "./generate.artifacts.ts";
import type {SetupActionDisposition, SetupContext, SetupPhaseDefinition, SetupPhaseResult} from "./setup.types.ts";

type UnknownRecord = Readonly<Record<string, unknown>>;
type InspectedPathKind = "file" | "directory" | "missing";
type ClerkMode = "test" | "live";

/** Injectable filesystem and host boundaries used by the React setup phase. */
export interface ReactSetupDependencies {
  /** Host platform used for Playwright and file-mode behavior. */
  readonly platform: NodeJS.Platform;
  /** Whether both setup input and output are interactive terminals. */
  readonly interactive: boolean;
  /** Reads one UTF-8 text file. */
  readonly readTextFile: (path: string) => Promise<string>;
  /** Writes one UTF-8 text file with the requested creation mode. */
  readonly writeTextFile: (path: string, content: string, mode: number) => Promise<void>;
  /** Enforces one file mode after a successful write. */
  readonly setFileMode: (path: string, mode: number) => Promise<void>;
  /** Inspects whether a path is a file, directory, or absent. */
  readonly inspectPath: (path: string) => Promise<InspectedPathKind>;
}

/** Outcome of additive website environment preparation. */
export interface EnvironmentPreparationResult {
  /** Whether both Clerk credentials are valid and mode-compatible. */
  readonly status: "complete" | "degraded";
  /** Existing setup-owned key names in canonical order. */
  readonly preservedKeys: readonly string[];
  /** Newly written or dry-run-planned key names in canonical order. */
  readonly writtenKeys: readonly string[];
  /** Absent or invalid external credential key names. */
  readonly missingExternalKeys: readonly string[];
}

interface EnvironmentPreparationOutcome extends EnvironmentPreparationResult {
  readonly actionDisposition?: SetupActionDisposition;
}

interface PlaywrightPreparationOutcome {
  readonly plannedActions: readonly string[];
  readonly evidence: readonly string[];
}

interface PackageValidation {
  readonly playwrightVersion: string;
  readonly evidence: readonly string[];
}

const REQUIRED_PACKAGES = [
  "react",
  "react-dom",
  "next",
  "@clerk/nextjs",
  "@docusaurus/core",
  "@playwright/test",
  "@arolariu/components",
] as const;
const LOCAL_DEFAULTS = new Map<string, string>([
  ["SITE_ENV", "DEVELOPMENT"],
  ["SITE_NAME", "dev.arolariu.ro"],
  ["SITE_URL", "https://localhost:3000"],
  ["USE_CDN", "false"],
]);
const CLERK_KEYS = ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"] as const;
const SETUP_OWNED_KEYS = [...LOCAL_DEFAULTS.keys(), ...CLERK_KEYS] as const;
const ENVIRONMENT_WRITE_ACTION = "react.environment.write";
const BROWSER_INSTALL_ACTION = "react.playwright.chromium.install";
const SYSTEM_DEPENDENCIES_ACTION = "react.playwright.system-dependencies.install";
const PACKAGE_INSPECTION_COMMAND: CommandSpec = {
  command: "npm",
  args: ["ls", "--json", "--depth=0", ...REQUIRED_PACKAGES],
};
const BROWSER_INVENTORY_COMMAND: CommandSpec = {
  command: "npx",
  args: ["--no-install", "playwright", "install", "--list"],
};
const BROWSER_INSTALL_COMMAND: CommandSpec = {
  command: "npx",
  args: ["--no-install", "playwright", "install", "chromium"],
};
const SYSTEM_DEPENDENCIES_PROBE: CommandSpec = {
  command: "npx",
  args: ["--no-install", "playwright", "install-deps", "--dry-run", "chromium"],
};
const SYSTEM_DEPENDENCIES_INSTALL: CommandSpec = {
  command: "npx",
  args: ["--no-install", "playwright", "install-deps", "chromium"],
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSuccessfulCommand(result: Readonly<CommandResult>): boolean {
  return result.code === 0 && !result.timedOut && result.signal === undefined && result.spawnError === undefined;
}

function transportSucceeded(result: Readonly<CommandResult>): boolean {
  return !result.timedOut && result.signal === undefined && result.spawnError === undefined;
}

function isInterrupted(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function hasErrorCode(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}

function commandFailureEvidence(result: Readonly<CommandResult>): readonly string[] {
  return [
    ...(result.spawnError === undefined ? [] : [`Unable to start command: ${result.spawnError}`]),
    ...(result.timedOut ? ["Command timed out."] : []),
    ...(result.signal === undefined ? [] : [`Command stopped with signal ${result.signal}.`]),
    ...(result.code === 0 ? [] : [`Command exited with code ${result.code}.`]),
    ...(result.stdout.trim() === "" ? [] : [`stdout: ${result.stdout.trim()}`]),
    ...(result.stderr.trim() === "" ? [] : [`stderr: ${result.stderr.trim()}`]),
  ];
}

function sanitize(value: string, secrets: readonly string[]): string {
  let sanitized = value;
  for (const secret of [...secrets].filter((candidate) => candidate !== "").toSorted((left, right) => right.length - left.length)) {
    sanitized = sanitized.replaceAll(secret, "[REDACTED]");
  }
  return sanitized;
}

function errorMessage(error: unknown, secrets: readonly string[]): string {
  return sanitize(error instanceof Error ? error.message : String(error), secrets);
}

function duration(startedAt: number, context: SetupContext): number {
  return Math.max(0, context.now() - startedAt);
}

function phaseResult(context: SetupContext, startedAt: number, input: Omit<SetupPhaseResult, "durationMs">): SetupPhaseResult {
  return {
    ...input,
    durationMs: duration(startedAt, context),
  };
}

function defaultDependencies(): ReactSetupDependencies {
  return {
    platform: process.platform,
    interactive: process.stdin.isTTY === true && process.stdout.isTTY === true,
    readTextFile: (path) => readFile(path, "utf8"),
    writeTextFile: async (path, content, mode) => {
      await writeFile(path, content, {encoding: "utf8", mode});
    },
    setFileMode: async (path, mode) => {
      await chmod(path, mode);
    },
    inspectPath: async (path) => {
      try {
        const entry = await stat(path);
        if (entry.isFile()) {
          return "file";
        }
        if (entry.isDirectory()) {
          return "directory";
        }
        return "missing";
      } catch (error: unknown) {
        if (hasErrorCode(error, "ENOENT")) {
          return "missing";
        }
        throw error;
      }
    },
  };
}

function parseJsonObject(content: string, source: string): UnknownRecord {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error: unknown) {
    throw new Error(`Unable to parse ${source}: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!isRecord(parsed)) {
    throw new Error(`${source} must contain a JSON object.`);
  }
  return parsed;
}

function requiredString(record: UnknownRecord, key: string, source: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${source} must contain a nonempty string '${key}' field.`);
  }
  return value;
}

async function deriveLinkedComponentsVersion(context: SetupContext, dependencies: ReactSetupDependencies): Promise<string> {
  const componentManifestPath = resolve(context.paths.componentsRoot, "package.json");
  const [componentContents, lockContents] = await Promise.all([
    dependencies.readTextFile(componentManifestPath),
    dependencies.readTextFile(context.paths.packageLock),
  ]);
  const componentManifest = parseJsonObject(componentContents, componentManifestPath);
  const componentVersion = requiredString(componentManifest, "version", componentManifestPath);
  const packageLock = parseJsonObject(lockContents, context.paths.packageLock);
  const packages = packageLock["packages"];
  if (!isRecord(packages)) {
    throw new Error("package-lock.json must contain a packages object.");
  }
  const lockEntry = packages["packages/components"];
  if (!isRecord(lockEntry)) {
    throw new Error("package-lock.json is missing the linked packages/components entry.");
  }
  const lockedVersion = requiredString(lockEntry, "version", 'package-lock.json#packages["packages/components"]');
  if (lockedVersion !== componentVersion) {
    throw new Error(
      `The linked @arolariu/components package version ${componentVersion} disagrees with its workspace lock entry ${lockedVersion}.`,
    );
  }
  return componentVersion;
}

function expectedExternalVersions(context: SetupContext): ReadonlyMap<string, string> {
  const versions = new Map<string, string>();
  for (const name of REQUIRED_PACKAGES) {
    if (name === "@arolariu/components") {
      continue;
    }
    const requirement = context.requirements.packages.get(name);
    if (requirement === undefined || requirement.version.trim() === "") {
      throw new Error(`Manifest-derived package requirement '${name}' is missing.`);
    }
    versions.set(name, requirement.version);
  }

  const playwright = context.requirements.packages.get("playwright");
  const playwrightTest = context.requirements.packages.get("@playwright/test");
  if (playwright === undefined || playwrightTest === undefined || playwright.version !== playwrightTest.version) {
    throw new Error("The root playwright and @playwright/test requirements must exist and use the same version.");
  }
  return versions;
}

function collectInstalledVersions(
  value: unknown,
  targets: ReadonlySet<string>,
  versions: Map<string, string[]>,
  problems: string[],
  location: string = "npm",
): void {
  if (!isRecord(value)) {
    return;
  }

  const dependencies = value["dependencies"];
  if (!isRecord(dependencies)) {
    return;
  }

  for (const [name, dependency] of Object.entries(dependencies)) {
    const dependencyLocation = `${location} > ${name}`;
    if (targets.has(name)) {
      if (!isRecord(dependency) || typeof dependency["version"] !== "string" || dependency["version"].trim() === "") {
        problems.push(`${dependencyLocation} has no installed version.`);
      } else {
        const found = versions.get(name) ?? [];
        found.push(dependency["version"]);
        versions.set(name, found);
      }
    }
    collectInstalledVersions(dependency, targets, versions, problems, dependencyLocation);
  }
}

async function validatePackages(context: SetupContext, expected: ReadonlyMap<string, string>): Promise<PackageValidation> {
  const inspection = await context.runner.run(PACKAGE_INSPECTION_COMMAND, {cwd: context.paths.root});
  if (!isSuccessfulCommand(inspection)) {
    throw new Error(["Required React package inspection failed.", ...commandFailureEvidence(inspection)].join("\n"));
  }
  const parsed = parseJsonObject(inspection.stdout, "npm ls package output");
  const versions = new Map<string, string[]>();
  const problems: string[] = [];
  collectInstalledVersions(parsed, new Set(expected.keys()), versions, problems);

  for (const [name, expectedVersion] of expected) {
    const installed = versions.get(name) ?? [];
    if (installed.length === 0) {
      problems.push(`Required package '${name}' is absent from npm evidence.`);
      continue;
    }
    for (const installedVersion of installed) {
      if (installedVersion !== expectedVersion) {
        problems.push(`Required package '${name}' expected ${expectedVersion}, but npm reported ${installedVersion}.`);
      }
    }
  }
  if (problems.length > 0) {
    throw new Error(problems.join("\n"));
  }

  const playwrightVersion = expected.get("@playwright/test");
  if (playwrightVersion === undefined) {
    throw new Error("The locked @playwright/test version could not be selected.");
  }
  return {
    playwrightVersion,
    evidence: [`Verified ${expected.size} required React workspace package(s) from npm evidence.`],
  };
}

function clerkMode(key: (typeof CLERK_KEYS)[number], value: string | undefined): ClerkMode | null {
  if (value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  const prefix = key === "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" ? "pk" : "sk";
  for (const mode of ["test", "live"] as const) {
    const requiredPrefix = `${prefix}_${mode}_`;
    if (trimmed.startsWith(requiredPrefix) && trimmed.length > requiredPrefix.length) {
      return mode;
    }
  }
  return null;
}

function registerSensitiveValue(context: SetupContext, knownSecrets: string[], value: string): void {
  if (value === "") {
    return;
  }
  knownSecrets.push(value);
  context.logger.redact(value);
}

async function readEnvironment(path: string, dependencies: ReactSetupDependencies): Promise<string> {
  try {
    return await dependencies.readTextFile(path);
  } catch (error: unknown) {
    if (hasErrorCode(error, "ENOENT")) {
      return "";
    }
    throw new Error(`Unable to read website environment file '${path}': ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function prepareWebsiteEnvironmentWithDependencies(
  context: SetupContext,
  dependencies: ReactSetupDependencies,
  knownSecrets: string[],
): Promise<EnvironmentPreparationOutcome> {
  const original = await readEnvironment(context.paths.websiteEnvironment, dependencies);
  const existing = parseEnvironmentFile(original);
  const additions = new Map<string, string>();
  const prompted = new Map<(typeof CLERK_KEYS)[number], string>();

  for (const [key, value] of LOCAL_DEFAULTS) {
    if (!existing.has(key)) {
      additions.set(key, value);
    }
  }

  for (const key of CLERK_KEYS) {
    const current = existing.get(key)?.trim();
    if (current !== undefined && current !== "") {
      registerSensitiveValue(context, knownSecrets, current);
    }
    if (existing.has(key) || context.options.dryRun || !dependencies.interactive) {
      continue;
    }

    const answer = (
      key === "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" ? await context.prompts.text(key) : await context.prompts.secret(key)
    ).trim();
    registerSensitiveValue(context, knownSecrets, answer);
    if (answer !== "") {
      prompted.set(key, answer);
    }
  }

  const candidateValues = new Map<(typeof CLERK_KEYS)[number], string>();
  for (const key of CLERK_KEYS) {
    const existingValue = existing.get(key);
    if (existingValue !== undefined) {
      candidateValues.set(key, existingValue);
      continue;
    }
    const promptedValue = prompted.get(key);
    if (promptedValue !== undefined) {
      candidateValues.set(key, promptedValue);
    }
  }

  const publishableMode = clerkMode("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", candidateValues.get("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"));
  const secretMode = clerkMode("CLERK_SECRET_KEY", candidateValues.get("CLERK_SECRET_KEY"));
  const modesMismatch = publishableMode !== null && secretMode !== null && publishableMode !== secretMode;
  const missingExternalKeys = CLERK_KEYS.filter((key) => {
    const mode = clerkMode(key, candidateValues.get(key));
    return mode === null || modesMismatch;
  });

  for (const key of CLERK_KEYS) {
    const value = prompted.get(key);
    if (value !== undefined && clerkMode(key, value) !== null && !modesMismatch) {
      additions.set(key, value);
    }
  }

  const nextContent = appendMissingEnvironmentValues(original, additions);
  let actionDisposition: SetupActionDisposition | undefined;
  if (nextContent !== original) {
    actionDisposition = await context.actions.run({
      id: ENVIRONMENT_WRITE_ACTION,
      scope: "repository",
      summary: "Append missing setup-owned website environment keys.",
      execute: async () => {
        await dependencies.writeTextFile(context.paths.websiteEnvironment, nextContent, 0o600);
        if (dependencies.platform !== "win32") {
          await dependencies.setFileMode(context.paths.websiteEnvironment, 0o600);
        }
      },
    });
    if (actionDisposition === "declined") {
      throw new Error(`Required action '${ENVIRONMENT_WRITE_ACTION}' was declined.`);
    }
  }

  return {
    status: missingExternalKeys.length === 0 ? "complete" : "degraded",
    preservedKeys: SETUP_OWNED_KEYS.filter((key) => existing.has(key)),
    writtenKeys: SETUP_OWNED_KEYS.filter((key) => additions.has(key)),
    missingExternalKeys,
    ...(actionDisposition === undefined ? {} : {actionDisposition}),
  };
}

/**
 * Additively prepares the website environment with production filesystem and TTY boundaries.
 *
 * @param context - Active setup context.
 * @returns Preserved, written, and degraded credential state.
 */
export function prepareWebsiteEnvironment(context: SetupContext): Promise<EnvironmentPreparationResult> {
  return prepareWebsiteEnvironmentWithDependencies(context, defaultDependencies(), []);
}

async function inspectGeneratedArtifacts(
  context: SetupContext,
  dependencies: ReactSetupDependencies,
): Promise<Readonly<{missing: readonly string[]; invalid: readonly string[]}>> {
  const expected = [
    ...getExpectedTaxonomyArtifactPaths(context.paths.root),
    resolve(context.paths.websiteRoot, "licenses.json"),
    resolve(context.paths.websiteRoot, "messages", "en.json"),
    resolve(context.paths.websiteRoot, "messages", "ro.json"),
    resolve(context.paths.websiteRoot, "messages", "fr.json"),
  ];
  const states = await Promise.all(expected.map(async (path) => ({path, kind: await dependencies.inspectPath(path)})));
  return {
    missing: states.filter(({kind}) => kind === "missing").map(({path}) => path),
    invalid: states.filter(({kind}) => kind !== "file" && kind !== "missing").map(({path}) => path),
  };
}

function groupContainsChromium(lines: readonly string[]): boolean {
  for (const line of lines) {
    for (const token of line.trim().split(/\s+/u)) {
      const normalized = token.replace(/^["'([{]+|["'\])},;:]+$/gu, "").replaceAll("\\", "/");
      const baseName = normalized.split("/").at(-1);
      if (baseName?.startsWith("chromium-") === true) {
        return true;
      }
    }
  }
  return false;
}

function hasLockedChromium(inventory: string, lockedVersion: string): boolean {
  const lines = inventory.split(/\r\n|\n|\r/u);
  let currentVersion: string | null = null;
  let currentLines: string[] = [];

  const matches = (): boolean => currentVersion === lockedVersion && groupContainsChromium(currentLines);
  for (const line of lines) {
    const versionMatch = /^Playwright version:\s*(\S+)\s*$/u.exec(line.trim());
    if (versionMatch !== null) {
      if (matches()) {
        return true;
      }
      currentVersion = versionMatch[1] ?? null;
      currentLines = [];
      continue;
    }
    if (currentVersion !== null) {
      currentLines.push(line);
    }
  }
  return matches();
}

async function browserInventory(context: SetupContext): Promise<CommandResult> {
  const inventory = await context.runner.run(BROWSER_INVENTORY_COMMAND, {cwd: context.paths.root});
  if (!isSuccessfulCommand(inventory)) {
    throw new Error(["Playwright browser inventory failed.", ...commandFailureEvidence(inventory)].join("\n"));
  }
  return inventory;
}

async function ensureLinuxDependencies(context: SetupContext, evidence: string[], plannedActions: string[]): Promise<void> {
  const initialProbe = await context.runner.run(SYSTEM_DEPENDENCIES_PROBE, {cwd: context.paths.root});
  if (!transportSucceeded(initialProbe)) {
    throw new Error(["Playwright Linux dependency probe was inconclusive.", ...commandFailureEvidence(initialProbe)].join("\n"));
  }
  if (initialProbe.code === 0) {
    evidence.push("Playwright Chromium Linux system dependencies are ready.");
    return;
  }

  const disposition = await context.actions.run({
    id: SYSTEM_DEPENDENCIES_ACTION,
    scope: "system",
    summary: "Install Playwright Chromium Linux system dependencies.",
    execute: async () => {
      const installation = await context.runner.run(SYSTEM_DEPENDENCIES_INSTALL, {
        cwd: context.paths.root,
        output: "tee",
        logger: context.logger,
      });
      if (!isSuccessfulCommand(installation)) {
        throw new Error(["Playwright Linux dependency installation failed.", ...commandFailureEvidence(installation)].join("\n"));
      }
    },
  });
  if (disposition === "declined") {
    throw new Error(`Required action '${SYSTEM_DEPENDENCIES_ACTION}' was declined after the dependency probe failed.`);
  }
  if (disposition === "planned") {
    plannedActions.push(SYSTEM_DEPENDENCIES_ACTION);
    evidence.push(`Planned action: ${SYSTEM_DEPENDENCIES_ACTION}`);
    return;
  }

  const verifiedProbe = await context.runner.run(SYSTEM_DEPENDENCIES_PROBE, {cwd: context.paths.root});
  if (!isSuccessfulCommand(verifiedProbe)) {
    throw new Error(
      ["Playwright Linux dependencies remain unavailable after installation.", ...commandFailureEvidence(verifiedProbe)].join("\n"),
    );
  }
  evidence.push(`Executed and verified action: ${SYSTEM_DEPENDENCIES_ACTION}`);
}

async function preparePlaywright(
  context: SetupContext,
  platform: NodeJS.Platform,
  lockedVersion: string,
): Promise<PlaywrightPreparationOutcome> {
  const evidence: string[] = [];
  const plannedActions: string[] = [];
  const initialInventory = await browserInventory(context);
  const chromiumPresent = hasLockedChromium(initialInventory.stdout, lockedVersion);

  if (platform === "linux") {
    await ensureLinuxDependencies(context, evidence, plannedActions);
  }

  if (chromiumPresent) {
    evidence.push(`Playwright Chromium is installed for locked version ${lockedVersion}.`);
    return {plannedActions, evidence};
  }

  const disposition = await context.actions.run({
    id: BROWSER_INSTALL_ACTION,
    scope: "repository",
    summary: "Install the locked Playwright Chromium browser.",
    execute: async () => {
      const installation = await context.runner.run(BROWSER_INSTALL_COMMAND, {
        cwd: context.paths.root,
        output: "tee",
        logger: context.logger,
      });
      if (!isSuccessfulCommand(installation)) {
        throw new Error(["Playwright Chromium installation failed.", ...commandFailureEvidence(installation)].join("\n"));
      }
    },
  });
  if (disposition === "declined") {
    throw new Error(`Required action '${BROWSER_INSTALL_ACTION}' was declined.`);
  }
  if (disposition === "planned") {
    plannedActions.push(BROWSER_INSTALL_ACTION);
    evidence.push(`Planned action: ${BROWSER_INSTALL_ACTION}`);
    return {plannedActions, evidence};
  }

  const verifiedInventory = await browserInventory(context);
  if (!hasLockedChromium(verifiedInventory.stdout, lockedVersion)) {
    throw new Error(`Playwright Chromium postcondition failed for locked version ${lockedVersion}.`);
  }
  evidence.push(`Executed and verified action: ${BROWSER_INSTALL_ACTION}`);
  return {plannedActions, evidence};
}

async function runReactSetup(context: SetupContext, dependencies: ReactSetupDependencies): Promise<SetupPhaseResult> {
  const startedAt = context.now();
  const evidence: string[] = [];
  const knownSecrets: string[] = [];

  try {
    const rootDependencies = await dependencies.inspectPath(resolve(context.paths.root, "node_modules"));
    const expectedPackages = new Map(expectedExternalVersions(context));
    expectedPackages.set("@arolariu/components", await deriveLinkedComponentsVersion(context, dependencies));
    const artifacts = await inspectGeneratedArtifacts(context, dependencies);
    if (artifacts.invalid.length > 0) {
      throw new Error(artifacts.invalid.map((path) => `Generated artifact path is not a file: ${path}`).join("\n"));
    }

    if (context.options.dryRun && rootDependencies === "missing") {
      const environment = await prepareWebsiteEnvironmentWithDependencies(context, dependencies, knownSecrets);
      const browserDisposition = await context.actions.run({
        id: BROWSER_INSTALL_ACTION,
        scope: "repository",
        summary: "Install the locked Playwright Chromium browser after root dependencies are restored.",
        execute: async () => {
          throw new Error("A fresh-checkout dry-run must not execute deferred Playwright installation.");
        },
      });
      if (browserDisposition === "declined") {
        throw new Error(`Required action '${BROWSER_INSTALL_ACTION}' was declined.`);
      }
      evidence.push("Deferred package and browser postconditions until planned workspace.root-dependencies restoration.");
      if (artifacts.missing.length > 0) {
        evidence.push("Deferred generated artifact postconditions to the planned workspace.generators action.");
      } else {
        evidence.push(`Verified ${generatedArtifactCount(context)} generated website artifact(s).`);
      }
      if (environment.actionDisposition === "planned") {
        evidence.push(`Planned action: ${ENVIRONMENT_WRITE_ACTION}`);
      }
      if (browserDisposition === "planned") {
        evidence.push(`Planned action: ${BROWSER_INSTALL_ACTION}`);
      }
      if (environment.missingExternalKeys.length > 0) {
        evidence.push(`Missing or invalid external keys: ${environment.missingExternalKeys.join(", ")}.`);
      }
      return phaseResult(context, startedAt, {
        id: "react",
        status: "skipped",
        summary: "React package and Playwright postconditions are deferred by fresh-checkout dry-run.",
        evidence,
        nextActions: [],
      });
    }

    const packageValidation = await validatePackages(context, expectedPackages);
    evidence.push(...packageValidation.evidence);

    if (artifacts.missing.length > 0) {
      if (!context.options.dryRun) {
        throw new Error(artifacts.missing.map((path) => `Missing generated artifact: ${path}`).join("\n"));
      }
      evidence.push(
        `Deferred ${artifacts.missing.length} absent generated artifact postcondition(s) to the planned workspace.generators action.`,
      );
    } else {
      evidence.push(`Verified ${generatedArtifactCount(context)} generated website artifact(s).`);
    }

    const environment = await prepareWebsiteEnvironmentWithDependencies(context, dependencies, knownSecrets);
    evidence.push(
      `Preserved setup-owned environment keys: ${environment.preservedKeys.join(", ") || "none"}.`,
      `${environment.actionDisposition === "planned" ? "Planned" : "Wrote"} setup-owned environment keys: ${
        environment.writtenKeys.join(", ") || "none"
      }.`,
    );
    if (environment.actionDisposition === "planned") {
      evidence.push(`Planned action: ${ENVIRONMENT_WRITE_ACTION}`);
    }
    if (environment.missingExternalKeys.length > 0) {
      evidence.push(`Missing or invalid external keys: ${environment.missingExternalKeys.join(", ")}.`);
    }

    const playwright = await preparePlaywright(context, dependencies.platform, packageValidation.playwrightVersion);
    evidence.push(...playwright.evidence);

    const planned =
      environment.actionDisposition === "planned"
      || playwright.plannedActions.length > 0
      || (context.options.dryRun && artifacts.missing.length > 0);
    if (planned) {
      return phaseResult(context, startedAt, {
        id: "react",
        status: "skipped",
        summary: "React workspace preparation actions and postconditions are planned by dry-run.",
        evidence,
        nextActions: [],
      });
    }

    if (environment.status === "degraded") {
      return phaseResult(context, startedAt, {
        id: "react",
        status: "degraded",
        summary: "React tooling is ready, but Clerk-authenticated website features remain unavailable.",
        evidence,
        nextActions: ["Provide valid mode-compatible Clerk credentials and rerun setup."],
      });
    }

    return phaseResult(context, startedAt, {
      id: "react",
      status: "succeeded",
      summary: "React packages, generated artifacts, website environment, and Playwright Chromium are ready.",
      evidence,
      nextActions: [],
    });
  } catch (error: unknown) {
    if (isInterrupted(error)) {
      throw error;
    }
    return phaseResult(context, startedAt, {
      id: "react",
      status: "failed",
      summary: "The required React workspace preparation phase failed.",
      evidence: [...evidence, errorMessage(error, knownSecrets)],
      nextActions: ["Resolve the reported React setup failure, then rerun setup."],
    });
  }
}

function generatedArtifactCount(context: SetupContext): number {
  return getExpectedTaxonomyArtifactPaths(context.paths.root).length + 4;
}

/**
 * Creates the React setup phase with explicit host and filesystem boundaries.
 *
 * @param dependencies - Optional production-boundary replacements for tests.
 * @returns The required React setup phase definition.
 */
export function createReactSetupPhase(dependencies: Partial<ReactSetupDependencies> = {}): SetupPhaseDefinition {
  const defaults = defaultDependencies();
  const resolvedDependencies: ReactSetupDependencies = {
    platform: dependencies.platform ?? defaults.platform,
    interactive: dependencies.interactive ?? defaults.interactive,
    readTextFile: dependencies.readTextFile ?? defaults.readTextFile,
    writeTextFile: dependencies.writeTextFile ?? defaults.writeTextFile,
    setFileMode: dependencies.setFileMode ?? defaults.setFileMode,
    inspectPath: dependencies.inspectPath ?? defaults.inspectPath,
  };
  return {
    id: "react",
    title: "React workspace",
    required: true,
    dependsOn: ["workspace.root-dependencies", "workspace.generators"],
    run: (context) => runReactSetup(context, resolvedDependencies),
  };
}

/** Required phase that prepares React workspaces, website environment, and Playwright. */
export const reactSetupPhase: SetupPhaseDefinition = createReactSetupPhase();
