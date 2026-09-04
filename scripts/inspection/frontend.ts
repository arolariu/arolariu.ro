/**
 * @fileoverview Shared read-only React, website, and standalone SvelteKit inspection facts.
 * @module scripts/inspection/frontend
 *
 * @remarks
 * Every fact is derived from repository-authored filesystem reads and one opaque, allowlisted
 * probe (`frontend.playwright-inventory`). Command output, native filesystem errors, and absolute
 * or home paths never cross this module's public boundary; every issue string is a fixed,
 * generic, repository-relative description. React and both standalone Svelte projects share one
 * installed-package inventory (see `./packages.ts`), so this module never spawns its own package
 * lookup commands.
 */

import {basename, relative, resolve} from "node:path";

import type {ProcessExecutionResult} from "../core/process/process-execution-result.ts";
import type {RepositoryPaths} from "../common/repository-paths.ts";
import {getExpectedTaxonomyArtifactPaths} from "../common/taxonomy-artifacts.ts";
import {SVELTE_INSPECTED_PACKAGE_NAMES, type PackageInventoryFacts} from "./packages.ts";
import type {InspectionProbeRunner} from "./probes.ts";
import {probes} from "./probes.ts";
import type {InspectionOutcome, InspectionProvider, InspectionProviderContext} from "./types.ts";

/** Read-only filesystem capability every frontend inspection helper observes disk through. */
type InspectionFiles = InspectionProviderContext["files"];

type UnknownRecord = Readonly<Record<string, unknown>>;

/** Website `.env` classification exposing only recognized key names, never configured values. */
export interface EnvironmentFacts {
  /** Line-numbered syntax problems found while parsing the file. */
  readonly syntaxErrors: readonly string[];
  /** Recognized keys with a non-empty configured value, in sorted order. */
  readonly presentKeys: readonly string[];
  /** Recognized core site keys absent or empty, in canonical order. */
  readonly missingCoreKeys: readonly string[];
  /** Recognized Clerk authentication keys absent or empty, in canonical order. */
  readonly missingAuthenticationKeys: readonly string[];
}

/** Shared read-only React and website facts consumed by setup and doctor policy. */
export interface ReactFacts {
  /** Shared installed-package inventory for every React/Next.js and Svelte package name. */
  readonly packages: PackageInventoryFacts;
  /** Deterministic issues for the `@arolariu/components` workspace link. */
  readonly workspaceLinkIssues: readonly string[];
  /** Website `.env` classification. */
  readonly environment: EnvironmentFacts;
  /** Deterministic issues comparing `en`, `ro`, and `fr` message dictionaries and their declaration. */
  readonly i18nIssues: readonly string[];
  /** Deterministic issues for generated website taxonomy, license, and message artifacts. */
  readonly artifactIssues: readonly string[];
  /** Installed Playwright browser inventory for the locked Playwright package version. */
  readonly playwright: Readonly<{version?: string; browsers: readonly string[]}>;
  /** Deterministic issues for Next.js and Docusaurus framework configuration wiring. */
  readonly frameworkIssues: readonly string[];
}

/** Identity of one standalone SvelteKit project inspected by this module. */
export type SvelteProjectId = "cv" | "status";

/** Shared read-only SvelteKit facts for one standalone project. */
export interface SvelteFacts {
  /** Identity of the inspected standalone project. */
  readonly id: SvelteProjectId;
  /** Deterministic issues for the project's manifest and required package inventory. */
  readonly packageIssues: readonly string[];
  /** Validated `package.json#engines.node` range, when present and well-formed. */
  readonly nodeEngine?: string;
  /** Deterministic issues for required lifecycle scripts and their Nx/Vite wiring. */
  readonly scriptIssues: readonly string[];
  /** Whether the generated `.svelte-kit/tsconfig.json` exists as a regular file. */
  readonly generatedConfigExists: boolean;
  /** Adapter package specifier configured by `svelte.config`, when recognized. */
  readonly adapterSpecifier?: string;
  /** Deterministic issues for the configured SvelteKit adapter. */
  readonly adapterIssues: readonly string[];
}

