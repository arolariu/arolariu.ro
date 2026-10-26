/**
 * @fileoverview JSON artifact projection.
 * @module github/scripts/src/hygiene/projections/jsonArtifact
 */

import {fs} from "../../../helpers/filesystem/index.ts";
import * as path from "node:path";
import type {HygieneReport} from "../domain/types.ts";

export async function writeJsonArtifact(report: HygieneReport, workspaceRoot: string): Promise<string> {
  const dir = path.join(workspaceRoot, "artifacts", "hygiene");
  const file = path.join(dir, "hygiene-report.json");
  await fs.writeJsonAtomic(file, report);
  return file;
}
