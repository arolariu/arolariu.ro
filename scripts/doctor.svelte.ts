/**
 * @fileoverview Read-only SvelteKit diagnostics for the standalone CV and status sites.
 * @module scripts.doctor.svelte
 */

import {readFile, stat} from "node:fs/promises";
import {relative, resolve} from "node:path";

import {
  diagnosticResult,
  skippedDiagnostic,
  type DiagnosticFix,
  type DiagnosticPotentialCause,
  type DiagnosticResult,
  type DoctorContext,
  type DiagnosticModule,
} from "./doctor.types.ts";
import {satisfiesMinimum, type MinimumVersion} from "./common/requirements.ts";

type UnknownRecord = Readonly<Record<string, unknown>>;

/** Identity of one standalone SvelteKit project inspected by this module. */
export type SvelteProjectId = "cv" | "status";

/** One standalone SvelteKit project targeted by a diagnostic sweep. */
export interface SvelteProject {
  readonly id: SvelteProjectId;
  readonly root: string;
}

interface JsonReadFailure {
  readonly kind: "error";
  readonly detail: string;
}

interface JsonReadSuccess {
  readonly kind: "ok";
  readonly value: UnknownRecord;
}

type JsonReadOutcome = JsonReadSuccess | JsonReadFailure;

interface TextReadSuccess {
  readonly kind: "ok";
  readonly path: string;
  readonly contents: string;
}

interface TextReadFailure {
  readonly kind: "error";
  readonly detail: string;
}

type TextReadOutcome = TextReadSuccess | TextReadFailure;

type PackageVersionOutcome =
  | {readonly kind: "ok"; readonly version: string}
  | {readonly kind: "missing"}
  | {readonly kind: "malformed"; readonly detail: string};

interface AdapterImport {
  readonly identifier: string;
  readonly specifier: string;
}