/** Shared injectable boundaries consumed by both the React and Svelte providers. */
export interface FrontendProviderInput extends Pick<InspectionProviderContext, "files" | "clock" | "tasks"> {
  /** Canonical repository paths. */
  readonly paths: RepositoryPaths;
  /** Resolves the one shared installed-package inventory for this session. */
  readonly packages: () => Promise<InspectionOutcome<PackageInventoryFacts>>;
  /** Opaque probe runner used only for the allowlisted Playwright browser inventory probe. */
  readonly probes: InspectionProbeRunner;
}

interface PlaywrightVersionInventory {
  readonly version: string;
  readonly browsers: readonly string[];
}

type JsonReadOutcome = {readonly kind: "ok"; readonly value: UnknownRecord} | {readonly kind: "missing"} | {readonly kind: "error"};

type TextReadOutcome =
  {readonly kind: "ok"; readonly name: string; readonly contents: string} | {readonly kind: "missing"} | {readonly kind: "error"};

interface AdapterImport {
  readonly identifier: string;
  readonly specifier: string;
}

/** Internal marker distinguishing an unavailable/invalid inspection failure from an unexpected error. */
class FrontendInspectionFailure extends Error {
  public readonly kind: "unavailable" | "invalid";
  public readonly publicMessage: string;

  public constructor(kind: "unavailable" | "invalid", publicMessage: string) {
    super(publicMessage);
    this.name = "FrontendInspectionFailure";
    this.kind = kind;
    this.publicMessage = publicMessage;
  }
}

