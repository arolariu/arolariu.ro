/**
 * @fileoverview Read-only Python interpreter, virtual environment, requirements, and PyPI diagnostics.
 * @module scripts.doctor.python
 */

import {readFile} from "node:fs/promises";
import {dirname, resolve} from "node:path";

import type {CommandResult, CommandSpec} from "./common/process.ts";
import {parseVersion, satisfiesMinimum, type MinimumVersion} from "./common/requirements.ts";
import {
  DIAGNOSTIC_DEFAULT_TIMEOUT_MS,
  diagnosticResult,
  skippedDiagnostic,
  type DiagnosticFix,
  type DiagnosticModule,
  type DiagnosticPotentialCause,
  type DiagnosticResult,
  type DoctorContext,
} from "./doctor.types.ts";

// Duplicated verbatim from doctor.types.ts's PYTHON_INTERPRETER_METADATA_SNIPPET. The read-only
// command guard in doctor.readonly.test.ts performs single-file static analysis only and never
// resolves values imported from other modules, so this literal cannot be replaced with the shared
// export. Test coverage in doctor.python.test.ts asserts every command built from this text matches
// the shared constant exactly, which fails the moment either copy drifts from the other.
const PYTHON_METADATA_PROBE_SCRIPT =
  "import json, platform, site, sys; print(json.dumps({'executable': sys.executable, 'version': platform.python_version(), 'prefix': sys.prefix, 'basePrefix': getattr(sys, 'base_prefix', sys.prefix), 'sitePackages': site.getsitepackages()}, separators=(',', ':')))";

// The venv executable path is intentionally a fixed, platform-specific relative literal combined
// with `{cwd: context.paths.expRoot}` at every call site. Node's child_process resolves a relative
// command containing a path separator against the supplied `cwd`, so this is both fully static
// (satisfying the read-only command guard, which cannot resolve a per-checkout absolute path) and
// correct regardless of which checkout is being diagnosed.
const VENV_PYTHON_RELATIVE_COMMAND_WIN32 = ".venv\\Scripts\\python.exe" as const;
const VENV_PYTHON_RELATIVE_COMMAND_POSIX = ".venv/bin/python" as const;

const SYSTEM_PYTHON_METADATA_COMMAND_WIN32 = {
  command: "py",
  args: ["-3.12", "-c", PYTHON_METADATA_PROBE_SCRIPT],
} as const satisfies CommandSpec;
const SYSTEM_PYTHON_METADATA_COMMAND_POSIX = {
  command: "python3.12",
  args: ["-c", PYTHON_METADATA_PROBE_SCRIPT],
} as const satisfies CommandSpec;

const VENV_PYTHON_METADATA_COMMAND_WIN32 = {
  command: VENV_PYTHON_RELATIVE_COMMAND_WIN32,
  args: ["-c", PYTHON_METADATA_PROBE_SCRIPT],
} as const satisfies CommandSpec;
const VENV_PYTHON_METADATA_COMMAND_POSIX = {
  command: VENV_PYTHON_RELATIVE_COMMAND_POSIX,
  args: ["-c", PYTHON_METADATA_PROBE_SCRIPT],
} as const satisfies CommandSpec;

const VENV_PIP_VERSION_COMMAND_WIN32 = {
  command: VENV_PYTHON_RELATIVE_COMMAND_WIN32,
  args: ["-m", "pip", "--version"],
} as const satisfies CommandSpec;
const VENV_PIP_VERSION_COMMAND_POSIX = {
  command: VENV_PYTHON_RELATIVE_COMMAND_POSIX,
  args: ["-m", "pip", "--version"],
} as const satisfies CommandSpec;

const VENV_PIP_LIST_COMMAND_WIN32 = {
  command: VENV_PYTHON_RELATIVE_COMMAND_WIN32,
  args: ["-m", "pip", "list", "--format", "json"],
} as const satisfies CommandSpec;
const VENV_PIP_LIST_COMMAND_POSIX = {
  command: VENV_PYTHON_RELATIVE_COMMAND_POSIX,
  args: ["-m", "pip", "list", "--format", "json"],
} as const satisfies CommandSpec;

const VENV_PIP_CHECK_COMMAND_WIN32 = {
  command: VENV_PYTHON_RELATIVE_COMMAND_WIN32,
  args: ["-m", "pip", "check"],
} as const satisfies CommandSpec;
const VENV_PIP_CHECK_COMMAND_POSIX = {
  command: VENV_PYTHON_RELATIVE_COMMAND_POSIX,
  args: ["-m", "pip", "check"],
} as const satisfies CommandSpec;

const PYPI_PIP_INDEX_URL = new URL("https://pypi.org/pypi/pip/json");
const SETUP_COMMAND_HINT = "npm run setup";

