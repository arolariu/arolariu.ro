/**
 * @fileoverview Deterministic affected-work selection and verified plan transport.
 * @module github/scripts/lib/planning/plan
 * @remarks No root runtime or resource I/O is imported. Unknown scope broadens;
 * known-empty scope requires explicit skips rather than an empty aggregate.
 */
import {createHash} from "node:crypto";
import {posix, win32} from "node:path";
import type {GitChange, GitChangeKind, GitChangeSet} from "../../helpers/git/index.ts";
import {array, record, text} from "../../helpers/reports/validation.ts";
import type {WorkflowContext} from "../context.ts";
import {
  decodeProviderId,
  NO_PROVIDER_SETUP,
  PROVIDER_DESCRIPTORS,
  providerDescriptor,
  TYPESCRIPT_SUITE_PROJECTS,
  type ProviderDescriptor,
  type ProviderSetup,
  type TypeScriptSuiteName,
} from "../hygiene/registry.ts";
import {decodeWorkspaceInspection, matchesSharedInput} from "./workspace.ts";
import type {HygienePlan, PlannedProvider, PlanningDiagnostic, ProviderMatrixEntry, WorkspaceInspection} from "./types.ts";

const FORMAT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".jsonc",
  ".md",
  ".mdx",
  ".css",
  ".scss",
  ".sass",
  ".html",
  ".yml",
  ".yaml",
  ".svelte",
]);
const LINT_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".svelte"]);
const CHANGE_KINDS: readonly GitChangeKind[] = ["added", "modified", "deleted", "renamed", "copied", "type-changed", "unmerged"];

function bool(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") throw new TypeError(`Invalid plan ${field}`);
  return value;
}
function sha(value: unknown): string {
  const result = text(value, "plan commit SHA");
  if (!/^(?:[\da-f]{40}|[\da-f]{64})$/i.test(result)) throw new TypeError("Invalid plan commit SHA");
  return result.toLowerCase();
}
function repositoryPath(value: unknown): string {
  const result = text(value, "changed path");
  if (!result || posix.isAbsolute(result) || win32.isAbsolute(result) || result.split(/[\\/]/).includes("..") || result.includes("\0"))
    throw new TypeError("Invalid repository-relative changed path");
  return result;
}
function decodeChanges(value: unknown): GitChangeSet {
  const raw = record(value, "plan changes");
  if (raw["scope"] === "unknown") return {scope: "unknown", reason: text(raw["reason"], "unknown change reason")};
  if (raw["scope"] !== "known") throw new TypeError("Invalid plan change scope");
  const seen = new Set<string>();
  const entries = array(raw["entries"], "change entries")
    .map((value): GitChange => {
      const change = record(value, "change");
      const kind = CHANGE_KINDS.find((kind) => kind === change["kind"]);
      if (!kind) throw new TypeError("Invalid change kind");
      const path = repositoryPath(change["path"]);
      const previousPath = change["previousPath"] === undefined ? undefined : repositoryPath(change["previousPath"]);
      if ((kind === "renamed" || kind === "copied") !== (previousPath !== undefined)) throw new TypeError("Invalid rename/copy origin");
      const entry = {kind, path, ...(previousPath === undefined ? {} : {previousPath})};
      const key = JSON.stringify(entry);
      if (seen.has(key)) throw new TypeError("Duplicate change entry");
      seen.add(key);
      return entry;
    })
    .sort((a, b) => {
      const left = JSON.stringify([a.path, a.previousPath ?? "", a.kind]);
      const right = JSON.stringify([b.path, b.previousPath ?? "", b.kind]);
      return left < right ? -1 : left > right ? 1 : 0;
    });
  return {scope: "known", baseSha: sha(raw["baseSha"]), headSha: sha(raw["headSha"]), entries};
}
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (typeof value === "object" && value !== null)
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, value]) => [key, canonical(value)]),
    );
  return value;
}
function planId(plan: Omit<HygienePlan, "id" | "diagnostics">): string {
  return createHash("sha256")
    .update(JSON.stringify(canonical(plan)))
    .digest("hex");
}
function freeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function under(path: string, root: string): boolean {
  return root === "" || path === root || path.startsWith(`${root}/`);
}
function documentation(path: string): boolean {
  return path.startsWith("docs/") || /\.(?:md|mdx|txt)$/i.test(path) || /(?:^|\/)(?:LICENSE|NOTICE|README)$/i.test(path);
}
function setupFor(
  descriptor: ProviderDescriptor,
  selected: boolean,
  suites: readonly TypeScriptSuiteName[],
  roots: readonly string[],
  full: boolean,
): ProviderSetup {
  if (!selected) return {...NO_PROVIDER_SETUP};
  if (descriptor.id === "test-typescript")
    return {
      ...descriptor.setup,
      buildComponents: suites.includes("website") || suites.includes("components"),
      generateArtifacts: suites.some((suite) => suite === "website" || suite === "cv" || suite === "status"),
    };
  if (descriptor.id === "lint")
    return {
      ...descriptor.setup,
      buildComponents: full || roots.some((root) => root === "sites/arolariu.ro" || root === "packages/components"),
    };
  return {...descriptor.setup};
}

