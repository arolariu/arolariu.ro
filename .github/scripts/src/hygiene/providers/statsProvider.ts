/**
 * @fileoverview Informational statistics composed from checked, NUL-safe Git brokers.
 * @module github/scripts/src/hygiene/providers/statsProvider
 */
import * as path from "node:path";
import {execChecked} from "../../../helpers/exec/index.ts";
import {createGitHelper} from "../../../helpers/git/index.ts";
import {touchedBundleFolders} from "../domain/changedFiles.ts";
import type {CheckProvider, ComparisonFinding, Finding, ProviderRunInput, ProviderRunOutput} from "../../../lib/hygiene/contracts.ts";
import {
  statsPayloadSchema,
  type ExtensionStat,
  type DirectoryStat,
  type FolderSize,
  type StatsPayload,
} from "../../../lib/hygiene/payloads.ts";
import {providerDescriptor} from "../../../lib/hygiene/registry.ts";
export type {ExtensionStat, DirectoryStat, FolderSize, StatsPayload} from "../../../lib/hygiene/payloads.ts";

const BUNDLE_FOLDERS: readonly string[] = ["sites/arolariu.ro", "sites/api.arolariu.ro", "sites/docs.arolariu.ro"];
const TOP_N = 5;

/** Counts extensions without changing the exact path evidence. */
export function computeTopExtensions(files: readonly string[], topN: number): ExtensionStat[] {
  const counts = new Map<string, number>();
  for (const file of files) {
    const extension = path.extname(file).slice(1) || "(no extension)";
    counts.set(extension, (counts.get(extension) ?? 0) + 1);
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([extension, count]) => ({extension, count}));
}
/** Counts the first repository path segment, retaining root-level files. */
export function computeTopDirectories(files: readonly string[], topN: number): DirectoryStat[] {
  const counts = new Map<string, number>();
  for (const file of files) {
    const slash = file.indexOf("/");
    const directory = slash < 0 ? "(root)" : file.slice(0, slash);
    counts.set(directory, (counts.get(directory) ?? 0) + 1);
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([directory, count]) => ({directory, count}));
}
/** Emits only changed bundle-size comparisons under the existing informational policy. */
export function foldersToComparisons(folders: readonly FolderSize[]): ComparisonFinding[] {
  return folders
    .filter((folder) => folder.headTotal !== folder.mainTotal)
    .map((folder) => ({
      kind: "comparison",
      severity: "info",
      name: `bundle.${folder.folder}`,
      baseValue: folder.mainTotal,
      headValue: folder.headTotal,
      diff: folder.headTotal - folder.mainTotal,
      unit: "B",
      message: `${folder.folder}: ${folder.mainTotal} -> ${folder.headTotal} bytes (${folder.headTotal - folder.mainTotal >= 0 ? "+" : ""}${folder.headTotal - folder.mainTotal})`,
    }));
}

/** Keeps the existing main-versus-head bundle policy; Git errors never fabricate zero sizes. */
export const statsProvider: CheckProvider<StatsPayload> = {
  ...providerDescriptor("stats"),
  payloadSchema: statsPayloadSchema,
  applicableTo: () => true,
  async run(input: ProviderRunInput): Promise<ProviderRunOutput<StatsPayload>> {
    const git = createGitHelper({cwd: input.workspaceRoot});
    await git.fetchBranch("main", "origin", 1);
    const merge = await execChecked("git", ["merge-base", input.baseRef, input.headRef], {cwd: input.workspaceRoot, silent: true});
    const mergeBase = merge.stdout.trim();
    if (!/^(?:[a-f\d]{40}|[a-f\d]{64})$/i.test(mergeBase)) throw new Error("Git returned an invalid merge-base identity");
    const diff = await git.getDiffStats(mergeBase, input.headRef);
    const changed = input.changeScope === "known" ? input.changedFiles : await git.getChangedFiles(mergeBase, input.headRef);
    const filesChanged = input.changeScope === "known" ? changed.length : diff.filesChanged;
    const bundleSizes: FolderSize[] = [];
    for (const folder of touchedBundleFolders(input, BUNDLE_FOLDERS) ?? BUNDLE_FOLDERS) {
      const [before, after] = await Promise.all([
        git.getFileSizes("refs/remotes/origin/main", [folder]),
        git.getFileSizes(input.headRef, [folder]),
      ]);
      bundleSizes.push({
        folder,
        mainTotal: Object.values(before).reduce((sum, size) => sum + size, 0),
        headTotal: Object.values(after).reduce((sum, size) => sum + size, 0),
      });
    }
    const findings: Finding[] = [
      {
        kind: "metric",
        severity: "info",
        name: "diff.churn",
        value: diff.linesAdded + diff.linesDeleted,
        unit: "lines",
        message: `${filesChanged} files changed, +${diff.linesAdded} -${diff.linesDeleted}`,
      },
      ...foldersToComparisons(bundleSizes),
    ];
    return {
      payload: {
        filesChanged,
        linesAdded: diff.linesAdded,
        linesDeleted: diff.linesDeleted,
        topExtensions: computeTopExtensions(changed, TOP_N),
        topDirectories: computeTopDirectories(changed, TOP_N),
        bundleSizes,
      },
      findings,
      executionStatus: "passed",
    };
  },
};
