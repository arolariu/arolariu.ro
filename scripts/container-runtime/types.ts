/**
 * @fileoverview Shared types for local container runtime tooling.
 * @module scripts/container-runtime/types
 */

/** Supported local container engines for this repository. */
export type ContainerEngine = "rancher" | "podman";

/** Indicates where the selected container engine was configured. */
export type EngineSelectionSource = "argument" | "environment" | "configuration";

/** Resolved local container engine selection. */
export interface ContainerEngineSelection {
  readonly engine: ContainerEngine;
  readonly source: EngineSelectionSource;
}

/** Inputs used to resolve a local container engine selection. */
export interface SelectionInputs {
  readonly argv: readonly string[];
  readonly env: Readonly<NodeJS.ProcessEnv>;
  readonly configuredEngine?: string;
}

/** Error raised when local container runtime configuration is invalid. */
export class ContainerRuntimeError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ContainerRuntimeError";
  }
}

/** Shared shape of every declarative container command's typed input: an optional engine override. */
export interface ContainerEngineInput {
  /** Explicit engine override; omitted values fall back to environment or persisted configuration. */
  readonly engine?: ContainerEngine;
}

/** Typed input accepted by the declarative Compose command. */
export interface ComposeInput extends ContainerEngineInput {
  /** Compose file to invoke. */
  readonly file: string;
  /** Every argument following the literal `--` delimiter, forwarded to Compose unchanged. */
  readonly passthrough: readonly string[];
}

/** Local image action the declarative Image command accepts. */
export type ImageAction = "build" | "run";

/** Local image target the declarative Image command accepts. */
export type ImageTarget = "frontend" | "backend" | "cv" | "exp";

/** Typed input accepted by the declarative Image command. */
export interface ImageInput extends ContainerEngineInput {
  /** Selected image action. */
  readonly action: ImageAction;
  /** Selected image target. */
  readonly target: ImageTarget;
}

/** Supported selfhost orchestration actions. */
export type SelfhostAction = "start" | "stop" | "logs";

/** Typed input accepted by the declarative Selfhost command. */
export interface SelfhostInput {
  /** Selected selfhost action; the CLI defaults the optional argument to `start`. */
  readonly action: SelfhostAction;
  /** Explicit engine override; omitted values fall back to environment or persisted configuration. */
  readonly engine?: ContainerEngine;
}

/**
 * One local stack an invocation of the Selfhost command operated on.
 *
 * @remarks
 * `profile` is the `selfhost`-profile service inside the Storage stack (`exp-arolariu-ro`), which
 * the start action brings up through `--profile selfhost` and the logs action tails directly.
 */
export type SelfhostStack = "management" | "storage" | "profile" | "backend" | "frontend";

/** Typed business result produced by the declarative Aspire command. */
export interface AspireResult {
  /** Container engine Aspire AppHost ran with. */
  readonly engine: ContainerEngine;
}

/** Typed business result produced by the declarative Compose command. */
export interface ComposeResult {
  /** Container engine Compose ran with. */
  readonly engine: ContainerEngine;
  /** Compose file that was invoked. */
  readonly file: string;
  /** Every pass-through argument forwarded to Compose. */
  readonly passthrough: readonly string[];
}

/** Typed business result produced by the declarative Image command. */
export interface ImageResult {
  /** Container engine the image action ran with. */
  readonly engine: ContainerEngine;
  /** Image action that ran. */
  readonly action: ImageAction;
  /** Image target that ran. */
  readonly target: ImageTarget;
}

/** Typed business result produced by the declarative Selfhost command. */
export interface SelfhostResult {
  /** Selfhost action that ran. */
  readonly action: SelfhostAction;
  /** Container engine the selfhost action ran with. */
  readonly engine: ContainerEngine;
  /** Local stacks this invocation operated on, in execution order. */
  readonly stacks: readonly SelfhostStack[];
}