/**
 * Builds a stable plan from validated graph/change evidence.
 * @param input - Explicit context, requested scope, broker evidence, and Nx shared inputs.
 * @returns A deeply frozen plan; fallback mode is full with explicit diagnostics.
 * @throws For malformed transport/identity rather than silently accepting a graph.
 */
export function buildHygienePlan(
  input: Readonly<{
    context: WorkflowContext;
    mode: "affected" | "full";
    changes: GitChangeSet;
    workspace: WorkspaceInspection;
    sharedInputs: readonly string[];
  }>,
): HygienePlan {
  const changes = decodeChanges(input.changes);
  const commitSha = sha(input.context.commitSha);
  if (changes.scope === "known" && changes.headSha !== commitSha) throw new TypeError("Plan change head does not match checked-out commit");
  if (input.mode !== "affected" && input.mode !== "full") throw new TypeError("Invalid hygiene scope");
  const inspection = decodeWorkspaceInspection(input.workspace);
  const empty = changes.scope === "known" && changes.entries.length === 0;
  const paths =
    changes.scope === "known"
      ? [
          ...new Set(
            changes.entries.flatMap((entry) => (entry.previousPath === undefined ? [entry.path] : [entry.previousPath, entry.path])),
          ),
        ].sort()
      : [];
  const current = changes.scope === "known" ? changes.entries.filter((entry) => entry.kind !== "deleted").map((entry) => entry.path) : [];
  const diagnostics: PlanningDiagnostic[] = [];
  const affected = new Set<string>();
  const selectedSuites = new Set<TypeScriptSuiteName>();
  if (input.mode === "full") diagnostics.push({code: "full-requested", message: "Full scope explicitly requested"});
  if (changes.scope === "unknown") diagnostics.push({code: "change-scope-unknown", message: changes.reason});
  if (!empty && inspection.kind !== "available")
    diagnostics.push({
      code: `workspace-${inspection.kind}`,
      message: inspection.kind === "unavailable" ? inspection.reason : inspection.issues.join("; "),
    });
  if (paths.some((path) => matchesSharedInput(path, input.sharedInputs)))
    diagnostics.push({code: "shared-input", message: "Nx shared inputs changed; running the declared full scope"});
  if (changes.scope === "known" && changes.entries.some((entry) => entry.kind === "unmerged"))
    diagnostics.push({code: "unmerged-change", message: "Unmerged change evidence requires full scope"});
  if (inspection.kind === "available") {
    const owners = inspection.value.projects.toSorted((a, b) => b.root.length - a.root.length);
    for (const path of paths) {
      if (under(path, ".github/scripts")) {
        selectedSuites.add("scripts");
        selectedSuites.add("tooling");
        continue;
      }
      if (under(path, "scripts")) {
        selectedSuites.add("tooling");
        continue;
      }
      const owner = owners.find((project) => under(path, project.root));
      if (owner) affected.add(owner.name);
      else if (!documentation(path)) diagnostics.push({code: "unmapped-change", message: `No declared project owns changed path: ${path}`});
    }
    const queue = [...affected];
    for (let index = 0; index < queue.length; index++) {
      for (const edge of inspection.value.dependencies)
        if (edge.target === queue[index] && !affected.has(edge.source)) {
          affected.add(edge.source);
          queue.push(edge.source);
        }
    }
    for (const project of inspection.value.projects.filter((project) => affected.has(project.name))) {
      const suite = TYPESCRIPT_SUITE_PROJECTS.find((suite) => suite.root === project.root);
      if (suite) selectedSuites.add(suite.name);
      else if (project.targets.includes("test") && project.root !== "sites/api.arolariu.ro" && project.root !== "sites/exp.arolariu.ro")
        diagnostics.push({code: "unmapped-test-project", message: `No declared test suite maps project: ${project.name}`});
    }
  }
  const full = diagnostics.length > 0;
  if (full && inspection.kind === "available") inspection.value.projects.forEach((project) => affected.add(project.name));
  const suites = TYPESCRIPT_SUITE_PROJECTS.filter((suite) => full || selectedSuites.has(suite.name)).map((suite) => suite.name);
  const roots =
    inspection.kind === "available"
      ? inspection.value.projects.filter((project) => affected.has(project.name)).map((project) => project.root)
      : [];
  const reason = full
    ? diagnostics.map((diagnostic) => diagnostic.message).join("; ")
    : empty
      ? "No changed files"
      : "Affected changed files and project consumers";
  const providers = PROVIDER_DESCRIPTORS.map((descriptor): PlannedProvider => {
    let selected = full;
    if (!selected && !empty) {
      switch (descriptor.id) {
        case "format":
          selected = current.some((path) => FORMAT_EXTENSIONS.has(posix.extname(path)));
          break;
        case "lint":
          selected = current.some((path) => LINT_EXTENSIONS.has(posix.extname(path)));
          break;
        case "test-typescript":
          selected = suites.length > 0;
          break;
        case "test-dotnet":
          selected = roots.includes("sites/api.arolariu.ro");
          break;
        case "test-python":
          selected = roots.includes("sites/exp.arolariu.ro");
          break;
        case "stats":
          selected = true;
          break;
      }
    }
    return {
      id: descriptor.id,
      selected,
      requiredOutcome: true,
      reason: selected ? reason : empty ? "No changed files" : "No affected inputs for this provider",
      setup: setupFor(descriptor, selected, suites, roots, full),
    };
  });
  const stable: Omit<HygienePlan, "id" | "diagnostics"> = {
    schemaVersion: "1",
    mode: full ? "full" : "affected",
    commitSha,
    workflowRunId: input.context.workflowRunId,
    changes,
    affectedProjects: [...affected].sort(),
    suites,
    providers,
  };
  return freeze({...stable, id: planId(stable), diagnostics});
}

