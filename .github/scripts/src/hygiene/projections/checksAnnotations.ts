/**
 * @fileoverview Checks API annotations projection.
 * @module github/scripts/src/hygiene/projections/checksAnnotations
 *
 * @remarks
 * Posts LineFindings as Checks API annotations on the head commit.
 * Annotations are batched at 50 per call (GitHub limit).
 */

import {isLineFinding, type Finding, type Severity} from "../domain/types.ts";

export type AnnotationLevel = "notice" | "warning" | "failure";

export interface Annotation {
  readonly path: string;
  readonly start_line: number;
  readonly end_line: number;
  readonly start_column?: number;
  readonly end_column?: number;
  readonly annotation_level: AnnotationLevel;
  readonly message: string;
  readonly title?: string;
  readonly raw_details?: string;
}

function severityToLevel(s: Severity): AnnotationLevel {
  if (s === "error" || s === "critical") return "failure";
  if (s === "warning") return "warning";
  return "notice";
}

export function findingsToAnnotations(findings: readonly Finding[]): Annotation[] {
  const out: Annotation[] = [];
  for (const f of findings) {
    if (!isLineFinding(f)) continue;
    out.push({
      path: f.file,
      start_line: f.line,
      end_line: f.endLine ?? f.line,
      ...(f.column !== undefined ? {start_column: f.column} : {}),
      ...(f.endColumn !== undefined ? {end_column: f.endColumn} : {}),
      annotation_level: severityToLevel(f.severity),
      message: f.message,
      ...(f.ruleId ? {title: f.ruleId} : {}),
    });
  }
  return out;
}

export function batchAnnotations<T>(items: readonly T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

export interface PostAnnotationsDeps {
  readonly checkRunId: number;
  readonly owner: string;
  readonly repo: string;
  update(args: {
    owner: string; repo: string; check_run_id: number;
    output: {title: string; summary: string; annotations: Annotation[]};
  }): Promise<unknown>;
}

export async function postAnnotations(annotations: readonly Annotation[], deps: PostAnnotationsDeps): Promise<void> {
  if (annotations.length === 0) return;
  const batches = batchAnnotations([...annotations], 50);
  for (const batch of batches) {
    await deps.update({
      owner: deps.owner, repo: deps.repo, check_run_id: deps.checkRunId,
      output: {
        title: "Hygiene findings",
        summary: `${annotations.length} annotated finding(s) across ${batches.length} batch(es)`,
        annotations: batch,
      },
    });
  }
}