const EXACT_REQUIREMENT_PIN =
  /^([A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?)\s*==\s*([A-Za-z0-9](?:[A-Za-z0-9._!+-]*[A-Za-z0-9])?)$/u;
const REQUIREMENT_INCLUDE_DIRECTIVE = /^(?:-r|--requirement)(?:=|\s+)(.+)$/u;
/** Matches the start of a line that at least looks like a pip package requirement (a name). */
const REQUIREMENT_NAME_LIKE = /^[A-Za-z0-9][A-Za-z0-9._-]*/u;
/** Matches a trailing pip requirements-file line-continuation backslash. */
const LINE_CONTINUATION_SUFFIX = /\\\s*$/u;

/** One normalized exact-pinned Python requirement discovered while parsing a requirements tree. */
export interface ParsedRequirement {
  readonly name: string;
  readonly specifier: string;
  readonly source: string;
}

/**
 * One ordinary pip requirements-file entry (extras, environment markers, non-exact version
 * specifiers, hash/continuation lines, or editable/constraint/index options) that is valid pip
 * syntax but is not exactly comparable against `pip list` output without a full PEP 440 evaluator.
 */
interface UnverifiedRequirementEntry {
  readonly text: string;
  readonly source: string;
  readonly reason: string;
}

/** The result of parsing a requirements tree: exact pins plus recognized-but-unverified entries. */
interface RequirementsTreeDetail {
  readonly exact: readonly ParsedRequirement[];
  readonly unverified: readonly UnverifiedRequirementEntry[];
}

/** Comparison of a parsed requirement tree against distributions reported by `pip list`. */
export interface InstalledDistributionComparison {
  readonly missing: readonly string[];
  readonly mismatched: readonly string[];
}

/** Reports a malformed, cyclical, or duplicated requirements entry discovered while parsing. */
export class RequirementsParseError extends Error {
  /**
   * Creates a requirements-parsing error.
   *
   * @param message - Human-readable parsing failure detail.
   */
  public constructor(message: string) {
    super(message);
    this.name = "RequirementsParseError";
  }
}

interface PythonInterpreterMetadata {
  readonly executable: string;
  readonly version: string;
  readonly prefix: string;
  readonly basePrefix: string;
}

type UnknownRecord = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isSuccessfulCommand(result: Readonly<CommandResult>): boolean {
  return result.code === 0 && !result.timedOut && result.signal === undefined && result.spawnError === undefined;
}

function isMissingExecutable(result: Readonly<CommandResult>): boolean {
  const detail = `${result.spawnError ?? ""}\n${result.stderr}`;
  return result.code === 127
    || /\bENOENT\b|command not found|not recognized as an internal or external command|no such file or directory/iu.test(detail);
}

function isPipUnavailable(result: Readonly<CommandResult>): boolean {
  return isMissingExecutable(result) || /No module named pip/iu.test(`${result.stdout}\n${result.stderr}`);
}

function commandEvidence(result: Readonly<CommandResult>): readonly string[] {
  return [
    ...(result.spawnError === undefined ? [] : [`Unable to start command: ${result.spawnError}`]),
    ...(result.timedOut ? ["Command timed out."] : []),
    ...(result.signal === undefined ? [] : [`Command stopped with signal ${result.signal}.`]),
    ...(result.code === 0 ? [] : [`Command exited with code ${String(result.code)}.`]),
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
      module: "python",
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

function skippedForInvalidRequirements(id: string, name: string): DiagnosticResult {
  return skippedDiagnostic({
    id,
    module: "python",
    name,
    summary: `${name} was skipped because repository requirement sources are invalid.`,
    evidence: ["Blocked by invalid runtime requirement sources."],
  });
}

function skippedForVirtualEnvironment(id: string, name: string): DiagnosticResult {
  return skippedDiagnostic({
    id,
    module: "python",
    name,
    summary: `${name} was skipped because the virtual environment could not be verified.`,
    evidence: ["Blocked by python.virtual-environment."],
  });
}

function parsePythonMetadata(stdout: string): PythonInterpreterMetadata | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout.trim());
  } catch {
    return null;
  }

  if (!isRecord(parsed)) {
    return null;
  }

  const executable = parsed["executable"];
  const version = parsed["version"];
  const prefix = parsed["prefix"];
  const basePrefix = parsed["basePrefix"];
  if (typeof executable !== "string" || typeof version !== "string" || typeof prefix !== "string" || typeof basePrefix !== "string") {
    return null;
  }

  return {executable, version, prefix, basePrefix};
}

function parseInstalledDistributions(stdout: string): readonly Readonly<{name: string; version: string}>[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    return null;
  }

  if (!Array.isArray(parsed)) {
    return null;
  }

  const distributions: Array<Readonly<{name: string; version: string}>> = [];
  for (const entry of parsed) {
    if (!isRecord(entry)) {
      return null;
    }

    const name = entry["name"];
    const version = entry["version"];
    if (typeof name !== "string" || typeof version !== "string") {
      return null;
    }

    distributions.push({name, version});
  }

  return distributions;
}

function normalizeDistributionName(name: string): string {
  return name.toLowerCase().replaceAll(/[-_.]+/gu, "-");
}