const WORKSPACE_LINKED_PACKAGE = "@arolariu/components";
const CORE_ENVIRONMENT_KEYS = ["SITE_ENV", "SITE_NAME", "SITE_URL", "USE_CDN"] as const;
const AUTHENTICATION_ENVIRONMENT_KEYS = ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"] as const;
const RECOGNIZED_ENVIRONMENT_KEYS: ReadonlySet<string> = new Set([...CORE_ENVIRONMENT_KEYS, ...AUTHENTICATION_ENVIRONMENT_KEYS]);
const ENVIRONMENT_KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/u;
const SVELTE_CONFIG_FILE_NAMES = ["svelte.config.js", "svelte.config.ts"] as const;
const VITE_CONFIG_FILE_NAMES = ["vite.config.ts", "vite.config.js"] as const;
const SITE_ENGINE_PATTERN = /^>=(0|[1-9]\d*)(?:\.(0|[1-9]\d*))?$/u;
const ADAPTER_CALL_PATTERN = /adapter\s*:\s*([A-Za-z_$][\w$]*)\s*\(/u;
const REQUIRED_SCRIPTS = ["prepare", "check", "test", "build"] as const;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasErrorCode(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}

function elapsedMilliseconds(startedAt: number, now: () => number): number {
  const elapsed = now() - startedAt;
  return Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
}

function isSuccessfulCommand(outcome: Readonly<ProcessExecutionResult>): boolean {
  return outcome.kind === "succeeded";
}

function hasTransportFailure(outcome: Readonly<ProcessExecutionResult>): boolean {
  switch (outcome.kind) {
    case "succeeded":
    case "exited":
      return false;
    case "spawn-failed":
    case "timed-out":
    case "signalled":
    case "cancelled":
      return true;
  }
}

async function readJsonRecord(files: InspectionFiles, path: string): Promise<JsonReadOutcome> {
  let contents: string;
  try {
    contents = await files.readText(path);
  } catch (error: unknown) {
    return hasErrorCode(error, "ENOENT") ? {kind: "missing"} : {kind: "error"};
  }
  try {
    const parsed: unknown = JSON.parse(contents);
    return isRecord(parsed) ? {kind: "ok", value: parsed} : {kind: "error"};
  } catch {
    return {kind: "error"};
  }
}

async function readFirstExistingTextFile(
  files: InspectionFiles,
  candidates: readonly Readonly<{name: string; path: string}>[],
): Promise<TextReadOutcome> {
  for (const candidate of candidates) {
    try {
      const contents = await files.readText(candidate.path);
      return {kind: "ok", name: candidate.name, contents};
    } catch (error: unknown) {
      if (hasErrorCode(error, "ENOENT")) {
        continue;
      }
      return {kind: "error"};
    }
  }
  return {kind: "missing"};
}

/**
 * Classifies one website `.env` file's recognized keys without retaining configured values.
 *
 * @param content - Complete `.env` file contents.
 * @returns Syntax errors, recognized present keys, and missing core or authentication keys.
 */
function inspectEnvironmentContent(content: string): EnvironmentFacts {
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

async function readEnvironmentContent(files: InspectionFiles, path: string): Promise<string> {
  try {
    return await files.readText(path);
  } catch (error: unknown) {
    if (hasErrorCode(error, "ENOENT")) {
      return "";
    }
    throw new FrontendInspectionFailure("unavailable", "The website environment file could not be read.");
  }
}

function getDependsOn(targets: UnknownRecord, targetName: string): readonly string[] {
  const target = targets[targetName];
  if (!isRecord(target)) {
    return [];
  }
  const dependsOn = target["dependsOn"];
  return Array.isArray(dependsOn) ? dependsOn.filter((entry): entry is string => typeof entry === "string") : [];
}

async function inspectWorkspaceLink(files: InspectionFiles, paths: RepositoryPaths, packages: PackageInventoryFacts): Promise<readonly string[]> {
  const issues: string[] = [];

  const packageJsonOutcome = await readJsonRecord(files, resolve(paths.websiteRoot, "package.json"));
  if (packageJsonOutcome.kind !== "ok") {
    issues.push("sites/arolariu.ro/package.json could not be read or parsed.");
  } else {
    const dependencies = isRecord(packageJsonOutcome.value["dependencies"]) ? packageJsonOutcome.value["dependencies"] : {};
    if (!Object.hasOwn(dependencies, WORKSPACE_LINKED_PACKAGE)) {
      issues.push("sites/arolariu.ro/package.json does not declare a dependency on @arolariu/components.");
    }
  }

  const projectJsonOutcome = await readJsonRecord(files, resolve(paths.websiteRoot, "project.json"));
  if (projectJsonOutcome.kind !== "ok") {
    issues.push("sites/arolariu.ro/project.json could not be read or parsed.");
  } else {
    const targets = isRecord(projectJsonOutcome.value["targets"]) ? projectJsonOutcome.value["targets"] : {};
    if (!getDependsOn(targets, "build").includes("components:build")) {
      issues.push("sites/arolariu.ro/project.json build target does not depend on components:build.");
    }
    if (!getDependsOn(targets, "dev").includes("components:build")) {
      issues.push("sites/arolariu.ro/project.json dev target does not depend on components:build.");
    }
  }

  const installedComponents = packages.installed[WORKSPACE_LINKED_PACKAGE];
  if (installedComponents === undefined) {
    issues.push("@arolariu/components is not installed.");
  } else if (installedComponents.workspaceRoot === undefined) {
    issues.push("@arolariu/components is not linked to the local workspace package.");
  }

  return issues;
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

async function inspectI18n(files: InspectionFiles, paths: RepositoryPaths): Promise<readonly string[]> {
  const messagesRoot = resolve(paths.websiteRoot, "messages");
  const localePaths = {
    en: resolve(messagesRoot, "en.json"),
    ro: resolve(messagesRoot, "ro.json"),
    fr: resolve(messagesRoot, "fr.json"),
  } as const;

  const parsedLocales = new Map<string, UnknownRecord>();
  const issues: string[] = [];

  for (const [locale, path] of Object.entries(localePaths)) {
    const outcome = await readJsonRecord(files, path);
    if (outcome.kind === "ok") {
      parsedLocales.set(locale, outcome.value);
    } else if (outcome.kind === "missing") {
      issues.push(`${locale}.json was not found.`);
    } else {
      issues.push(`Unable to read or parse ${locale}.json.`);
    }
  }

  if (issues.length === 0) {
    const enMessages = parsedLocales.get("en")!;
    const enKeys = extractMessageKeySet(enMessages);
    for (const locale of ["ro", "fr"] as const) {
      const localeMessages = parsedLocales.get(locale)!;
      const localeKeys = extractMessageKeySet(localeMessages);
      const missing = [...enKeys].filter((key) => !localeKeys.has(key));
      const extra = [...localeKeys].filter((key) => !enKeys.has(key));
      if (missing.length > 0) {
        issues.push(`${locale}.json is missing ${String(missing.length)} key(s) present in en.json, e.g. '${missing[0]}'.`);
      }
      if (extra.length > 0) {
        issues.push(`${locale}.json declares ${String(extra.length)} key(s) not present in en.json, e.g. '${extra[0]}'.`);
      }
    }
  }

  if (issues.length > 0) {
    return issues;
  }

  const enKeys = extractMessageKeySet(parsedLocales.get("en")!);
  const declarationPath = resolve(messagesRoot, "en.d.json.ts");
  try {
    const declarationSource = await files.readText(declarationPath);
    const declaredObject = extractDeclaredMessagesObject(declarationSource);
    if (declaredObject === null) {
      issues.push("messages/en.d.json.ts could not be parsed as a generated declaration object.");
    } else {
      const declaredKeys = extractMessageKeySet(declaredObject);
      const missing = [...enKeys].filter((key) => !declaredKeys.has(key));
      const extra = [...declaredKeys].filter((key) => !enKeys.has(key));
      if (missing.length > 0 || extra.length > 0) {
        issues.push("messages/en.d.json.ts key shape does not match messages/en.json.");
      }
    }
  } catch {
    issues.push("messages/en.d.json.ts was not found.");
  }

  return issues;
}

function isValidTaxonomyMetadata(value: UnknownRecord): boolean {
  const {system, version, sourceUrl, attribution, generatedAt} = value;
  return (
    typeof system === "string"
    && system.trim() !== ""
    && typeof version === "string"
    && version.trim() !== ""
    && typeof sourceUrl === "string"
    && sourceUrl.trim() !== ""
    && typeof attribution === "string"
    && attribution.trim() !== ""
    && typeof generatedAt === "string"
    && !Number.isNaN(Date.parse(generatedAt))
  );
}

function isValidLicenseEntry(entry: unknown): boolean {
  return (
    isRecord(entry)
    && typeof entry["name"] === "string"
    && entry["name"].trim() !== ""
    && typeof entry["license"] === "string"
    && entry["license"].trim() !== ""
    && typeof entry["version"] === "string"
    && entry["version"].trim() !== ""
  );
}

async function inspectArtifacts(files: InspectionFiles, paths: RepositoryPaths): Promise<readonly string[]> {
  const issues: string[] = [];
  const websiteTaxonomyDirectory = resolve(paths.websiteRoot, "src", "data", "taxonomies");
  const taxonomyPaths = getExpectedTaxonomyArtifactPaths(paths.root).filter((path) => resolve(path, "..") === websiteTaxonomyDirectory);

  for (const path of taxonomyPaths) {
    const name = basename(path);
    const outcome = await readJsonRecord(files, path);
    if (outcome.kind === "missing") {
      issues.push(`${name} is missing.`);
    } else if (outcome.kind === "error") {
      issues.push(`${name} could not be read or parsed.`);
    } else if (!isValidTaxonomyMetadata(outcome.value)) {
      issues.push(`${name} has missing or invalid required taxonomy metadata.`);
    }
  }

  for (const fileName of ["en.json", "ro.json", "fr.json"] as const) {
    try {
      await files.readText(resolve(paths.websiteRoot, "messages", fileName));
    } catch (error: unknown) {
      issues.push(hasErrorCode(error, "ENOENT") ? `messages/${fileName} is missing.` : `messages/${fileName} could not be read.`);
    }
  }

  const licensesOutcome = await readJsonRecord(files, resolve(paths.websiteRoot, "licenses.json"));
  if (licensesOutcome.kind === "missing") {
    issues.push("licenses.json is missing.");
  } else if (licensesOutcome.kind === "error") {
    issues.push("licenses.json could not be read or parsed.");
  } else {
    const productionEntries = licensesOutcome.value["production"];
    if (!Array.isArray(productionEntries) || productionEntries.length === 0) {
      issues.push("licenses.json production entries are missing or empty.");
    } else if (!productionEntries.every(isValidLicenseEntry)) {
      issues.push("licenses.json contains malformed license entries.");
    }
  }

  return issues;
}

function parsePlaywrightInstallList(stdout: string): readonly PlaywrightVersionInventory[] {
  const inventories: PlaywrightVersionInventory[] = [];
  for (const block of stdout
    .split(/\r?\n\r?\n/u)
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "")) {
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

async function inspectPlaywright(
  probeRunner: InspectionProbeRunner,
  root: string,
  installedVersion: string | undefined,
): Promise<Readonly<{version?: string; browsers: readonly string[]}>> {
  const result = await probeRunner.run(probes.frontend.playwrightInventory(), {cwd: root});
  if (hasTransportFailure(result)) {
    throw new FrontendInspectionFailure("unavailable", "The Playwright browser inventory could not be read.");
  }
  if (!isSuccessfulCommand(result) && result.stdout.trim() === "") {
    throw new FrontendInspectionFailure("unavailable", "The Playwright browser inventory could not be read.");
  }

  const inventories = parsePlaywrightInstallList(result.stdout);
  if (inventories.length === 0) {
    return {browsers: []};
  }
  if (inventories.length === 1) {
    const [only] = inventories;
    return {version: only!.version, browsers: only!.browsers};
  }

  const matching = installedVersion === undefined ? undefined : inventories.find((entry) => entry.version === installedVersion);
  if (matching === undefined) {
    throw new FrontendInspectionFailure("invalid", "The Playwright browser inventory reported multiple ambiguous versions.");
  }
  return {version: matching.version, browsers: matching.browsers};
}

async function inspectFrameworkConfig(files: InspectionFiles, paths: RepositoryPaths): Promise<readonly string[]> {
  const issues: string[] = [];

  try {
    const source = await files.readText(resolve(paths.websiteRoot, "next.config.ts"));
    if (!/createNextIntlPlugin\s*\(/u.test(source)) {
      issues.push("next.config.ts does not call createNextIntlPlugin.");
    } else if (!/createMessagesDeclaration:\s*["']\.\/messages\/en\.json["']/u.test(source)) {
      issues.push("next.config.ts does not declare createMessagesDeclaration for ./messages/en.json.");
    } else if (!/export default/u.test(source)) {
      issues.push("next.config.ts does not export a default configuration.");
    }
  } catch {
    issues.push("next.config.ts could not be read.");
  }

  try {
    const source = await files.readText(resolve(paths.docsRoot, "docusaurus.config.ts"));
    if (!/@docusaurus\/preset-classic/u.test(source)) {
      issues.push("docusaurus.config.ts does not reference @docusaurus/preset-classic.");
    } else if (!/export default/u.test(source)) {
      issues.push("docusaurus.config.ts does not export a default configuration.");
    }
  } catch {
    issues.push("docusaurus.config.ts could not be read.");
  }

  return issues;
}

/**
 * Creates one read-only provider for shared React and website inspection facts.
 *
 * @param input - Canonical repository paths, shared package inventory, opaque probe runner, and the
 * read-only filesystem, clock, and task-scheduler capabilities.
 * @returns An inspection provider with explicit unavailable/invalid outcomes at package, environment, and probe boundaries.
 */
export function createReactProvider(input: FrontendProviderInput): InspectionProvider<ReactFacts> {
  const now = (): number => input.clock.monotonicNow();
  const {files} = input;

  return async (): Promise<InspectionOutcome<ReactFacts>> => {
    const startedAt = now();
    try {
      const packagesOutcome = await input.packages();
      if (packagesOutcome.kind === "unavailable") {
        return {kind: "unavailable", reason: packagesOutcome.reason, durationMs: elapsedMilliseconds(startedAt, now)};
      }
      if (packagesOutcome.kind === "invalid") {
        return {kind: "invalid", issues: packagesOutcome.issues, durationMs: elapsedMilliseconds(startedAt, now)};
      }
      const packages = packagesOutcome.value;

      let workspaceLinkIssues: readonly string[] | undefined;
      let envContent: string | undefined;
      let i18nIssues: readonly string[] | undefined;
      let artifactIssues: readonly string[] | undefined;
      let frameworkIssues: readonly string[] | undefined;

      // Every repository read below starts concurrently, exactly as the previous `Promise.all` did;
      // each task assigns its own binding so the heterogeneous results keep their exact types.
      await input.tasks.parallel<void>([
        async () => {
          workspaceLinkIssues = await inspectWorkspaceLink(files, input.paths, packages);
        },
        async () => {
          envContent = await readEnvironmentContent(files, input.paths.websiteEnvironment);
        },
        async () => {
          i18nIssues = await inspectI18n(files, input.paths);
        },
        async () => {
          artifactIssues = await inspectArtifacts(files, input.paths);
        },
        async () => {
          frameworkIssues = await inspectFrameworkConfig(files, input.paths);
        },
      ]);

      if (
        workspaceLinkIssues === undefined
        || envContent === undefined
        || i18nIssues === undefined
        || artifactIssues === undefined
        || frameworkIssues === undefined
      ) {
        throw new FrontendInspectionFailure("unavailable", "The React inspection did not resolve every repository fact.");
      }

      const playwright = await inspectPlaywright(input.probes, input.paths.root, packages.installed["playwright"]?.version);

      const value: ReactFacts = {
        packages,
        workspaceLinkIssues,
        environment: inspectEnvironmentContent(envContent),
        i18nIssues,
        artifactIssues,
        playwright,
        frameworkIssues,
      };
      return {kind: "available", value, durationMs: elapsedMilliseconds(startedAt, now)};
    } catch (error: unknown) {
      if (error instanceof FrontendInspectionFailure) {
        return error.kind === "invalid"
          ? {kind: "invalid", issues: [error.publicMessage], durationMs: elapsedMilliseconds(startedAt, now)}
          : {kind: "unavailable", reason: error.publicMessage, durationMs: elapsedMilliseconds(startedAt, now)};
      }
      throw error;
    }
  };
}

function expandScriptIntent(scripts: UnknownRecord, name: string, depth = 0, visited: Set<string> = new Set()): string {
  if (depth > 6 || visited.has(name)) {
    return "";
  }
  visited.add(name);
  const value = scripts[name];
  if (typeof value !== "string") {
    return "";
  }
  return value.replaceAll(/npm run ([\w:-]+)/gu, (whole: string, dependencyName: string) => {
    const expanded = expandScriptIntent(scripts, dependencyName, depth + 1, visited);
    return expanded === "" ? whole : `${whole} (${expanded})`;
  });
}

function getTargetOptions(targets: UnknownRecord, targetName: string): UnknownRecord | null {
  const target = targets[targetName];
  if (!isRecord(target)) {
    return null;
  }
  const options = target["options"];
  return isRecord(options) ? options : null;
}

function extractAdapterImport(source: string): AdapterImport | null {
  const adapterMatch = ADAPTER_CALL_PATTERN.exec(source);
  const identifier = adapterMatch?.[1];
  if (identifier === undefined) {
    return null;
  }
  const importPattern = new RegExp(`import\\s+${identifier}\\s+from\\s+["']([^"']+)["']`, "u");
  const importMatch = importPattern.exec(source);
  const specifier = importMatch?.[1];
  if (specifier === undefined) {
    return null;
  }
  return {identifier, specifier};
}

async function inspectSvelteScripts(
  files: InspectionFiles,
  root: string,
  siteRelativeRoot: string,
  packageJsonOutcome: JsonReadOutcome,
): Promise<readonly string[]> {
  const issues: string[] = [];

  if (packageJsonOutcome.kind !== "ok") {
    issues.push("package.json could not be read or parsed.");
  } else {
    const scripts = packageJsonOutcome.value["scripts"];
    if (!isRecord(scripts)) {
      issues.push("package.json#scripts must be an object.");
    } else {
      for (const scriptName of REQUIRED_SCRIPTS) {
        if (typeof scripts[scriptName] !== "string") {
          issues.push(`package.json#scripts.${scriptName} is missing or not a string.`);
        }
      }
      if (typeof scripts["prepare"] === "string" && !/svelte-kit sync/u.test(expandScriptIntent(scripts, "prepare"))) {
        issues.push("package.json#scripts.prepare does not run svelte-kit sync.");
      }
      if (typeof scripts["check"] === "string") {
        const expandedCheck = expandScriptIntent(scripts, "check");
        if (!/svelte-kit sync/u.test(expandedCheck)) {
          issues.push("package.json#scripts.check does not run svelte-kit sync.");
        }
        if (!/svelte-check/u.test(expandedCheck)) {
          issues.push("package.json#scripts.check does not run svelte-check.");
        }
      }
      if (typeof scripts["test"] === "string" && !/vitest/u.test(expandScriptIntent(scripts, "test"))) {
        issues.push("package.json#scripts.test does not resolve to a vitest invocation.");
      }
      if (typeof scripts["build"] === "string" && !/vite build/u.test(expandScriptIntent(scripts, "build"))) {
        issues.push("package.json#scripts.build does not run vite build.");
      }
    }
  }

  const projectJsonOutcome = await readJsonRecord(files, resolve(root, "project.json"));
  if (projectJsonOutcome.kind !== "ok") {
    issues.push("project.json could not be read or parsed.");
  } else {
    const targets = projectJsonOutcome.value["targets"];
    if (!isRecord(targets)) {
      issues.push("project.json#targets must be an object.");
    } else {
      for (const targetName of REQUIRED_SCRIPTS) {
        const options = getTargetOptions(targets, targetName);
        if (options === null) {
          issues.push(`project.json#targets.${targetName} is missing or malformed.`);
          continue;
        }
        if (options["command"] !== `npm run ${targetName}`) {
          issues.push(`project.json#targets.${targetName}.options.command must be 'npm run ${targetName}'.`);
        }
        if (options["cwd"] !== siteRelativeRoot) {
          issues.push(`project.json#targets.${targetName}.options.cwd must be '${siteRelativeRoot}'.`);
        }
      }
    }
  }

  const viteConfigOutcome = await readFirstExistingTextFile(files, VITE_CONFIG_FILE_NAMES.map((name) => ({name, path: resolve(root, name)})));
  if (viteConfigOutcome.kind === "missing") {
    issues.push("vite.config was not found.");
  } else if (viteConfigOutcome.kind === "error") {
    issues.push("vite.config could not be read.");
  } else if (!/sveltekit\s*\(/u.test(viteConfigOutcome.contents) || !/defineConfig/u.test(viteConfigOutcome.contents)) {
    issues.push(`${viteConfigOutcome.name} does not wire the SvelteKit Vite plugin (sveltekit()) within defineConfig.`);
  }

  return issues;
}

async function inspectGeneratedConfigExists(files: InspectionFiles, root: string): Promise<boolean> {
  try {
    const info = await files.inspect(resolve(root, ".svelte-kit", "tsconfig.json"));
    return info.kind === "file";
  } catch {
    return false;
  }
}

/**
 * Creates one read-only provider for shared SvelteKit inspection facts for one standalone project.
 *
 * @param id - Standalone project identity (`"cv"` or `"status"`).
 * @param input - Canonical repository paths, shared package inventory, opaque probe runner, and the
 * read-only filesystem, clock, and task-scheduler capabilities.
 * @returns An inspection provider with explicit unavailable/invalid outcomes at the package-inventory boundary.
 */
export function createSvelteProvider(id: SvelteProjectId, input: FrontendProviderInput): InspectionProvider<SvelteFacts> {
  const root = id === "cv" ? input.paths.cvRoot : input.paths.statusRoot;
  const now = (): number => input.clock.monotonicNow();
  const {files} = input;

  return async (): Promise<InspectionOutcome<SvelteFacts>> => {
    const startedAt = now();
    try {
      const packagesOutcome = await input.packages();
      if (packagesOutcome.kind === "unavailable") {
        return {kind: "unavailable", reason: packagesOutcome.reason, durationMs: elapsedMilliseconds(startedAt, now)};
      }
      if (packagesOutcome.kind === "invalid") {
        return {kind: "invalid", issues: packagesOutcome.issues, durationMs: elapsedMilliseconds(startedAt, now)};
      }
      const packages = packagesOutcome.value;

      const packageJsonOutcome = await readJsonRecord(files, resolve(root, "package.json"));
      const packageIssues: string[] = [];
      let nodeEngine: string | undefined;

      if (packageJsonOutcome.kind !== "ok") {
        packageIssues.push("package.json could not be read or parsed.");
      } else {
        const engines = packageJsonOutcome.value["engines"];
        const node = isRecord(engines) ? engines["node"] : undefined;
        if (typeof node !== "string" || !SITE_ENGINE_PATTERN.test(node)) {
          packageIssues.push("package.json#engines.node is missing or uses an unsupported range.");
        } else {
          nodeEngine = node;
        }
      }

      const svelteConfigOutcome = await readFirstExistingTextFile(
        files,
        SVELTE_CONFIG_FILE_NAMES.map((name) => ({name, path: resolve(root, name)})),
      );
      const adapterIssues: string[] = [];
      let adapterSpecifier: string | undefined;

      if (svelteConfigOutcome.kind === "missing") {
        adapterIssues.push("svelte.config was not found.");
      } else if (svelteConfigOutcome.kind === "error") {
        adapterIssues.push("svelte.config could not be read.");
      } else {
        const adapterImport = extractAdapterImport(svelteConfigOutcome.contents);
        if (adapterImport === null) {
          adapterIssues.push("svelte.config does not configure a recognizable kit.adapter.");
        } else {
          adapterSpecifier = adapterImport.specifier;
          const declaredNames = new Set<string>();
          if (packageJsonOutcome.kind === "ok") {
            for (const field of ["dependencies", "devDependencies"] as const) {
              const value = packageJsonOutcome.value[field];
              if (isRecord(value)) {
                for (const name of Object.keys(value)) {
                  declaredNames.add(name);
                }
              }
            }
          }
          if (!declaredNames.has(adapterSpecifier)) {
            adapterIssues.push(`${adapterSpecifier} is not declared as a dependency in package.json.`);
          }
          if (packages.installed[adapterSpecifier] === undefined) {
            adapterIssues.push(`${adapterSpecifier} is not installed.`);
          }
        }
      }

      for (const name of SVELTE_INSPECTED_PACKAGE_NAMES) {
        if (name === adapterSpecifier) {
          continue;
        }
        if (packages.installed[name] === undefined) {
          packageIssues.push(`${name} is not installed.`);
        }
      }

      const siteRelativeRoot = relative(input.paths.root, root).replaceAll("\\", "/");
      let scriptIssues: readonly string[] | undefined;
      let generatedConfigExists: boolean | undefined;

      // Both observations start concurrently, exactly as the previous `Promise.all` did; each task
      // assigns its own binding so the heterogeneous results keep their exact types.
      await input.tasks.parallel<void>([
        async () => {
          scriptIssues = await inspectSvelteScripts(files, root, siteRelativeRoot, packageJsonOutcome);
        },
        async () => {
          generatedConfigExists = await inspectGeneratedConfigExists(files, root);
        },
      ]);

      if (scriptIssues === undefined || generatedConfigExists === undefined) {
        throw new FrontendInspectionFailure("unavailable", "The Svelte inspection did not resolve every repository fact.");
      }

      const value: SvelteFacts = {
        id,
        packageIssues,
        ...(nodeEngine === undefined ? {} : {nodeEngine}),
        scriptIssues,
        generatedConfigExists,
        ...(adapterSpecifier === undefined ? {} : {adapterSpecifier}),
        adapterIssues,
      };
      return {kind: "available", value, durationMs: elapsedMilliseconds(startedAt, now)};
    } catch (error: unknown) {
      if (error instanceof FrontendInspectionFailure) {
        return error.kind === "invalid"
          ? {kind: "invalid", issues: [error.publicMessage], durationMs: elapsedMilliseconds(startedAt, now)}
          : {kind: "unavailable", reason: error.publicMessage, durationMs: elapsedMilliseconds(startedAt, now)};
      }
      throw error;
    }
  };
}
