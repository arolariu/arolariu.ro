/**
 * @fileoverview Validation of the fixed workspace-facts wire protocol and Nx shared inputs.
 * @module github/scripts/lib/planning/workspace
 */
import {posix, win32} from "node:path";
import {array, finite, record, text} from "../../helpers/reports/validation.ts";
import type {WorkspaceFacts, WorkspaceInspection} from "./types.ts";

/**
 * Matches Nx-declared shared input patterns in order, including exclusions.
 * @param path - Exact repository-relative Git path.
 * @param patterns - The live declared shared-input list.
 * @returns Whether the path belongs to the configured shared input set.
 */
export function matchesSharedInput(path: string, patterns: readonly string[]): boolean {
  let matched = false;
  for (const input of patterns) {
    const excluded = input.startsWith("!");
    const pattern = (excluded ? input.slice(1) : input).replace(/^\{workspaceRoot\}\//, "");
    if (posix.matchesGlob(path, pattern)) matched = !excluded;
  }
  return matched;
}

function strings(value: unknown, field: string): readonly string[] {
  return array(value, field).map((value) => text(value, field));
}
function nonblank(value: unknown, field: string): string {
  const result = text(value, field);
  if (result.trim() === "") throw new TypeError(`Invalid ${field}: blank`);
  return result;
}

function facts(value: unknown): WorkspaceFacts {
  const raw = record(value, "workspace facts");
  const names = new Set<string>();
  const roots = new Set<string>();
  const projects = array(raw["projects"], "workspace projects")
    .map((value) => {
      const project = record(value, "workspace project");
      const name = nonblank(project["name"], "project name");
      const root = text(project["root"], "project root");
      if (
        posix.isAbsolute(root)
        || win32.isAbsolute(root)
        || root.includes("\\")
        || (root !== "" && root.split("/").some((part) => part === "" || part === "." || part === ".."))
      )
        throw new TypeError("Invalid workspace project root");
      if (names.has(name) || roots.has(root)) throw new TypeError("Duplicate workspace project identity or ownership");
      names.add(name);
      roots.add(root);
      const targets = strings(project["targets"], "workspace targets");
      if (new Set(targets).size !== targets.length || targets.some((target) => !target.trim()))
        throw new TypeError("Invalid workspace targets");
      return {name, root, targets: targets.toSorted()};
    })
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const edgeKeys = new Set<string>();
  const dependencies = array(raw["dependencies"], "workspace dependencies")
    .map((value) => {
      const edge = record(value, "workspace dependency");
      const source = nonblank(edge["source"], "dependency source");
      const target = nonblank(edge["target"], "dependency target");
      const key = JSON.stringify([source, target]);
      if (!names.has(source) || !names.has(target) || edgeKeys.has(key)) throw new TypeError("Invalid or duplicate workspace dependency");
      edgeKeys.add(key);
      return {source, target};
    })
    .sort((a, b) => (JSON.stringify([a.source, a.target]) < JSON.stringify([b.source, b.target]) ? -1 : 1));
  const cycles = array(raw["cycles"], "workspace cycles").map((value) => {
    const cycle = strings(value, "workspace cycle");
    if (cycle.length < 2 || cycle[0] !== cycle.at(-1) || cycle.some((name) => !names.has(name)))
      throw new TypeError("Invalid workspace cycle");
    for (let index = 1; index < cycle.length; index++)
      if (!edgeKeys.has(JSON.stringify([cycle[index - 1], cycle[index]])))
        throw new TypeError("Workspace cycle references a missing dependency");
    return cycle;
  });
  return {projects, dependencies, cycles};
}

/**
 * Validates inspection evidence without loading Effect/Nx or fabricating a graph.
 * @param value - Parsed stdout from the fixed root facts worker.
 * @returns The validated available/unavailable/invalid wire outcome.
 * @throws TypeError for malformed transport, inconsistent edges, or escaping roots.
 */
export function decodeWorkspaceInspection(value: unknown): WorkspaceInspection {
  const raw = record(value, "workspace inspection");
  const durationMs = finite(raw["durationMs"], "workspace durationMs");
  switch (raw["kind"]) {
    case "available":
      return {kind: "available", durationMs, value: facts(raw["value"])};
    case "unavailable":
      return {kind: "unavailable", durationMs, reason: nonblank(raw["reason"], "workspace reason")};
    case "invalid": {
      const issues = strings(raw["issues"], "workspace issues");
      if (issues.length === 0) throw new TypeError("Invalid workspace diagnostic evidence");
      return {kind: "invalid", durationMs, issues};
    }
    default:
      throw new TypeError("Invalid workspace inspection kind");
  }
}

/**
 * Reads the repository's declared shared globals, not a competing copied list.
 * @param value - Untrusted parsed nx.json.
 * @returns Shared input patterns in their declared matching order.
 * @throws TypeError for a missing/unsupported declaration.
 */
export function decodeSharedInputs(value: unknown): readonly string[] {
  const inputs = record(record(value, "Nx configuration")["namedInputs"], "Nx namedInputs");
  return strings(inputs["sharedGlobals"], "Nx sharedGlobals");
}
