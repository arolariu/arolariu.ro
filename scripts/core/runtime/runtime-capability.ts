/**
 * @fileoverview Names of every capability a lazy core workflow module may declare and depend on.
 * @module scripts/core/runtime/runtime-capability
 *
 * @remarks
 * This module intentionally contains only the capability-name union in this task. Task 3 extends
 * it with the capability facet interfaces and their service contracts once the runtime contracts
 * move fully into `scripts/core/runtime/`. Repository inspection is deliberately absent: it is
 * not a core capability, it is the inspection-owned composition seam in
 * `scripts/inspection/runtime-capability.ts`.
 */

/** The exact core capability names a workflow module may declare. */
export const runtimeCapabilityNames = [
  "presenter",
  "prompts",
  "runner",
  "http",
  "files",
  "clock",
  "tasks",
  "environment",
  "signal",
  "cleanup",
] as const;

/** One of the exact core capability names a workflow module may declare. */
export type RuntimeCapabilityName = (typeof runtimeCapabilityNames)[number];
