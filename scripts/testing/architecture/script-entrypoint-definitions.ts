/**
 * @fileoverview Authoritative inventory of every script entrypoint and its runtime host.
 * @module scripts/testing/architecture/script-entrypoint-definitions
 *
 * @remarks
 * This module is the single source of truth mapping each Commander- or Piscina-hosted script
 * entrypoint to its runtime host kind, role, architecture model, removal cohort, and owning root
 * `package.json#scripts` names.
 * `scripts/testing/architecture/runtime-boundary-policy.test.ts` derives its Commander
 * direct-entrypoint list and its Piscina runtime-boundary exclusions from this inventory instead
 * of maintaining parallel, hand-written lists, and
 * `scripts/testing/architecture/module-structure-policy.test.ts` enforces the architecture-model
 * and removal-cohort invariants.
 */

/** The runtime host that starts a script entrypoint. */
type ScriptEntrypointHostKind = "commander" | "piscina-host" | "piscina-worker";

/** Whether an entrypoint is a user-facing command or an internal worker process. */
type ScriptEntrypointRole = "public-command" | "internal-worker";

/** The command architecture an entrypoint currently runs under. */
type ScriptEntrypointArchitectureModel = "composed-command" | "legacy-command" | "piscina";

/** One authoritative record describing a single script entrypoint. */
interface ScriptEntrypointDefinition {
  /** Forward-slash relative path to the entrypoint's source file. */
  readonly sourcePath: string;
  /** Runtime host that starts this entrypoint. */
  readonly hostKind: ScriptEntrypointHostKind;
  /** Whether this entrypoint is directly user-facing or an internal worker. */
  readonly role: ScriptEntrypointRole;
  /** Command architecture this entrypoint currently runs under. */
  readonly architectureModel: ScriptEntrypointArchitectureModel;
  /**
   * Cohort that removes this entrypoint's non-composed architecture; required on every
   * non-`composed-command` entry and forbidden on a `composed-command` one. Cohort 1 has migrated
   * all three of its pilots, so `1` is no longer carried by any entry.
   */
  readonly removalCohort?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  /** Exported Commander command singleton name, when the entrypoint hosts one. */
  readonly exportedCommandName?: string;
  /** Root `package.json#scripts` names that invoke this entrypoint directly. */
  readonly packageScriptNames: readonly string[];
}

/**
 * The authoritative, exhaustive inventory of every script entrypoint in `scripts/**`.
 *
 * @remarks
 * Every entry's `sourcePath` must exist and be unique, and every `packageScriptNames` entry must
 * be unique across the whole inventory; `scripts/testing/architecture/script-entrypoint-definitions.test.ts`
 * enforces both invariants plus parity with root `package.json#scripts`.
 */
