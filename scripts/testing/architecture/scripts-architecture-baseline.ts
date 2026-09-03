/**
 * @fileoverview Immutable, user-approved facts about the maintained `scripts/**` architecture.
 * @module scripts/testing/architecture/scripts-architecture-baseline
 *
 * @remarks
 * Every value here was captured at commit `11773ff3d` and approved as the Cohort 0 evidence
 * baseline. No later cohort task may edit these facts; they exist so
 * `scripts/testing/architecture/maintained-source-lines.ts` and its reporter can compare the
 * current tree and Git history against a single frozen source of truth instead of hand-copied
 * constants scattered across tests.
 */

/** Shape of the frozen, user-approved Cohort 0 architecture baseline. */
interface ScriptsArchitectureBaselineDefinition {
  /** The commit at which every other field in this baseline was measured. */
  readonly commit: string;
  /** Total maintained `scripts/**` source file count at the baseline commit. */
  readonly sourceFileCount: number;
  /** Total maintained `scripts/**` line count at the baseline commit. */
  readonly maintainedLineCount: number;
  /** Production-only subset of `maintainedLineCount`. */
  readonly productionMaintainedLineCount: number;
  /** Test-support subset of `maintainedLineCount`. */
  readonly testSupportMaintainedLineCount: number;
  /** The final, hard maintained-line ceiling approved for the completed cohort program. */
  readonly finalMaximumMaintainedLineCount: number;
  /** Total Commander-hosted entrypoint count at the baseline commit. */
  readonly commanderEntrypointCount: number;
  /** Total command ceremony (registration/wiring) line count at the baseline commit. */
  readonly commandCeremonyLineCount: number;
  /** Median empty Node.js process start time, in milliseconds, at the baseline commit. */
  readonly emptyNodeMedianMilliseconds: number;
  /** Approved median `--help` latency range, in milliseconds, for a normal command. */
  readonly normalHelpMedianRangeMilliseconds: readonly [minimum: number, maximum: number];
  /** Median `--help` latency, in milliseconds, for the heavier selfhost command. */
  readonly selfhostHelpMedianMilliseconds: number;
  /** Approved per-entrypoint runtime source-graph line counts for the heaviest entrypoints. */
  readonly runtimeGraphLineCounts: Readonly<Record<string, number>>;
}

/**
 * The frozen Cohort 0 evidence baseline, approved by the user at commit `11773ff3d`.
 *
 * @remarks
 * These numbers are immutable historical facts, not live measurements; only
 * `scripts/testing/architecture/maintained-source-lines.ts` compares them against the current
 * tree and committed Git history.
 */
export const approvedScriptsArchitectureBaseline = {
  commit: "11773ff3d",
  sourceFileCount: 142,
  maintainedLineCount: 73_377,
  productionMaintainedLineCount: 37_126,
  testSupportMaintainedLineCount: 36_251,
  finalMaximumMaintainedLineCount: 55_032,
  commanderEntrypointCount: 17,
  commandCeremonyLineCount: 623,
  emptyNodeMedianMilliseconds: 134,
  normalHelpMedianRangeMilliseconds: [498, 607],
  selfhostHelpMedianMilliseconds: 1_087,
  runtimeGraphLineCounts: {
    "scripts/status.ts": 19_134,
    "scripts/setup.ts": 13_952,
    "scripts/doctor.ts": 9_094,
    "scripts/container-runtime/selfhost.ts": 6_663,
    "scripts/container-runtime/image.ts": 6_122,
    "scripts/generate.ts": 5_929,
  },
} as const satisfies ScriptsArchitectureBaselineDefinition;

/**
 * Temporary preparatory ceiling, including counted public-compatibility
 * evidence, architecture parsers, and required source documentation. Cohort 1
 * must replace this with a lower observed ceiling; execution may not raise it,
 * and the final cohort sets the hard 55,032-line target.
 */
export const cohortZeroMaximumMaintainedLineCount = 75_500;