function decodeSetup(value: unknown): ProviderSetup {
  const raw = record(value, "provider setup");
  return {
    rootNodeDependencies: bool(raw["rootNodeDependencies"], "rootNodeDependencies"),
    dotnet: bool(raw["dotnet"], "dotnet"),
    python: bool(raw["python"], "python"),
    buildComponents: bool(raw["buildComponents"], "buildComponents"),
    generateArtifacts: bool(raw["generateArtifacts"], "generateArtifacts"),
  };
}

/**
 * Validates a persisted plan's closed provider set, setup, identity, and checksum.
 * @param value - Untrusted parsed plan artifact.
 * @returns A deeply frozen plan, never a substitute empty/default plan.
 * @throws TypeError for malformed, incomplete, or modified evidence.
 */
export function decodeHygienePlan(value: unknown): HygienePlan {
  const raw = record(value, "hygiene plan");
  if (raw["schemaVersion"] !== "1" || (raw["mode"] !== "affected" && raw["mode"] !== "full"))
    throw new TypeError("Unsupported hygiene plan version or mode");
  const changes = decodeChanges(raw["changes"]);
  const commitSha = sha(raw["commitSha"]);
  if (changes.scope === "known" && changes.headSha !== commitSha) throw new TypeError("Plan commit mismatch");
  const providers = array(raw["providers"], "planned providers").map((value): PlannedProvider => {
    const provider = record(value, "planned provider");
    const id = decodeProviderId(provider["id"]);
    if (provider["requiredOutcome"] !== true) throw new TypeError("Missing required provider outcome");
    const selected = bool(provider["selected"], "selected");
    const setup = decodeSetup(provider["setup"]);
    if (!selected && Object.values(setup).some(Boolean)) throw new TypeError("Skipped provider requests expensive setup");
    if ((Object.keys(setup) as (keyof ProviderSetup)[]).some((key) => setup[key] && !providerDescriptor(id).setup[key]))
      throw new TypeError("Provider requests unsupported setup");
    return {id, selected, requiredOutcome: true, setup, reason: text(provider["reason"], "selection reason")};
  });
  if (
    providers.length !== PROVIDER_DESCRIPTORS.length
    || PROVIDER_DESCRIPTORS.some((descriptor, index) => providers[index]?.id !== descriptor.id)
  )
    throw new TypeError("Incomplete or duplicate hygiene provider plan");
  const suites = array(raw["suites"], "planned suites").map((value): TypeScriptSuiteName => {
    const found = TYPESCRIPT_SUITE_PROJECTS.find((suite) => suite.name === value);
    if (!found) throw new TypeError("Unknown planned test suite");
    return found.name;
  });
  const affectedProjects = array(raw["affectedProjects"], "affected projects").map((value) => text(value, "affected project"));
  if (new Set(suites).size !== suites.length || new Set(affectedProjects).size !== affectedProjects.length)
    throw new TypeError("Duplicate plan ownership or suite");
  const stable: Omit<HygienePlan, "id" | "diagnostics"> = {
    schemaVersion: "1",
    mode: raw["mode"],
    commitSha,
    workflowRunId: text(raw["workflowRunId"], "plan workflow run"),
    changes,
    affectedProjects,
    suites,
    providers,
  };
  const id = text(raw["id"], "plan ID");
  if (id !== planId(stable)) throw new TypeError("Hygiene plan checksum does not match its contents");
  const diagnostics = array(raw["diagnostics"], "planning diagnostics").map((value) => {
    const issue = record(value, "planning diagnostic");
    return {code: text(issue["code"], "planning code"), message: text(issue["message"], "planning message")};
  });
  return freeze({...stable, id, diagnostics});
}

/**
 * Projects the immutable plan into the existing six named matrix jobs.
 * @param plan - Validated shared plan.
 * @returns Matrix entries with irrelevant expensive setup disabled.
 */
export function toProviderMatrix(plan: HygienePlan): {readonly provider: readonly ProviderMatrixEntry[]} {
  return {
    provider: plan.providers.map((provider) => ({
      id: provider.id,
      label: providerDescriptor(provider.id).name,
      selected: provider.selected,
      "root-node-deps": provider.setup.rootNodeDependencies,
      "needs-dotnet": provider.setup.dotnet,
      "needs-python": provider.setup.python,
      "build-components": provider.setup.buildComponents,
      "generate-artifacts": provider.setup.generateArtifacts,
    })),
  };
}