export const scriptEntrypointDefinitions = [
  {
    sourcePath: "scripts/container-runtime/aspire.ts",
    hostKind: "commander",
    role: "public-command",
    architectureModel: "legacy-command",
    removalCohort: 6,
    exportedCommandName: "aspireCommand",
    packageScriptNames: ["dev", "dev:aspire", "dev:aspire:podman", "dev:aspire:rancher"],
  },
  {
    sourcePath: "scripts/container-runtime/compose.ts",
    hostKind: "commander",
    role: "public-command",
    architectureModel: "legacy-command",
    removalCohort: 6,
    exportedCommandName: "composeCommand",
    packageScriptNames: ["containers:compose"],
  },
  {
    sourcePath: "scripts/container-runtime/image.ts",
    hostKind: "commander",
    role: "public-command",
    architectureModel: "legacy-command",
    removalCohort: 6,
    exportedCommandName: "imageCommand",
    packageScriptNames: ["containers:build", "containers:run"],
  },
  {
    sourcePath: "scripts/container-runtime/selfhost.ts",
    hostKind: "commander",
    role: "public-command",
    architectureModel: "legacy-command",
    removalCohort: 6,
    exportedCommandName: "selfhostCommand",
    packageScriptNames: ["dev:selfhost", "dev:selfhost:logs", "dev:selfhost:stop"],
  },
  {
    sourcePath: "scripts/features/documentation/command.ts",
    hostKind: "commander",
    role: "public-command",
    architectureModel: "composed-command",
    exportedCommandName: "documentationCommand",
    packageScriptNames: ["docs:assemble"],
  },
  {
    sourcePath: "scripts/doctor.ts",
    hostKind: "commander",
    role: "public-command",
    architectureModel: "legacy-command",
    removalCohort: 2,
    exportedCommandName: "doctorCommand",
    packageScriptNames: ["doctor"],
  },
  {
    sourcePath: "scripts/generate.artifacts.ts",
    hostKind: "commander",
    role: "public-command",
    architectureModel: "legacy-command",
    removalCohort: 4,
    exportedCommandName: "generateArtifactsCommand",
    packageScriptNames: [],
  },
  {
    sourcePath: "scripts/generate.env.ts",
    hostKind: "commander",
    role: "public-command",
    architectureModel: "legacy-command",
    removalCohort: 4,
    exportedCommandName: "generateEnvironmentCommand",
    packageScriptNames: ["generate:env"],
  },
  {
    sourcePath: "scripts/generate.gql.ts",
    hostKind: "commander",
    role: "public-command",
    architectureModel: "legacy-command",
    removalCohort: 4,
    exportedCommandName: "generateGraphqlCommand",
    packageScriptNames: ["generate:gql"],
  },
  {
    sourcePath: "scripts/generate.i18n.ts",
    hostKind: "commander",
    role: "public-command",
    architectureModel: "legacy-command",
    removalCohort: 4,
    exportedCommandName: "generateI18nCommand",
    packageScriptNames: ["generate:i18n"],
  },
  {
    sourcePath: "scripts/generate.ts",
    hostKind: "commander",
    role: "public-command",
    architectureModel: "legacy-command",
    removalCohort: 4,
    exportedCommandName: "generateCommand",
    packageScriptNames: ["generate", "generate:artifacts"],
  },
  {
    sourcePath: "scripts/setup.ts",
    hostKind: "commander",
    role: "public-command",
    architectureModel: "legacy-command",
    removalCohort: 5,
    exportedCommandName: "setupCommand",
    packageScriptNames: ["setup"],
  },
  {
    sourcePath: "scripts/status.ts",
    hostKind: "commander",
    role: "public-command",
    architectureModel: "legacy-command",
    removalCohort: 3,
    exportedCommandName: "statusCommand",
    packageScriptNames: ["status"],
  },
  {
    sourcePath: "scripts/features/end-to-end/command.ts",
    hostKind: "commander",
    role: "public-command",
    architectureModel: "composed-command",
    exportedCommandName: "endToEndCommand",
    packageScriptNames: ["test:e2e", "test:e2e:backend", "test:e2e:cv", "test:e2e:frontend"],
  },
  {
    sourcePath: "scripts/features/exchange-rates/command.ts",
    hostKind: "commander",
    role: "public-command",
    architectureModel: "composed-command",
    exportedCommandName: "exchangeRateUpdateCommand",
    packageScriptNames: [],
  },
  {
    sourcePath: "scripts/inspection/aggregate-worker.ts",
    hostKind: "commander",
    role: "internal-worker",
    architectureModel: "legacy-command",
    removalCohort: 2,
    exportedCommandName: "aggregateWorkerCommand",
    packageScriptNames: [],
  },
  {
    sourcePath: "scripts/inspection/workspace.worker.ts",
    hostKind: "commander",
    role: "internal-worker",
    architectureModel: "legacy-command",
    removalCohort: 2,
    exportedCommandName: "workspaceWorkerCommand",
    packageScriptNames: [],
  },
  {
    sourcePath: "scripts/format.ts",
    hostKind: "piscina-host",
    role: "public-command",
    architectureModel: "piscina",
    removalCohort: 7,
    packageScriptNames: ["format", "format:api", "format:components", "format:cv", "format:exp", "format:status", "format:website"],
  },
  {
    sourcePath: "scripts/lint.ts",
    hostKind: "piscina-host",
    role: "public-command",
    architectureModel: "piscina",
    removalCohort: 7,
    packageScriptNames: ["lint", "lint:api", "lint:components", "lint:cv", "lint:exp", "lint:status", "lint:website"],
  },
  {
    sourcePath: "scripts/workers/format.worker.ts",
    hostKind: "piscina-worker",
    role: "internal-worker",
    architectureModel: "piscina",
    removalCohort: 7,
    packageScriptNames: [],
  },
  {
    sourcePath: "scripts/workers/lint.worker.ts",
    hostKind: "piscina-worker",
    role: "internal-worker",
    architectureModel: "piscina",
    removalCohort: 7,
    packageScriptNames: [],
  },
] as const satisfies readonly ScriptEntrypointDefinition[];

/**
 * Every entrypoint source path started directly through the declarative Commander command
 * runtime, sorted and deduplicated.
 */
export const commanderEntrypointSourcePaths: readonly string[] = scriptEntrypointDefinitions
  .filter(({hostKind}) => hostKind === "commander")
  .map(({sourcePath}) => sourcePath)
  .toSorted();

/**
 * Every entrypoint source path excluded from the Commander runtime boundary scan because it runs
 * on Piscina (host or worker) instead, sorted and deduplicated.
 */
export const piscinaRuntimeBoundaryExclusionSourcePaths: readonly string[] = scriptEntrypointDefinitions
  .filter(({hostKind}) => hostKind !== "commander")
  .map(({sourcePath}) => sourcePath)
  .toSorted();

/** Additional non-discoverable script source roots tracked outside the recursive file walk. */
export const additionalScriptSourceRootPaths = ["scripts/types/envinfo.d.ts"] as const;

/**
 * The exhaustive, exact inventory of literal relative module references that intentionally leave
 * the `scripts/**` production source graph.
 *
 * @remarks
 * `scripts/testing/architecture/script-source-graph.ts` never silently drops an unresolved
 * relative import: every one it finds must appear here, or the reachability policy in
 * `scripts/testing/architecture/orphan-modules.test.ts` fails. The sole current entry is the lint
 * worker's reference to the repository root ESLint configuration; Cohort 7 owns its removal.
 */
export const temporaryExternalScriptModuleReferenceDefinitions = [
  {
    sourcePath: "scripts/workers/lint.worker.ts",
    specifier: "../../eslint.config.ts",
    removalCohort: 7,
  },
] as const;
