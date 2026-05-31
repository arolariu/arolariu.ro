/**
 * @fileoverview JSON artifact projection.
 * @module github/scripts/src/hygiene/projections/jsonArtifact
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import type {HygieneReport} from "../domain/types.ts";

export async function writeJsonArtifact(report: HygieneReport, workspaceRoot: string): Promise<string> {
  const dir = path.join(workspaceRoot, "artifacts", "hygiene");
  await fs.mkdir(dir, {recursive: true});
  const file = path.join(dir, "hygiene-report.json");
  await fs.writeFile(file, JSON.stringify(report, null, 2), "utf-8");
  return file;
}
