/**
 * @fileoverview Documentation assembly orchestration: the feature runtime context, its typed
 * failures, and the workflow module `docs-assemble` loads lazily. It runs the three extractor
 * families concurrently, validates the required tiers, normalizes frontmatter, writes per-tier
 * landing pages, and mirrors `/docs/` prose into `docs/monorepo/`; the HTTP API reference is
 * intentionally excluded because `api.arolariu.ro` already hosts Swagger UI from the live spec.
 *
 * Each run first cleans `sites/docs.arolariu.ro/_generated/`, so CI behaves like a fresh clone, and
 * that staging tree stays invocation-transient: the cleanup callback registered right after it is
 * created removes it again on any failure or cancellation, and is unregistered only once tier
 * validation, normalization, landing pages, and prose mirroring have all succeeded. Every
 * filesystem, process, and concurrency concern flows through the narrowed
 * {@link DocumentationRuntimeExecutionContext} rather than `node:fs`, a bespoke runner, or
 * `Promise.all`.
 * @module scripts/features/documentation/workflow
 */

import {join} from "node:path";

import {resolveRepositoryPaths} from "../../common/repository-paths.ts";
import {CommandCancellation} from "../../core/runtime/cancellation.ts";
import type {
  BaseWorkflowRuntimeExecutionContext,
  FileSystem,
  FilesystemRuntimeCapability,
  ProcessRuntimeCapability,
  TaskRuntimeCapability,
} from "../../core/runtime/runtime-capability.ts";
import {defineWorkflowModule, type CommandWorkflowModuleDefinition} from "../../core/workflow/workflow-composition.ts";
import {failedWorkflowExecution, succeededWorkflowExecution} from "../../core/workflow/workflow-execution-result.ts";
import type {WorkflowSpecification} from "../../core/workflow/workflow-specification.ts";
import {
  assertExpectedDocumentationTiers,
  DocumentationTierError,
  generatedDocumentationTierIdentities,
  syncProse,
  writeDocumentationLandingPages,
} from "./assembly.ts";
import {runDotnetInternals, runPydocMarkdown, runTypedoc} from "./extractors.ts";
import type {DocumentationAssemblyInput} from "./input.ts";
import {normalizeDirectory} from "./normalize.ts";

/**
 * The exact capability subset one documentation assembly invocation observes: the base workflow
 * scope plus a filesystem, a process runner, and the task scheduler.
 */
export type DocumentationRuntimeExecutionContext = Readonly<
  BaseWorkflowRuntimeExecutionContext & FilesystemRuntimeCapability & ProcessRuntimeCapability & TaskRuntimeCapability
>;

/** The extractor families this feature dispatches, in dispatch order. */
type DocumentationExtractorName = "typedoc" | "pydoc-markdown" | "defaultdocumentation";

/** The assembly steps that run after every required tier is validated. */
type DocumentationAssemblyStep = "normalize" | "landing-pages" | "prose-mirror";

/** Every typed way one documentation assembly invocation can fail. */
export type DocumentationAssemblyFailure =
  | {readonly kind: "extractor-failed"; readonly extractor: DocumentationExtractorName; readonly cause: unknown}
  | {readonly kind: "tier-missing"; readonly tierLabel: string; readonly tierPath: string; readonly cause: unknown}
  | {readonly kind: "assembly-step-failed"; readonly step: DocumentationAssemblyStep; readonly cause: unknown};

/** Typed business result produced by one documentation assembly invocation. */
export interface DocumentationAssemblyResult {
  /**
   * The ordered, platform-stable identity of every required tier that was validated, normalized,
   * and given a landing page: always `["ts-reference/components", "ts-reference/website",
   * "experimental", "dotnet-internals"]`.
   */
  readonly generatedTiers: readonly string[];
  /** Number of extractor families run concurrently: always `3`. */
  readonly extractorCount: number;
}

/** Wraps whatever one extractor family rejected with, so the family stays attributable. */
class DocumentationExtractorError extends Error {
  /** The extractor family that rejected. */
  public readonly extractor: DocumentationExtractorName;

  public constructor(extractor: DocumentationExtractorName, cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause), {cause});
    this.name = "DocumentationExtractorError";
    this.extractor = extractor;
  }
}

/** Wraps whatever one post-validation assembly step threw, so the step stays attributable. */
class DocumentationAssemblyStepError extends Error {
  /** The assembly step that failed. */
  public readonly step: DocumentationAssemblyStep;

  public constructor(step: DocumentationAssemblyStep, cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause), {cause});
    this.name = "DocumentationAssemblyStepError";
    this.step = step;
  }
}

/** Runs one assembly step, attributing its failure while letting cancellation propagate unchanged. */
async function runAssemblyStep(step: DocumentationAssemblyStep, run: () => Promise<void>): Promise<void> {
  try {
    await run();
  } catch (error: unknown) {
    if (error instanceof CommandCancellation) throw error;
    throw new DocumentationAssemblyStepError(step, error);
  }
}

