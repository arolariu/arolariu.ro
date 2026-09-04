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
 * Cohort 1 high-water ceiling: raised from 76,375 to 76,750 by Task 6 plan-owner ruling, then
 * amended to 77,000 by Task 7 plan-owner ruling after an audit found neither 76,125 nor 76,750
 * attainable. Task 9 freezes {@link cohortOneMaximumMaintainedLineCount} at this value: the
 * original 75,750 target was disproven when Task 8's 486-line allowance could not fit its ~974
 * mandated business-test lines. No later Cohort 1 task may raise this value again.
 */
export const cohortOneHighWaterMaintainedLineCount = 77_000;

/**
 * The frozen Cohort 1 ceiling. Cohort 1 execution is complete; only a later cohort may lower this
 * value, and no task may raise it, satisfying
 * `cohortOneMaximumMaintainedLineCount <= cohortOneHighWaterMaintainedLineCount`. The final
 * program target remains `approvedScriptsArchitectureBaseline.finalMaximumMaintainedLineCount`.
 */
export const cohortOneMaximumMaintainedLineCount = 77_000;
