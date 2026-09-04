/**
 * @fileoverview Public script-command behavior evidence inventory and known compatibility gaps.
 * @module scripts/testing/compatibility/public-command-contracts
 */

/**
 * A single explicitly accepted compatibility gap that remains scheduled for a later cohort.
 */
interface PublicCommandCharacterizationGapDefinition {
  /** The public behavior that still lacks counted characterization evidence. */
  readonly missingBehavior: string;
  /** The implementation cohort that owns the remaining characterization work. */
  readonly scheduledCohort: 7;
}

/**
 * Behavior evidence mapped to one public script entrypoint.
 */
export interface PublicCommandBehaviorEvidenceDefinition {
  /** Forward-slash relative path to the public script entrypoint source file. */
  readonly sourcePath: string;
  /** Existing focused test files that already characterize this command's public behavior. */
  readonly behaviorTestPaths: readonly string[];
  /** Explicitly accepted remaining characterization gaps for this command. */
  readonly characterizationGaps: readonly PublicCommandCharacterizationGapDefinition[];
}

/**
 * Authoritative compatibility evidence for every public script command entrypoint.
 */
export const publicCommandBehaviorEvidenceDefinitions = [
  {
    sourcePath: "scripts/container-runtime/aspire.ts",
    behaviorTestPaths: ["scripts/container-runtime/aspire.test.ts"],
    characterizationGaps: [],
  },
  {
    sourcePath: "scripts/container-runtime/compose.ts",
    behaviorTestPaths: ["scripts/container-runtime/compose.test.ts"],
    characterizationGaps: [],
  },
  {
    sourcePath: "scripts/container-runtime/image.ts",
    behaviorTestPaths: ["scripts/container-runtime/image.test.ts"],
    characterizationGaps: [],
  },
  {
    sourcePath: "scripts/container-runtime/selfhost.ts",
    behaviorTestPaths: [
      "scripts/container-runtime/selfhost.test.ts",
      "scripts/container-runtime/selfhost.bootstrap.test.ts",
      "scripts/container-runtime/selfhost.redaction.test.ts",
    ],
    characterizationGaps: [],
  },
  {
    sourcePath: "scripts/features/documentation/command.ts",
    behaviorTestPaths: [
      "scripts/features/documentation/command.test.ts",
      "scripts/features/documentation/workflow.test.ts",
      "scripts/features/documentation/normalize.test.ts",
    ],
    characterizationGaps: [],
  },
  {
    sourcePath: "scripts/doctor.ts",
    behaviorTestPaths: [
      "scripts/doctor.test.ts",
      "scripts/doctor.diagnostics.test.ts",
      "scripts/doctor.dotnet.test.ts",
      "scripts/doctor.infrastructure.test.ts",
      "scripts/doctor.python.test.ts",
      "scripts/doctor.react.test.ts",
      "scripts/doctor.readonly.test.ts",
      "scripts/doctor.reporter.test.ts",
      "scripts/doctor.svelte.test.ts",
      "scripts/doctor.workspace.test.ts",
    ],
    characterizationGaps: [],
  },
  {
    sourcePath: "scripts/generate.artifacts.ts",
    behaviorTestPaths: ["scripts/generate.artifacts.test.ts"],
    characterizationGaps: [],
  },
  {
    sourcePath: "scripts/generate.env.ts",
    behaviorTestPaths: ["scripts/generate.env.test.ts"],
    characterizationGaps: [],
  },
  {
    sourcePath: "scripts/generate.gql.ts",
    behaviorTestPaths: ["scripts/generate.artifacts.test.ts", "scripts/generate.cli.test.ts"],
    characterizationGaps: [],
  },
  {
    sourcePath: "scripts/generate.i18n.ts",
    behaviorTestPaths: ["scripts/generate.i18n.test.ts"],
    characterizationGaps: [],
  },
  {
    sourcePath: "scripts/generate.ts",
    behaviorTestPaths: ["scripts/generate.cli.test.ts", "scripts/generate.artifacts.test.ts"],
    characterizationGaps: [],
  },
  {
    sourcePath: "scripts/setup.ts",
    behaviorTestPaths: [
      "scripts/setup.test.ts",
      "scripts/setup.dotnet.test.ts",
      "scripts/setup.infrastructure.test.ts",
      "scripts/setup.python.test.ts",
      "scripts/setup.react.test.ts",
      "scripts/setup.svelte.test.ts",
      "scripts/setup.workspace.test.ts",
    ],
    characterizationGaps: [],
  },
  {
    sourcePath: "scripts/status.ts",
    behaviorTestPaths: ["scripts/status.test.ts"],
    characterizationGaps: [],
  },
  {
    sourcePath: "scripts/test-e2e.ts",
    behaviorTestPaths: ["scripts/test-e2e.test.ts"],
    characterizationGaps: [],
  },
  {
    sourcePath: "scripts/update-exchange-rates.ts",
    behaviorTestPaths: ["scripts/update-exchange-rates.test.ts"],
    characterizationGaps: [],
  },
  {
    sourcePath: "scripts/format.ts",
    behaviorTestPaths: ["scripts/workers/shell.test.ts"],
    characterizationGaps: [
      {
        missingBehavior:
          "Format Piscina host target decoding, task planning, worker aggregation, presentation, and direct-entry exit behavior",
        scheduledCohort: 7,
      },
    ],
  },
  {
    sourcePath: "scripts/lint.ts",
    behaviorTestPaths: ["scripts/workers/lint.worker.test.ts", "scripts/workers/shell.test.ts"],
    characterizationGaps: [
      {
        missingBehavior:
          "Lint Piscina host target decoding, task planning, worker aggregation, presentation, and direct-entry exit behavior",
        scheduledCohort: 7,
      },
    ],
  },
] as const satisfies readonly PublicCommandBehaviorEvidenceDefinition[];