function normalizePathForComparison(value: string, isWin32: boolean): string {
  const normalized = isWin32 ? value.replaceAll("/", "\\") : value;
  return isWin32 ? normalized.toLowerCase() : normalized;
}

function pathsEqual(left: string, right: string, isWin32: boolean): boolean {
  return normalizePathForComparison(left, isWin32) === normalizePathForComparison(right, isWin32);
}

function isWithinVenvDirectory(executablePath: string, venvDirectory: string, isWin32: boolean): boolean {
  const normalizedExecutable = normalizePathForComparison(executablePath, isWin32);
  const normalizedDirectory = normalizePathForComparison(venvDirectory, isWin32);
  const separator = isWin32 ? "\\" : "/";
  return normalizedExecutable === normalizedDirectory || normalizedExecutable.startsWith(`${normalizedDirectory}${separator}`);
}

function isVersionCompatible(reportedVersion: string, required: MinimumVersion): boolean {
  const version = parseVersion(reportedVersion);
  return version !== null && satisfiesMinimum(version, required);
}

async function readJsonRecord(path: string): Promise<UnknownRecord | null> {
  let contents: string;
  try {
    contents = await readFile(path, "utf8");
  } catch {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(contents);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function diagnoseRuntime(context: Readonly<DoctorContext>): Promise<DiagnosticResult> {
  if (context.requirements.status === "invalid") {
    return skippedForInvalidRequirements("python.runtime", "System Python runtime");
  }

  const startedAt = context.now();
  const command = context.platform === "win32" ? SYSTEM_PYTHON_METADATA_COMMAND_WIN32 : SYSTEM_PYTHON_METADATA_COMMAND_POSIX;
  const result = await context.runner.run(command, {cwd: context.paths.root});

  if (!isSuccessfulCommand(result)) {
    const missing = isMissingExecutable(result);
    return issueDiagnostic(context, startedAt, {
      id: "python.runtime",
      name: "System Python runtime",
      status: "fail",
      summary: missing
        ? "No compatible system Python interpreter was found."
        : "The system Python interpreter probe failed.",
      evidence: commandEvidence(result),
      potentialCauses: [
        {cause: "Python is not installed or is older than the repository minimum.", confidence: missing ? "high" : "medium"},
        {cause: "PATH does not include a compatible Python launcher.", confidence: "medium"},
      ],
      fixes: [{description: "Install a Python interpreter meeting the repository minimum and ensure it is on PATH, then rerun doctor."}],
    });
  }

  const metadata = parsePythonMetadata(result.stdout);
  if (metadata === null) {
    return issueDiagnostic(context, startedAt, {
      id: "python.runtime",
      name: "System Python runtime",
      status: "fail",
      summary: "The system Python interpreter returned malformed metadata.",
      evidence: [`stdout: ${result.stdout.trim()}`],
      rootCause: "The Python metadata probe output could not be parsed as the expected JSON shape.",
      fixes: [{description: "Run the metadata probe manually and inspect its output, then rerun doctor."}],
    });
  }

  if (!isVersionCompatible(metadata.version, context.requirements.requirements.python)) {
    return issueDiagnostic(context, startedAt, {
      id: "python.runtime",
      name: "System Python runtime",
      status: "fail",
      summary: "The system Python interpreter does not satisfy the repository minimum version.",
      evidence: [`Reported version: ${metadata.version}`, `Executable: ${metadata.executable}`],
      rootCause: "The system interpreter version is older than the repository minimum.",
      fixes: [{description: "Install a Python interpreter meeting the repository minimum, then rerun doctor."}],
    });
  }

  return passDiagnostic(
    context,
    startedAt,
    "python.runtime",
    "System Python runtime",
    "A compatible system Python interpreter is available.",
    [`Version: ${metadata.version}`, `Executable: ${metadata.executable}`],
  );
}

async function diagnoseVirtualEnvironment(context: Readonly<DoctorContext>): Promise<DiagnosticResult> {
  if (context.requirements.status === "invalid") {
    return skippedForInvalidRequirements("python.virtual-environment", "Virtual environment");
  }

  const startedAt = context.now();
  const isWin32 = context.platform === "win32";
  const command = isWin32 ? VENV_PYTHON_METADATA_COMMAND_WIN32 : VENV_PYTHON_METADATA_COMMAND_POSIX;
  const result = await context.runner.run(command, {cwd: context.paths.expRoot});

  if (!isSuccessfulCommand(result)) {
    const missing = isMissingExecutable(result);
    return issueDiagnostic(context, startedAt, {
      id: "python.virtual-environment",
      name: "Virtual environment",
      status: "fail",
      summary: missing
        ? "The exp.arolariu.ro virtual environment was not found."
        : "The virtual environment interpreter failed to execute.",
      evidence: commandEvidence(result),
      potentialCauses: missing
        ? [{cause: "The isolated virtual environment has not been created yet.", confidence: "high"}]
        : [{cause: "The virtual environment interpreter is corrupted or blocked.", confidence: "medium"}],
      fixes: [{description: "Create the isolated exp.arolariu.ro virtual environment, then rerun doctor.", command: SETUP_COMMAND_HINT}],
    });
  }

  const metadata = parsePythonMetadata(result.stdout);
  if (metadata === null) {
    return issueDiagnostic(context, startedAt, {
      id: "python.virtual-environment",
      name: "Virtual environment",
      status: "fail",
      summary: "The virtual environment interpreter returned malformed metadata.",
      evidence: [`stdout: ${result.stdout.trim()}`],
      rootCause: "The Python metadata probe output could not be parsed as the expected JSON shape.",
      fixes: [{description: "Recreate the isolated exp.arolariu.ro virtual environment, then rerun doctor.", command: SETUP_COMMAND_HINT}],
    });
  }

  if (!isVersionCompatible(metadata.version, context.requirements.requirements.python)) {
    return issueDiagnostic(context, startedAt, {
      id: "python.virtual-environment",
      name: "Virtual environment",
      status: "fail",
      summary: "The virtual environment Python version does not satisfy the repository minimum.",
      evidence: [`Reported version: ${metadata.version}`, `Executable: ${metadata.executable}`],
      rootCause: "The virtual environment interpreter is older than the repository minimum.",
      fixes: [{
        description: "Recreate the isolated exp.arolariu.ro virtual environment with a compatible interpreter, then rerun doctor.",
        command: SETUP_COMMAND_HINT,
      }],
    });
  }

  const expectedVenvDirectory = isWin32 ? `${context.paths.expRoot}\\.venv` : `${context.paths.expRoot}/.venv`;
  if (!isWithinVenvDirectory(metadata.executable, expectedVenvDirectory, isWin32)) {
    return issueDiagnostic(context, startedAt, {
      id: "python.virtual-environment",
      name: "Virtual environment",
      status: "fail",
      summary: "The virtual environment interpreter is not owned by the canonical exp.arolariu.ro virtual environment.",
      evidence: [`Executable: ${metadata.executable}`, `Expected directory: ${expectedVenvDirectory}`],
      rootCause: "The resolved interpreter executable is outside the canonical virtual environment directory.",
      fixes: [{description: "Recreate the isolated exp.arolariu.ro virtual environment, then rerun doctor.", command: SETUP_COMMAND_HINT}],
    });
  }

  if (!pathsEqual(metadata.prefix, expectedVenvDirectory, isWin32) || metadata.prefix === metadata.basePrefix) {
    return issueDiagnostic(context, startedAt, {
      id: "python.virtual-environment",
      name: "Virtual environment",
      status: "fail",
      summary: "The virtual environment interpreter does not identify itself as an isolated exp.arolariu.ro environment.",
      evidence: [
        `sys.prefix: ${metadata.prefix}`,
        `sys.base_prefix: ${metadata.basePrefix}`,
        `Expected directory: ${expectedVenvDirectory}`,
      ],
      rootCause: "sys.prefix does not identify the canonical virtual environment, or the interpreter is not isolated from its base installation.",
      fixes: [{description: "Recreate the isolated exp.arolariu.ro virtual environment, then rerun doctor.", command: SETUP_COMMAND_HINT}],
    });
  }

  return passDiagnostic(
    context,
    startedAt,
    "python.virtual-environment",
    "Virtual environment",
    "The exp.arolariu.ro virtual environment is healthy and isolated.",
    [`Executable: ${metadata.executable}`, `Version: ${metadata.version}`],
  );
}

async function diagnosePip(context: Readonly<DoctorContext>, blocked: boolean): Promise<DiagnosticResult> {
  if (blocked) {
    return skippedForVirtualEnvironment("python.pip", "pip availability");
  }

  const startedAt = context.now();
  const command = context.platform === "win32" ? VENV_PIP_VERSION_COMMAND_WIN32 : VENV_PIP_VERSION_COMMAND_POSIX;
  const result = await context.runner.run(command, {cwd: context.paths.expRoot});

  if (!isSuccessfulCommand(result)) {
    return issueDiagnostic(context, startedAt, {
      id: "python.pip",
      name: "pip availability",
      status: "fail",
      summary: "pip is not available in the virtual environment.",
      evidence: commandEvidence(result),
      rootCause: "The virtual environment interpreter could not run pip.",
      fixes: [{description: "Recreate the isolated exp.arolariu.ro virtual environment, then rerun doctor.", command: SETUP_COMMAND_HINT}],
    });
  }

  return passDiagnostic(
    context,
    startedAt,
    "python.pip",
    "pip availability",
    "pip is available in the virtual environment.",
    [result.stdout.trim()],
  );
}

async function diagnoseRequirements(context: Readonly<DoctorContext>, blocked: boolean): Promise<DiagnosticResult> {
  if (blocked) {
    return skippedForVirtualEnvironment("python.requirements", "Installed requirements");
  }

  const startedAt = context.now();

  let detail: RequirementsTreeDetail;
  try {
    detail = await parseRequirementsTreeDetailed(context.paths.pythonRequirements, (path) => readFile(path, "utf8"));
  } catch (error) {
    return issueDiagnostic(context, startedAt, {
      id: "python.requirements",
      name: "Installed requirements",
      status: "fail",
      summary: "The repository requirements files could not be parsed.",
      evidence: [errorMessage(error)],
      rootCause: errorMessage(error),
      fixes: [{description: "Fix the malformed requirements file entry described above, then rerun doctor."}],
    });
  }

  const command = context.platform === "win32" ? VENV_PIP_LIST_COMMAND_WIN32 : VENV_PIP_LIST_COMMAND_POSIX;
  const result = await context.runner.run(command, {cwd: context.paths.expRoot});
  if (!isSuccessfulCommand(result)) {
    return issueDiagnostic(context, startedAt, {
      id: "python.requirements",
      name: "Installed requirements",
      status: "fail",
      summary: "Installed distributions could not be listed.",
      evidence: commandEvidence(result),
      rootCause: "pip list did not complete successfully in the virtual environment.",
      fixes: [{description: "Recreate the isolated exp.arolariu.ro virtual environment, then rerun doctor.", command: SETUP_COMMAND_HINT}],
    });
  }

  const installed = parseInstalledDistributions(result.stdout);
  if (installed === null) {
    return issueDiagnostic(context, startedAt, {
      id: "python.requirements",
      name: "Installed requirements",
      status: "fail",
      summary: "pip list produced malformed JSON.",
      evidence: [`stdout: ${result.stdout.trim()}`],
      rootCause: "The pip list --format json output could not be parsed as the expected array shape.",
      fixes: [{description: "Recreate the isolated exp.arolariu.ro virtual environment, then rerun doctor.", command: SETUP_COMMAND_HINT}],
    });
  }

  const comparison = compareInstalledDistributions(detail.exact, installed);
  const unverifiedEvidence = detail.unverified.map(
    (entry) => `Unverified (not exactly comparable): '${entry.text}' in ${entry.source} — ${entry.reason}`,
  );

  if (comparison.missing.length > 0 || comparison.mismatched.length > 0) {
    return issueDiagnostic(context, startedAt, {
      id: "python.requirements",
      name: "Installed requirements",
      status: "fail",
      summary: "One or more pinned requirements are not satisfied in the virtual environment.",
      evidence: [
        ...comparison.missing.map((entry) => `Missing: ${entry}`),
        ...comparison.mismatched.map((entry) => `Mismatched: ${entry}`),
        ...unverifiedEvidence,
      ],
      potentialCauses: [
        ...comparison.missing.map((entry) => ({cause: `${entry} is not installed.`, confidence: "high" as const})),
        ...comparison.mismatched.map((entry) => ({cause: `${entry} does not match its pinned version.`, confidence: "high" as const})),
      ],
      fixes: [{description: "Install the pinned requirements into the virtual environment, then rerun doctor.", command: SETUP_COMMAND_HINT}],
    });
  }

  if (detail.unverified.length > 0) {
    return issueDiagnostic(context, startedAt, {
      id: "python.requirements",
      name: "Installed requirements",
      status: "warn",
      summary: "Every exact pinned requirement is satisfied, but some requirement entries could not be exactly verified.",
      evidence: [`${String(detail.exact.length)} exact pinned requirements verified.`, ...unverifiedEvidence],
      rootCause:
        "One or more requirement entries use extras, environment markers, non-exact version specifiers, or pip options/directives that are not evaluated by this doctor's exact-pin comparator.",
      fixes: detail.unverified.map((entry) => ({
        description: `Review '${entry.text}' in ${entry.source} manually, or replace it with an exact '==' pin if precise doctor verification is desired.`,
      })),
    });
  }

  return passDiagnostic(
    context,
    startedAt,
    "python.requirements",
    "Installed requirements",
    "Installed distributions satisfy every pinned requirement.",
    [`${String(detail.exact.length)} pinned requirements verified.`],
  );
}

async function diagnoseConflicts(context: Readonly<DoctorContext>, blocked: boolean): Promise<DiagnosticResult> {
  if (blocked) {
    return skippedForVirtualEnvironment("python.conflicts", "Dependency conflicts");
  }

  const startedAt = context.now();
  const command = context.platform === "win32" ? VENV_PIP_CHECK_COMMAND_WIN32 : VENV_PIP_CHECK_COMMAND_POSIX;
  const result = await context.runner.run(command, {cwd: context.paths.expRoot});

  if (isSuccessfulCommand(result)) {
    return passDiagnostic(
      context,
      startedAt,
      "python.conflicts",
      "Dependency conflicts",
      "No dependency conflicts were found.",
      result.stdout.trim() === "" ? ["pip check reported no output."] : [result.stdout.trim()],
    );
  }

  const unavailable = isPipUnavailable(result);
  return issueDiagnostic(context, startedAt, {
    id: "python.conflicts",
    name: "Dependency conflicts",
    status: "fail",
    summary: unavailable ? "pip is not available in the virtual environment." : "pip check reported dependency conflicts.",
    evidence: commandEvidence(result),
    rootCause: unavailable
      ? "The virtual environment interpreter could not run pip."
      : "pip check reported one or more broken requirement sets.",
    fixes: [
      unavailable
        ? {description: "Recreate the isolated exp.arolariu.ro virtual environment, then rerun doctor.", command: SETUP_COMMAND_HINT}
        : {description: "Resolve the reported dependency conflicts, then rerun doctor."},
    ],
  });
}

async function diagnoseConfiguration(context: Readonly<DoctorContext>): Promise<DiagnosticResult> {
  const startedAt = context.now();
  const templatePath = resolve(context.paths.expRoot, "config.template.json");
  const dockerPath = resolve(context.paths.expRoot, "config.docker.json");
  const aspirePath = resolve(context.paths.expRoot, "config.aspire.json");

  const template = await readJsonRecord(templatePath);
  if (template === null) {
    return issueDiagnostic(context, startedAt, {
      id: "python.configuration",
      name: "Configuration parity",
      status: "fail",
      summary: "config.template.json could not be read or parsed.",
      evidence: [`Path: ${templatePath}`],
      rootCause: "The required configuration template could not be read as a JSON object.",
      fixes: [{description: "Restore a valid config.template.json, then rerun doctor."}],
    });
  }

  const docker = await readJsonRecord(dockerPath);
  if (docker === null) {
    return issueDiagnostic(context, startedAt, {
      id: "python.configuration",
      name: "Configuration parity",
      status: "fail",
      summary: "config.docker.json could not be read or parsed.",
      evidence: [`Path: ${dockerPath}`],
      rootCause: "The required Docker configuration could not be read as a JSON object.",
      fixes: [{description: "Restore a valid config.docker.json, then rerun doctor."}],
    });
  }

  const missingKeys = Object.keys(template).filter((key) => !(key in docker));
  if (missingKeys.length > 0) {
    return issueDiagnostic(context, startedAt, {
      id: "python.configuration",
      name: "Configuration parity",
      status: "fail",
      summary: "config.docker.json is missing required configuration keys.",
      evidence: missingKeys.map((key) => `Missing key: ${key}`),
      rootCause: "config.docker.json does not declare every key required by config.template.json.",
      fixes: [{description: "Add the missing configuration keys to config.docker.json, then rerun doctor."}],
    });
  }

  const evidence: string[] = [`${String(Object.keys(template).length)} required configuration keys are present in config.docker.json.`];
  let aspireContents: string | null;
  try {
    aspireContents = await readFile(aspirePath, "utf8");
  } catch {
    aspireContents = null;
  }

  if (aspireContents === null) {
    evidence.push("config.aspire.json is absent, which is expected before Aspire has generated local runtime state.");
  } else {
    let parsedAspire: unknown;
    try {
      parsedAspire = JSON.parse(aspireContents);
    } catch {
      return issueDiagnostic(context, startedAt, {
        id: "python.configuration",
        name: "Configuration parity",
        status: "warn",
        summary: "config.aspire.json is present but could not be parsed as JSON.",
        evidence: [`Path: ${aspirePath}`],
        rootCause: "The generated Aspire configuration overlay is not valid JSON.",
        fixes: [{description: "Restart Aspire to regenerate config.aspire.json, then rerun doctor."}],
      });
    }

    evidence.push(
      isRecord(parsedAspire)
        ? "config.aspire.json is present and well-formed."
        : "config.aspire.json is present but is not a JSON object.",
    );
  }

  return passDiagnostic(
    context,
    startedAt,
    "python.configuration",
    "Configuration parity",
    "config.docker.json satisfies every key required by config.template.json.",
    evidence,
  );
}

function isValidPyPiPackageIndex(body: string | undefined): boolean {
  if (body === undefined || body.trim() === "") {
    return false;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return false;
  }

  if (!isRecord(parsed)) {
    return false;
  }

  const info = parsed["info"];
  return isRecord(info) && typeof info["name"] === "string" && info["name"].toLowerCase() === "pip";
}

async function diagnosePyPi(context: Readonly<DoctorContext>): Promise<DiagnosticResult> {
  if (context.options.quick) {
    return skippedDiagnostic({
      id: "python.pypi",
      module: "python",
      name: "PyPI reachability",
      summary: "PyPI reachability was skipped in quick mode.",
      evidence: ["--quick intentionally skips network reachability probes."],
    });
  }

  const startedAt = context.now();
  const probe = await context.network.get(PYPI_PIP_INDEX_URL, DIAGNOSTIC_DEFAULT_TIMEOUT_MS);
  if (probe.status !== "reachable") {
    return skippedDiagnostic({
      id: "python.pypi",
      module: "python",
      name: "PyPI reachability",
      summary: "PyPI reachability could not be determined.",
      evidence: [probe.error ?? `Network probe reported status '${probe.status}'.`],
    });
  }

  if (probe.statusCode !== 200) {
    return issueDiagnostic(context, startedAt, {
      id: "python.pypi",
      name: "PyPI reachability",
      status: "warn",
      summary: "PyPI returned an unexpected response.",
      evidence: [`HTTP status: ${String(probe.statusCode)}`],
      rootCause: "The public PyPI JSON API responded without a successful status.",
      fixes: [{description: "Verify PyPI availability, then rerun doctor."}],
    });
  }

  if (!isValidPyPiPackageIndex(probe.body)) {
    return issueDiagnostic(context, startedAt, {
      id: "python.pypi",
      name: "PyPI reachability",
      status: "warn",
      summary: "PyPI returned a malformed package index response.",
      evidence: [
        `HTTP status: ${String(probe.statusCode)}`,
        probe.body === undefined || probe.body.trim() === "" ? "No response body was captured." : `Response body: ${probe.body.trim()}`,
      ],
      rootCause: "The PyPI JSON response did not contain the expected pip package info.",
      fixes: [{description: "Verify PyPI availability, then rerun doctor."}],
    });
  }

  return passDiagnostic(context, startedAt, "python.pypi", "PyPI reachability", "PyPI is reachable.", [
    `HTTP status: ${String(probe.statusCode)}`,
  ]);
}

async function parseRequirementsFile(
  path: string,
  readText: (path: string) => Promise<string>,
  visiting: Set<string>,
  visited: Set<string>,
  seenNames: Map<string, ParsedRequirement>,
  results: ParsedRequirement[],
  unverified: UnverifiedRequirementEntry[],
): Promise<void> {
  if (visiting.has(path)) {
    throw new RequirementsParseError(`Circular requirements include detected at ${path}.`);
  }
  if (visited.has(path)) {
    throw new RequirementsParseError(`Duplicate requirements include detected for ${path}.`);
  }

  visiting.add(path);

  let contents: string;
  try {
    contents = await readText(path);
  } catch (error) {
    throw new RequirementsParseError(`Unable to read requirements file ${path}: ${errorMessage(error)}`);
  }

  for (const rawLine of contents.split(/\r?\n/u)) {
    const withoutComment = rawLine.startsWith("#") ? "" : stripInlineComment(rawLine);
    if (withoutComment === "") {
      continue;
    }

    // Pip requirements files allow a trailing backslash to continue a logical entry (most
    // commonly `name==version \` followed by one or more `--hash=...` lines). Each continued
    // physical line remains independently recognizable once the trailing backslash is stripped:
    // an option line (e.g. `--hash=...`) is still detected by its own leading `-`, so no full
    // logical-line reassembly is required.
    const line = LINE_CONTINUATION_SUFFIX.test(withoutComment) ? withoutComment.replace(LINE_CONTINUATION_SUFFIX, "").trim() : withoutComment;
    if (line === "") {
      continue;
    }

    const includeMatch = REQUIREMENT_INCLUDE_DIRECTIVE.exec(line);
    if (includeMatch !== null) {
      const includedRaw = includeMatch[1]?.trim().replace(/^["']|["']$/gu, "");
      if (includedRaw === undefined || includedRaw === "") {
        throw new RequirementsParseError(`Malformed requirements include directive '${rawLine}' in ${path}.`);
      }

      const includedPath = resolve(dirname(path), includedRaw);
      await parseRequirementsFile(includedPath, readText, visiting, visited, seenNames, results, unverified);
      continue;
    }

    // Ordinary pip option lines (editable/constraint directives, index options, hash lines, etc.)
    // are valid requirements-file syntax but carry no package pin to compare; only `-r`/
    // `--requirement` (handled above) is followed recursively.
    if (line.startsWith("-")) {
      unverified.push({
        text: line,
        source: path,
        reason: "Pip option or directive is not evaluated by the exact-pin comparator.",
      });
      continue;
    }

    const pinMatch = EXACT_REQUIREMENT_PIN.exec(line);
    if (pinMatch !== null && pinMatch[1] !== undefined && pinMatch[2] !== undefined) {
      const normalizedName = normalizeDistributionName(pinMatch[1]);
      const existing = seenNames.get(normalizedName);
      if (existing !== undefined) {
        throw new RequirementsParseError(`Duplicate requirement '${normalizedName}' declared in both ${existing.source} and ${path}.`);
      }

      const parsedRequirement: ParsedRequirement = {name: normalizedName, specifier: pinMatch[2], source: path};
      seenNames.set(normalizedName, parsedRequirement);
      results.push(parsedRequirement);
      continue;
    }

    // Extras (`name[extra]==1.0`), environment markers (`name==1.0; python_version >= "3.9"`),
    // and non-exact specifiers (`~=`, `>=`, ranges, bare unpinned names, ...) are ordinary, valid
    // pip requirement entries. They are not comparable against `pip list` without a full PEP 440
    // evaluator, so they are recorded as unverified rather than aborting the whole tree.
    if (REQUIREMENT_NAME_LIKE.test(line)) {
      unverified.push({
        text: line,
        source: path,
        reason: "Requirement uses extras, an environment marker, or a non-exact version specifier that is not evaluated by the exact-pin comparator.",
      });
      continue;
    }

    throw new RequirementsParseError(`Unsupported or malformed requirement entry '${rawLine}' in ${path}.`);
  }

  visiting.delete(path);
  visited.add(path);
}

function stripInlineComment(line: string): string {
  const hashIndex = line.indexOf(" #");
  return (hashIndex === -1 ? line : line.slice(0, hashIndex)).trim();
}

/**
 * Recursively parses a pip requirements file tree, following `-r`/`--requirement` includes, and
 * separates exact `==` pins from ordinary valid-but-unverified entries (extras, environment
 * markers, non-exact specifiers, and other pip options/directives).
 *
 * @param rootFile - Absolute or relative path to the entry requirements file.
 * @param readText - Read-only text loader used for the entry file and every discovered include.
 * @returns Every exact-pinned requirement and every recognized-but-unverified entry, in file order.
 * @throws RequirementsParseError When an include cycle, duplicate include, duplicate requirement
 * name, malformed include directive, or a genuinely unparseable entry is discovered.
 */
async function parseRequirementsTreeDetailed(
  rootFile: string,
  readText: (path: string) => Promise<string>,
): Promise<RequirementsTreeDetail> {
  const exact: ParsedRequirement[] = [];
  const unverified: UnverifiedRequirementEntry[] = [];
  await parseRequirementsFile(resolve(rootFile), readText, new Set(), new Set(), new Map(), exact, unverified);
  return {exact, unverified};
}

/**
 * Recursively parses a pip requirements file tree, following `-r`/`--requirement` includes.
 *
 * @param rootFile - Absolute or relative path to the entry requirements file.
 * @param readText - Read-only text loader used for the entry file and every discovered include.
 * @returns Every exact-pinned requirement discovered across the tree, in file order. Ordinary
 * valid-but-unverified entries (extras, environment markers, non-exact specifiers, and other pip
 * options/directives) are recognized and skipped rather than included here.
 * @throws RequirementsParseError When an include cycle, duplicate include, duplicate requirement
 * name, malformed include directive, or a genuinely unparseable entry is discovered.
 */
export async function parseRequirementsTree(
  rootFile: string,
  readText: (path: string) => Promise<string>,
): Promise<readonly ParsedRequirement[]> {
  const detail = await parseRequirementsTreeDetailed(rootFile, readText);
  return detail.exact;
}

/**
 * Compares parsed exact-pinned requirements against distributions reported by `pip list`.
 *
 * @param requirements - Exact-pinned requirements discovered from the repository requirements tree.
 * @param installed - Distributions reported by the virtual environment's `pip list --format json`.
 * @returns Requirement names that are not installed, and requirements whose installed version does
 * not match their pin.
 */
export function compareInstalledDistributions(
  requirements: readonly ParsedRequirement[],
  installed: readonly Readonly<{name: string; version: string}>[],
): Readonly<InstalledDistributionComparison> {
  const installedVersionsByName = new Map<string, string>();
  for (const distribution of installed) {
    installedVersionsByName.set(normalizeDistributionName(distribution.name), distribution.version);
  }

  const missing: string[] = [];
  const mismatched: string[] = [];
  for (const requirement of requirements) {
    const installedVersion = installedVersionsByName.get(requirement.name);
    if (installedVersion === undefined) {
      missing.push(`${requirement.name}==${requirement.specifier}`);
      continue;
    }

    if (installedVersion !== requirement.specifier) {
      mismatched.push(`${requirement.name} requires ${requirement.specifier} but ${installedVersion} is installed.`);
    }
  }

  return {missing, mismatched};
}

/** Read-only Python interpreter, virtual environment, requirements, and PyPI diagnostics. */
export const pythonDoctorModule: DiagnosticModule = {
  id: "python",
  title: "Python",
  async run(context: Readonly<DoctorContext>): Promise<readonly DiagnosticResult[]> {
    const runtime = await diagnoseRuntime(context);
    const virtualEnvironment = await diagnoseVirtualEnvironment(context);
    const blocked = virtualEnvironment.status !== "pass";
    const pip = await diagnosePip(context, blocked);
    const requirements = await diagnoseRequirements(context, blocked);
    const conflicts = await diagnoseConflicts(context, blocked);
    const configuration = await diagnoseConfiguration(context);
    const pypi = await diagnosePyPi(context);
    return [runtime, virtualEnvironment, pip, requirements, conflicts, configuration, pypi];
  },
};
