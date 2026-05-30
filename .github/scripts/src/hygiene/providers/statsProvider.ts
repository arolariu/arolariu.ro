/**
 * @fileoverview Code statistics provider (informational).
 * @module github/scripts/src/hygiene/providers/statsProvider
 *
 * @remarks
 * Gate is `informational` -- this provider never fails the build.
 * Emits MetricFindings for total churn and ComparisonFindings for per-folder bundle deltas.
 */

import * as exec from "@actions/exec";
import * as path from "node:path";
import type {CheckProvider, ProviderRunInput, ProviderRunOutput, Schema} from "../domain/provider.ts";
import type {ComparisonFinding, Finding, MetricFinding} from "../domain/types.ts";

const BUNDLE_FOLDERS: readonly string[] = ["sites/arolariu.ro", "sites/api.arolariu.ro", "sites/docs.arolariu.ro"];
const TOP_N = 5;

export interface ExtensionStat {
  readonly extension: string;
  readonly count: number;
}

export interface DirectoryStat {
  readonly directory: string;
  readonly count: number;
}

export interface FolderSize {
  readonly folder: string;
  readonly mainTotal: number;
  readonly headTotal: number;
}

export interface StatsPayload {
  readonly filesChanged: number;
  readonly linesAdded: number;
  readonly linesDeleted: number;
  readonly topExtensions: readonly ExtensionStat[];
  readonly topDirectories: readonly DirectoryStat[];
  readonly bundleSizes: readonly FolderSize[];
}

const schema: Schema<StatsPayload> = {
  parse(data: unknown): StatsPayload {
    if (typeof data !== "object" || data === null) throw new Error("payload not object");
    return data as StatsPayload; // Trust own-emitted schema; could be tightened later.
  },
};

export function computeTopExtensions(files: readonly string[], topN: number): ExtensionStat[] {
  const counts = new Map<string, number>();
  for (const f of files) {
    const ext = path.extname(f).slice(1) || "(no extension)";
    counts.set(ext, (counts.get(ext) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([extension, count]) => ({extension, count}));
}

export function computeTopDirectories(files: readonly string[], topN: number): DirectoryStat[] {
  const counts = new Map<string, number>();
  for (const f of files) {
    const slashIndex = f.indexOf("/");
    const dir = slashIndex === -1 ? "(root)" : f.substring(0, slashIndex);
    counts.set(dir, (counts.get(dir) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([directory, count]) => ({directory, count}));
}

export function foldersToComparisons(folders: readonly FolderSize[]): ComparisonFinding[] {
  return folders.map<ComparisonFinding>((f) => ({
    kind: "comparison",
    severity: "info",
    name: `bundle.${f.folder}`,
    baseValue: f.mainTotal,
    headValue: f.headTotal,
    diff: f.headTotal - f.mainTotal,
    unit: "bytes",
    message: `${f.folder}: ${f.mainTotal} -> ${f.headTotal} bytes (${f.headTotal - f.mainTotal >= 0 ? "+" : ""}${f.headTotal - f.mainTotal})`,
  }));
}

async function getDiffNumstat(cwd: string, base: string, head: string): Promise<{
  filesChanged: number;
  linesAdded: number;
  linesDeleted: number;
}> {
  const r = await exec.getExecOutput("git", ["diff", "--numstat", `${base}...${head}`],
    {cwd, ignoreReturnCode: true, silent: true});
  let filesChanged = 0, linesAdded = 0, linesDeleted = 0;
  for (const line of r.stdout.trim().split("\n").filter(Boolean)) {
    const [added, deleted] = line.split("\t");
    if (added !== undefined && deleted !== undefined && added !== "-") {
      filesChanged++;
      linesAdded += parseInt(added, 10) || 0;
      linesDeleted += parseInt(deleted, 10) || 0;
    }
  }
  return {filesChanged, linesAdded, linesDeleted};
}

async function getFolderSize(cwd: string, ref: string, folder: string): Promise<number> {
  const r = await exec.getExecOutput("git", ["ls-tree", "-r", "-l", ref, folder],
    {cwd, ignoreReturnCode: true, silent: true});
  if (r.exitCode !== 0) return 0;
  let total = 0;
  for (const line of r.stdout.split("\n")) {
    const m = line.match(/^\d+ \w+ \w+\s+(\d+)\t/);
    if (m && m[1]) total += parseInt(m[1], 10);
  }
  return total;
}

async function getChangedFileList(cwd: string, base: string, head: string): Promise<string[]> {
  const r = await exec.getExecOutput("git", ["diff", "--name-only", `${base}...${head}`],
    {cwd, ignoreReturnCode: true, silent: true});
  return r.stdout.trim().split("\n").filter(Boolean);
}

export const statsProvider: CheckProvider<StatsPayload> = {
  id: "stats",
  name: "Statistics",
  icon: "📊",
  defaultGate: {kind: "informational"},
  payloadSchema: schema,
  applicableTo: () => true,
  async run(input: ProviderRunInput): Promise<ProviderRunOutput<StatsPayload>> {
    // Fetch base branch (best effort)
    await exec.getExecOutput("git", ["fetch", "origin", "main:refs/remotes/origin/main", "--depth=1", "--no-tags", "--quiet"],
      {cwd: input.workspaceRoot, ignoreReturnCode: true, silent: true});

    const diff = await getDiffNumstat(input.workspaceRoot, input.baseRef, input.headRef);
    const changed = await getChangedFileList(input.workspaceRoot, input.baseRef, input.headRef);

    const bundleSizes: FolderSize[] = [];
    for (const folder of BUNDLE_FOLDERS) {
      const [mainTotal, headTotal] = await Promise.all([
        getFolderSize(input.workspaceRoot, "refs/remotes/origin/main", folder),
        getFolderSize(input.workspaceRoot, input.headRef, folder),
      ]);
      bundleSizes.push({folder, mainTotal, headTotal});
    }

    const findings: Finding[] = [];
    const churn: MetricFinding = {
      kind: "metric",
      severity: "info",
      name: "diff.churn",
      value: diff.linesAdded + diff.linesDeleted,
      unit: "lines",
      message: `${diff.filesChanged} files changed, +${diff.linesAdded} -${diff.linesDeleted}`,
    };
    findings.push(churn);
    findings.push(...foldersToComparisons(bundleSizes));

    return {
      payload: {
        filesChanged: diff.filesChanged,
        linesAdded: diff.linesAdded,
        linesDeleted: diff.linesDeleted,
        topExtensions: computeTopExtensions(changed, TOP_N),
        topDirectories: computeTopDirectories(changed, TOP_N),
        bundleSizes,
      },
      findings,
    };
  },
};