const REQUIRED_CORE_PACKAGES = ["svelte", "@sveltejs/kit", "vite", "typescript", "vitest"] as const;
const REQUIRED_SCRIPTS = ["prepare", "check", "test", "build"] as const;
const SVELTE_CONFIG_FILE_NAMES = ["svelte.config.js", "svelte.config.ts"] as const;
const VITE_CONFIG_FILE_NAMES = ["vite.config.ts", "vite.config.js"] as const;
const SITE_ENGINE_PATTERN = /^>=(0|[1-9]\d*)(?:\.(0|[1-9]\d*))?$/u;
const ADAPTER_CALL_PATTERN = /adapter\s*:\s*([A-Za-z_$][\w$]*)\s*\(/u;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function hasErrorCode(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}

async function readJsonRecord(path: string): Promise<JsonReadOutcome> {
  let contents: string;
  try {
    contents = await readFile(path, "utf8");
  } catch (error: unknown) {
    if (hasErrorCode(error, "ENOENT")) {
      return {kind: "error", detail: `${path} does not exist.`};
    }
    return {kind: "error", detail: `Unable to read ${path}: ${errorMessage(error)}`};
  }

  try {
    const parsed: unknown = JSON.parse(contents);
    if (!isRecord(parsed)) {
      return {kind: "error", detail: `${path} must contain a JSON object.`};
    }
    return {kind: "ok", value: parsed};
  } catch (error: unknown) {
    return {kind: "error", detail: `Unable to parse ${path}: ${errorMessage(error)}`};
  }
}

async function readFirstExistingTextFile(paths: readonly string[]): Promise<TextReadOutcome> {
  for (const path of paths) {
    try {
      const contents = await readFile(path, "utf8");
      return {kind: "ok", path, contents};
    } catch (error: unknown) {
      if (hasErrorCode(error, "ENOENT")) {
        continue;
      }
      return {kind: "error", detail: `Unable to read ${path}: ${errorMessage(error)}`};
    }
  }
  return {kind: "error", detail: `None of the expected files exist: ${paths.join(", ")}.`};
}

async function resolvePackageVersion(searchRoots: readonly string[], packageName: string): Promise<PackageVersionOutcome> {
  for (const root of searchRoots) {
    const packageJsonPath = resolve(root, "node_modules", ...packageName.split("/"), "package.json");
    let contents: string;
    try {
      contents = await readFile(packageJsonPath, "utf8");
    } catch (error: unknown) {
      if (hasErrorCode(error, "ENOENT")) {
        continue;
      }
      return {kind: "malformed", detail: `Unable to read ${packageJsonPath}: ${errorMessage(error)}`};
    }

    try {
      const parsed: unknown = JSON.parse(contents);
      if (!isRecord(parsed)) {
        return {kind: "malformed", detail: `${packageJsonPath} must contain a JSON object.`};
      }
      const version = parsed["version"];
      if (typeof version !== "string" || version.trim() === "") {
        return {kind: "malformed", detail: `${packageJsonPath}#version must be a non-empty string.`};
      }
      return {kind: "ok", version};
    } catch (error: unknown) {
      return {kind: "malformed", detail: `Unable to parse ${packageJsonPath}: ${errorMessage(error)}`};
    }
  }
  return {kind: "missing"};
}

function resolveLockedVersion(
  lockPackages: UnknownRecord,
  siteRelativeRoot: string,
  packageName: string,
): PackageVersionOutcome {
  const candidateKeys = [`${siteRelativeRoot}/node_modules/${packageName}`, `node_modules/${packageName}`];
  for (const key of candidateKeys) {
    const entry = lockPackages[key];
    if (entry === undefined) {
      continue;
    }
    if (!isRecord(entry)) {
      return {kind: "malformed", detail: `package-lock.json#packages['${key}'] must be an object.`};
    }
    const version = entry["version"];
    if (typeof version !== "string" || version.trim() === "") {
      return {kind: "malformed", detail: `package-lock.json#packages['${key}'].version must be a non-empty string.`};
    }
    return {kind: "ok", version};
  }
  return {kind: "missing"};
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

function siteRelativeRootOf(context: Readonly<DoctorContext>, project: Readonly<SvelteProject>): string {
  return relative(context.paths.root, project.root).replaceAll("\\", "/");
}

function svelteConfigCandidatePaths(root: string): readonly string[] {
  return SVELTE_CONFIG_FILE_NAMES.map((name) => resolve(root, name));
}

function viteConfigCandidatePaths(root: string): readonly string[] {
  return VITE_CONFIG_FILE_NAMES.map((name) => resolve(root, name));
}

function diagnostic(
  context: Readonly<DoctorContext>,
  startedAt: number,
  input: Omit<DiagnosticResult, "durationMs" | "module">,
): DiagnosticResult {
  return diagnosticResult({module: "svelte", ...input}, startedAt, context.now);
}

function buildIssueDiagnosis(
  issues: readonly string[],
): Readonly<{rootCause?: string; potentialCauses: readonly DiagnosticPotentialCause[]}> {
  if (issues.length === 1) {
    return {rootCause: issues[0], potentialCauses: []};
  }
  return {potentialCauses: issues.map((cause) => ({cause, confidence: "high" as const}))};
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

async function diagnosePackages(context: Readonly<DoctorContext>, project: Readonly<SvelteProject>): Promise<DiagnosticResult> {
  const id = `svelte.${project.id}.packages`;
  const startedAt = context.now();

  const packageJsonOutcome = await readJsonRecord(resolve(project.root, "package.json"));
  const svelteConfigOutcome = await readFirstExistingTextFile(svelteConfigCandidatePaths(project.root));
  const lockOutcome = await readJsonRecord(context.paths.packageLock);

  const issues: string[] = [];

  if (packageJsonOutcome.kind !== "ok") {
    issues.push(packageJsonOutcome.detail);
  }

  let adapterSpecifier: string | null = null;
  if (svelteConfigOutcome.kind !== "ok") {
    issues.push(`Unable to determine the configured adapter package: ${svelteConfigOutcome.detail}`);
  } else {
    const adapterImport = extractAdapterImport(svelteConfigOutcome.contents);
    if (adapterImport === null) {
      issues.push(`Unable to determine the configured adapter package from ${svelteConfigOutcome.path}.`);
    } else {
      adapterSpecifier = adapterImport.specifier;
    }
  }

  if (lockOutcome.kind !== "ok") {
    issues.push(lockOutcome.detail);
  }

  const lockPackagesField = lockOutcome.kind === "ok" ? lockOutcome.value["packages"] : undefined;
  if (lockOutcome.kind === "ok" && !isRecord(lockPackagesField)) {
    issues.push("package-lock.json#packages must be an object.");
  }
  const lockPackages = isRecord(lockPackagesField) ? lockPackagesField : null;

  const okEvidence: string[] = [];
  if (lockPackages !== null) {
    const siteRelativeRoot = siteRelativeRootOf(context, project);
    const packageNames = [...REQUIRED_CORE_PACKAGES, ...(adapterSpecifier === null ? [] : [adapterSpecifier])];
    for (const name of packageNames) {
      const installed = await resolvePackageVersion([project.root, context.paths.root], name);
      const locked = resolveLockedVersion(lockPackages, siteRelativeRoot, name);

      if (installed.kind === "malformed") {
        issues.push(`${name}: malformed installed package metadata (${installed.detail})`);
        continue;
      }
      if (locked.kind === "malformed") {
        issues.push(`${name}: malformed package-lock.json metadata (${locked.detail})`);
        continue;
      }
      if (installed.kind === "missing") {
        issues.push(`${name} is not installed under ${project.root} or ${context.paths.root}.`);
        continue;
      }
      if (locked.kind === "missing") {
        issues.push(`${name} has no package-lock.json entry (missing package).`);
        continue;
      }
      if (installed.version !== locked.version) {
        issues.push(`${name} installed version '${installed.version}' does not match locked version '${locked.version}' (version drift).`);
        continue;
      }
      okEvidence.push(`${name}@${installed.version} matches the locked requirement.`);
    }
  }

  if (issues.length === 0) {
    return passDiagnostic(
      context,
      startedAt,
      id,
      "SvelteKit ecosystem packages",
      "Installed SvelteKit ecosystem packages match locked requirements.",
      okEvidence,
    );
  }

  return issueDiagnostic(context, startedAt, {
    id,
    name: "SvelteKit ecosystem packages",
    status: "fail",
    summary: `${String(issues.length)} SvelteKit ecosystem package check${issues.length === 1 ? "" : "s"} failed.`,
    evidence: issues,
    ...buildIssueDiagnosis(issues),
    fixes: [{description: "Install the site's dependencies and rerun doctor.", command: "npm install"}],
  });
}

async function diagnoseNodeEngine(context: Readonly<DoctorContext>, project: Readonly<SvelteProject>): Promise<DiagnosticResult> {
  const id = `svelte.${project.id}.node-engine`;
  const startedAt = context.now();

  if (context.requirements.status === "invalid") {
    return skippedDiagnostic({
      id,
      module: "svelte",
      name: "SvelteKit Node.js engine compatibility",
      summary: "Node engine compatibility was skipped because root requirement sources are invalid.",
      evidence: ["Blocked by invalid runtime requirement sources."],
    });
  }

  const packageJsonOutcome = await readJsonRecord(resolve(project.root, "package.json"));
  if (packageJsonOutcome.kind !== "ok") {
    return issueDiagnostic(context, startedAt, {
      id,
      name: "SvelteKit Node.js engine compatibility",
      status: "fail",
      summary: "The site's package.json could not be read to verify Node.js engine compatibility.",
      evidence: [packageJsonOutcome.detail],
      rootCause: packageJsonOutcome.detail,
      fixes: [{description: "Restore a valid package.json declaring engines.node."}],
    });
  }

  const engines = packageJsonOutcome.value["engines"];
  if (!isRecord(engines)) {
    return issueDiagnostic(context, startedAt, {
      id,
      name: "SvelteKit Node.js engine compatibility",
      status: "fail",
      summary: "The site's package.json does not declare a Node.js engine requirement.",
      evidence: ["package.json#engines must be an object."],
      rootCause: "package.json#engines must be an object.",
      fixes: [{description: "Declare package.json#engines.node using a >=<major>[.<minor>] range."}],
    });
  }

  const nodeRange = engines["node"];
  const match = typeof nodeRange === "string" ? SITE_ENGINE_PATTERN.exec(nodeRange) : null;
  if (typeof nodeRange !== "string" || match === null) {
    return issueDiagnostic(context, startedAt, {
      id,
      name: "SvelteKit Node.js engine compatibility",
      status: "fail",
      summary: "The site's package.json#engines.node uses an unsupported or malformed range.",
      evidence: [`package.json#engines.node must be a string matching >=<major>[.<minor>]; received '${String(nodeRange)}'.`],
      rootCause: "package.json#engines.node must be a string matching >=<major>[.<minor>].",
      fixes: [{description: "Correct package.json#engines.node to a >=<major>[.<minor>] range."}],
    });
  }

  const siteMinimum: MinimumVersion = {major: Number(match[1]), minor: Number(match[2] ?? 0), patch: 0};
  const rootMinimum = context.requirements.requirements.node;

  if (!satisfiesMinimum(rootMinimum, siteMinimum)) {
    const rootLabel = `${String(rootMinimum.major)}.${String(rootMinimum.minor)}.${String(rootMinimum.patch)}`;
    return issueDiagnostic(context, startedAt, {
      id,
      name: "SvelteKit Node.js engine compatibility",
      status: "fail",
      summary: "The root Node.js runtime requirement does not satisfy this site's declared engine range.",
      evidence: [`package.json#engines.node requires >=${nodeRange.slice(2)}; root requirement is >=${rootLabel}.`],
      rootCause: `Root Node.js requirement >=${rootLabel} does not satisfy this site's package.json#engines.node requirement >=${nodeRange.slice(2)}.`,
      fixes: [{description: "Align the root and site Node.js engine requirements."}],
    });
  }

  const rootLabel = `${String(rootMinimum.major)}.${String(rootMinimum.minor)}.${String(rootMinimum.patch)}`;
  return passDiagnostic(
    context,
    startedAt,
    id,
    "SvelteKit Node.js engine compatibility",
    "The root Node.js runtime requirement satisfies this site's declared engine range.",
    [`package.json#engines.node >=${nodeRange.slice(2)} is satisfied by the root Node.js requirement >=${rootLabel}.`],
  );
}

function getTargetOptions(targets: UnknownRecord, targetName: string): UnknownRecord | null {
  const target = targets[targetName];
  if (!isRecord(target)) {
    return null;
  }
  const options = target["options"];
  return isRecord(options) ? options : null;
}

async function diagnoseScripts(context: Readonly<DoctorContext>, project: Readonly<SvelteProject>): Promise<DiagnosticResult> {
  const id = `svelte.${project.id}.scripts`;
  const startedAt = context.now();
  const issues: string[] = [];

  const packageJsonOutcome = await readJsonRecord(resolve(project.root, "package.json"));
  if (packageJsonOutcome.kind !== "ok") {
    issues.push(packageJsonOutcome.detail);
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

  const projectJsonOutcome = await readJsonRecord(resolve(project.root, "project.json"));
  if (projectJsonOutcome.kind !== "ok") {
    issues.push(projectJsonOutcome.detail);
  } else {
    const targets = projectJsonOutcome.value["targets"];
    if (!isRecord(targets)) {
      issues.push("project.json#targets must be an object.");
    } else {
      const siteRelativeRoot = siteRelativeRootOf(context, project);
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

  const viteConfigOutcome = await readFirstExistingTextFile(viteConfigCandidatePaths(project.root));
  if (viteConfigOutcome.kind !== "ok") {
    issues.push(viteConfigOutcome.detail);
  } else if (!/sveltekit\s*\(/u.test(viteConfigOutcome.contents) || !/defineConfig/u.test(viteConfigOutcome.contents)) {
    issues.push(`${viteConfigOutcome.path} does not wire the SvelteKit Vite plugin (sveltekit()) within defineConfig.`);
  }

  if (issues.length === 0) {
    return passDiagnostic(
      context,
      startedAt,
      id,
      "SvelteKit lifecycle scripts",
      "Required prepare, check, test, and build scripts are wired correctly.",
      [
        "package.json declares prepare, check, test, and build scripts with the expected intent.",
        "project.json wires matching Nx targets.",
        "vite.config wires the SvelteKit Vite plugin.",
      ],
    );
  }

  return issueDiagnostic(context, startedAt, {
    id,
    name: "SvelteKit lifecycle scripts",
    status: "fail",
    summary: "Required SvelteKit lifecycle scripts are missing, misconfigured, or incorrectly wired.",
    evidence: issues,
    ...buildIssueDiagnosis(issues),
    fixes: [{description: "Restore the required package.json scripts, project.json targets, and Vite plugin wiring."}],
  });
}

async function diagnoseGeneratedState(context: Readonly<DoctorContext>, project: Readonly<SvelteProject>): Promise<DiagnosticResult> {
  const id = `svelte.${project.id}.generated-state`;
  const startedAt = context.now();
  const generatedPath = resolve(project.root, ".svelte-kit", "tsconfig.json");

  let generatedMtimeMs: number;
  try {
    const generatedStat = await stat(generatedPath);
    if (!generatedStat.isFile()) {
      throw Object.assign(new Error(`${generatedPath} is not a file.`), {code: "ENOENT"});
    }
    generatedMtimeMs = generatedStat.mtimeMs;
  } catch (error: unknown) {
    if (hasErrorCode(error, "ENOENT")) {
      return issueDiagnostic(context, startedAt, {
        id,
        name: "SvelteKit generated local state",
        status: "fail",
        summary: "The generated .svelte-kit/tsconfig.json is missing.",
        evidence: [`${generatedPath} does not exist.`],
        rootCause: `${generatedPath} does not exist.`,
        fixes: [{description: "Generate the local SvelteKit types.", command: "npm run setup"}],
      });
    }
    return issueDiagnostic(context, startedAt, {
      id,
      name: "SvelteKit generated local state",
      status: "fail",
      summary: "The generated .svelte-kit/tsconfig.json could not be inspected.",
      evidence: [`Unable to stat ${generatedPath}: ${errorMessage(error)}`],
      rootCause: `Unable to stat ${generatedPath}: ${errorMessage(error)}`,
      fixes: [{description: "Investigate filesystem access to the generated SvelteKit state."}],
    });
  }

  const referencePaths = [
    resolve(project.root, "package.json"),
    context.paths.packageLock,
    ...svelteConfigCandidatePaths(project.root),
    ...viteConfigCandidatePaths(project.root),
  ];

  const evidence: string[] = [];
  const staleAgainst: string[] = [];
  for (const referencePath of referencePaths) {
    let referenceStat;
    try {
      referenceStat = await stat(referencePath);
    } catch (error: unknown) {
      if (hasErrorCode(error, "ENOENT")) {
        continue;
      }
      evidence.push(`Unable to stat ${referencePath}: ${errorMessage(error)}`);
      continue;
    }
    evidence.push(`${referencePath}: ${new Date(referenceStat.mtimeMs).toISOString()}`);
    if (referenceStat.mtimeMs > generatedMtimeMs) {
      staleAgainst.push(referencePath);
    }
  }

  if (staleAgainst.length > 0) {
    const causes = staleAgainst.map((path) => `${path} is newer than the generated .svelte-kit/tsconfig.json.`);
    return issueDiagnostic(context, startedAt, {
      id,
      name: "SvelteKit generated local state",
      status: "warn",
      summary: "The generated .svelte-kit/tsconfig.json may be stale.",
      evidence: [...causes, ...evidence],
      ...buildIssueDiagnosis(causes),
      fixes: [{description: "Regenerate the local SvelteKit types.", command: "npm run setup"}],
    });
  }

  return passDiagnostic(
    context,
    startedAt,
    id,
    "SvelteKit generated local state",
    "The generated .svelte-kit/tsconfig.json is present and not older than its sources.",
    evidence,
  );
}

async function diagnoseAdapter(context: Readonly<DoctorContext>, project: Readonly<SvelteProject>): Promise<DiagnosticResult> {
  const id = `svelte.${project.id}.adapter`;
  const startedAt = context.now();

  const svelteConfigOutcome = await readFirstExistingTextFile(svelteConfigCandidatePaths(project.root));
  if (svelteConfigOutcome.kind !== "ok") {
    return issueDiagnostic(context, startedAt, {
      id,
      name: "SvelteKit adapter configuration",
      status: "fail",
      summary: "The site's svelte.config could not be read.",
      evidence: [svelteConfigOutcome.detail],
      rootCause: svelteConfigOutcome.detail,
      fixes: [{description: "Restore svelte.config.js and configure kit.adapter."}],
    });
  }

  const adapterImport = extractAdapterImport(svelteConfigOutcome.contents);
  if (adapterImport === null) {
    const detail = `${svelteConfigOutcome.path} does not configure kit.adapter with a recognizable imported call expression.`;
    return issueDiagnostic(context, startedAt, {
      id,
      name: "SvelteKit adapter configuration",
      status: "fail",
      summary: "The site's svelte.config does not configure a recognizable kit.adapter.",
      evidence: [detail],
      rootCause: detail,
      fixes: [{description: "Import an adapter and set kit.adapter to its invocation in svelte.config.js."}],
    });
  }

  const packageJsonOutcome = await readJsonRecord(resolve(project.root, "package.json"));
  if (packageJsonOutcome.kind !== "ok") {
    return issueDiagnostic(context, startedAt, {
      id,
      name: "SvelteKit adapter configuration",
      status: "fail",
      summary: "The site's package.json could not be read to verify the adapter declaration.",
      evidence: [packageJsonOutcome.detail],
      rootCause: packageJsonOutcome.detail,
      fixes: [{description: "Restore a valid package.json declaring the adapter package."}],
    });
  }

  const declaredNames = new Set<string>();
  for (const field of ["dependencies", "devDependencies"] as const) {
    const value = packageJsonOutcome.value[field];
    if (isRecord(value)) {
      for (const name of Object.keys(value)) {
        declaredNames.add(name);
      }
    }
  }

  if (!declaredNames.has(adapterImport.specifier)) {
    const detail = `Adapter package '${adapterImport.specifier}' is not declared as a dependency in package.json.`;
    return issueDiagnostic(context, startedAt, {
      id,
      name: "SvelteKit adapter configuration",
      status: "fail",
      summary: "The configured adapter package is not declared in package.json.",
      evidence: [detail],
      rootCause: detail,
      fixes: [{description: `Add '${adapterImport.specifier}' to package.json dependencies.`}],
    });
  }

  const installed = await resolvePackageVersion([project.root, context.paths.root], adapterImport.specifier);
  if (installed.kind !== "ok") {
    const detail =
      installed.kind === "malformed"
        ? `Adapter package '${adapterImport.specifier}' has malformed installed metadata (${installed.detail})`
        : `Adapter package '${adapterImport.specifier}' is not installed under ${project.root} or ${context.paths.root}.`;
    return issueDiagnostic(context, startedAt, {
      id,
      name: "SvelteKit adapter configuration",
      status: "fail",
      summary: "The configured adapter package is not installed.",
      evidence: [detail],
      rootCause: detail,
      fixes: [{description: "Install the site's dependencies and rerun doctor.", command: "npm install"}],
    });
  }

  return passDiagnostic(
    context,
    startedAt,
    id,
    "SvelteKit adapter configuration",
    "svelte.config configures a declared and installed adapter.",
    [
      `svelte.config configures kit.adapter via '${adapterImport.identifier}' imported from '${adapterImport.specifier}' (installed ${installed.version}).`,
    ],
  );
}

/**
 * Runs every stable read-only SvelteKit diagnostic for one standalone project.
 *
 * @param context - Shared doctor execution context.
 * @param project - Identity and root directory of the SvelteKit project to inspect.
 * @returns The five stable diagnostic results for this project, in fixed order.
 */
export async function inspectSvelteProject(
  context: Readonly<DoctorContext>,
  project: Readonly<SvelteProject>,
): Promise<readonly DiagnosticResult[]> {
  return [
    await diagnosePackages(context, project),
    await diagnoseNodeEngine(context, project),
    await diagnoseScripts(context, project),
    await diagnoseGeneratedState(context, project),
    await diagnoseAdapter(context, project),
  ];
}

/** Read-only SvelteKit diagnostic module covering the CV and status sites. */
export const svelteDoctorModule: DiagnosticModule = {
  id: "svelte",
  title: "Svelte",
  async run(context): Promise<readonly DiagnosticResult[]> {
    return [
      ...(await inspectSvelteProject(context, {id: "cv", root: context.paths.cvRoot})),
      ...(await inspectSvelteProject(context, {id: "status", root: context.paths.statusRoot})),
    ];
  },
};