/** Resolves every absolute path one invocation needs from the verified repository root. */
async function resolveDocumentationPaths(files: FileSystem) {
  const paths = await resolveRepositoryPaths(import.meta.url, files);
  const generatedRoot = join(paths.docsRoot, "_generated");
  return {
    repositoryRoot: paths.root,
    apiRoot: paths.apiRoot,
    expRoot: paths.expRoot,
    generatedRoot,
    tsReferenceDirectory: join(generatedRoot, "ts-reference"),
    pythonDirectory: join(generatedRoot, "experimental"),
    dotnetInternalsDirectory: join(generatedRoot, "dotnet-internals"),
    proseSource: join(paths.root, "docs"),
    proseDestination: join(paths.docsRoot, "docs", "monorepo"),
  } as const;
}

/**
 * Runs the full pipeline against the narrowed feature `context`.
 *
 * @returns The ordered generated tiers and the number of extractor families that ran.
 */
async function assembleDocumentation(context: DocumentationRuntimeExecutionContext): Promise<DocumentationAssemblyResult> {
  const {files, runner, tasks, cleanup, signal} = context;
  const paths = await resolveDocumentationPaths(files);

  await files.remove(paths.generatedRoot, {recursive: true, force: true});
  await files.createDirectory(paths.generatedRoot, {recursive: true});
  const unregisterGeneratedCleanup = cleanup.register("generated documentation tree", () =>
    files.remove(paths.generatedRoot, {recursive: true, force: true}),
  );

  const extractorFamilies = [
    {extractor: "typedoc", run: () => runTypedoc(runner, files, paths.repositoryRoot, paths.tsReferenceDirectory, signal)},
    {extractor: "pydoc-markdown", run: () => runPydocMarkdown(runner, files, paths.expRoot, paths.pythonDirectory, signal)},
    {
      extractor: "defaultdocumentation",
      run: () => runDotnetInternals(runner, files, paths.apiRoot, paths.dotnetInternalsDirectory, signal),
    },
  ] as const satisfies readonly {readonly extractor: DocumentationExtractorName; readonly run: () => Promise<void>}[];

  // `allSettled` (not `parallel`) is required: every family must finish — success or failure —
  // before this workflow decides. Bailing out on the first rejection while a sibling extractor is
  // still writing into `_generated` would let it recreate content after the failure cleanup already
  // removed the tree, violating the "no partial `_generated` tree survives a failure" contract.
  const outcomes = await tasks.allSettled(
    extractorFamilies.map(({run}) => run),
    signal,
  );
  for (const [index, family] of extractorFamilies.entries()) {
    const outcome = outcomes[index];
    if (outcome?.status !== "rejected") continue;
    const {reason}: {readonly reason: unknown} = outcome;
    if (reason instanceof CommandCancellation) throw reason;
    throw new DocumentationExtractorError(family.extractor, reason);
  }

  // Validate before normalization and synthetic landing pages can obscure a missing-tier failure.
  await assertExpectedDocumentationTiers(files, paths.generatedRoot);
  await runAssemblyStep("normalize", async () => {
    await normalizeDirectory(files, paths.tsReferenceDirectory);
    await normalizeDirectory(files, paths.pythonDirectory);
    await normalizeDirectory(files, paths.dotnetInternalsDirectory);
  });
  await runAssemblyStep("landing-pages", () => writeDocumentationLandingPages(files, paths));
  await runAssemblyStep("prose-mirror", () => syncProse(files, paths.proseSource, paths.proseDestination));

  unregisterGeneratedCleanup();
  return {generatedTiers: generatedDocumentationTierIdentities, extractorCount: extractorFamilies.length};
}

const documentationAssemblySpecification: WorkflowSpecification<
  DocumentationRuntimeExecutionContext,
  DocumentationAssemblyResult,
  DocumentationAssemblyFailure
> = {
  name: "docs-assemble",
  execute: async (context) => succeededWorkflowExecution(await assembleDocumentation(context)),
  classifyUnexpectedFault: (error) => {
    if (error instanceof DocumentationExtractorError) {
      return failedWorkflowExecution({kind: "extractor-failed", extractor: error.extractor, cause: error.cause});
    }
    if (error instanceof DocumentationTierError) {
      return failedWorkflowExecution({kind: "tier-missing", tierLabel: error.tierLabel, tierPath: error.tierPath, cause: error});
    }
    if (error instanceof DocumentationAssemblyStepError) {
      return failedWorkflowExecution({kind: "assembly-step-failed", step: error.step, cause: error.cause});
    }
    return undefined;
  },
};

/** The lazily loaded workflow module `scripts/features/documentation/command.ts` runs. */
export const documentationAssemblyWorkflowModule: CommandWorkflowModuleDefinition<
  DocumentationAssemblyInput,
  DocumentationAssemblyResult,
  DocumentationAssemblyFailure,
  DocumentationRuntimeExecutionContext
> = defineWorkflowModule<
  DocumentationAssemblyInput,
  DocumentationAssemblyResult,
  DocumentationAssemblyFailure,
  DocumentationRuntimeExecutionContext
>({
  specification: documentationAssemblySpecification,
  runtimeCapabilities: ["presenter", "signal", "cleanup", "files", "runner", "tasks"],
  createContext: (_input, context) => {
    const {presenter, signal, cleanup, files, runner, tasks} = context.runtime;
    return {presenter, signal, cleanup, files, runner, tasks};
  },
});
