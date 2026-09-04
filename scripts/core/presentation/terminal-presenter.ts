/**
 * @fileoverview Engine-neutral terminal presentation contracts for monorepository scripts.
 * @module scripts/core/presentation/terminal-presenter
 *
 * @remarks
 * This module owns the vocabulary of terminal presentation and nothing else. It never applies
 * ANSI styling, selects a host output method, reads terminal or environment state, or schedules a
 * timer: a host supplies all of that through {@link TerminalPresenterSink} and
 * {@link TerminalPresenterRuntimeHost}.
 */

import type {CommandPresentationMode} from "../command/command-execution.ts";

/** Identifies the process stream that receives presenter output. */
export type PresentationStream = "stdout" | "stderr";

/** Styles supported by presentation segments. */
export type PresentationStyle = "bold" | "dim" | "gray" | "red" | "green" | "yellow" | "blue" | "cyan" | "magenta" | "white" | "bgRed";

/** Semantic level a host sink maps onto its own diagnostic output selection. */
export type PresentationSemanticLevel = "debug" | "info" | "warn" | "error" | "success";

/** Defines one optionally styled segment of presentation output. */
export interface PresentationSegment {
  /** Segment text. */
  readonly text: string;
  /** Styles applied in declaration order when the host is allowed to emit styling. */
  readonly styles?: readonly PresentationStyle[];
}

/** Defines a plain-text table rendered by a presenter. */
export interface PresentationTable {
  /** Optional table headings. */
  readonly headers?: readonly string[];
  /** Table body rows. */
  readonly rows: readonly (readonly string[])[];
  /** Optional alignment for each column. */
  readonly align?: readonly ("left" | "right")[];
}

/** Redacts and forwards one logical stream across arbitrary chunk boundaries. */
export interface PresentationStreamWriter {
  /** Writes the next decoded stream chunk. */
  readonly write: (chunk: string) => void;
  /** Flushes the final buffered stream tail. */
  readonly end: () => void;
}

/** Handle to one repeating callback scheduled through a {@link TerminalPresenterRuntimeHost}. */
export interface PresentationScheduledInterval {
  /** Stops the repeating callback. */
  readonly cancel: () => void;
  /** Releases the host's hold on the event loop for this interval. */
  readonly unref: () => void;
}

/** Controls an active progress line. */
export interface ProgressReporter {
  /** Replaces the current progress message. */
  readonly update: (message: string) => void;
  /** Stops progress and emits a successful final message. */
  readonly succeed: (message: string) => void;
  /** Stops progress and emits a failed final message. */
  readonly fail: (message: string) => void;
  /** Stops progress without a final message. */
  readonly stop: () => void;
}

/**
 * Receives fully composed, already-redacted presenter output.
 *
 * @remarks
 * `level` is supplied only for semantic lines so a host sink can preserve its diagnostic output
 * selection. A segment carries `styles` only when the presenter allows styling, so a sink never
 * has to re-derive colour policy.
 */
export interface TerminalPresenterSink {
  /** Writes one complete line without a caller-supplied newline. */
  readonly line: (stream: PresentationStream, segments: readonly PresentationSegment[], level?: PresentationSemanticLevel) => void;
  /** Writes an incomplete or raw output chunk. */
  readonly write: (stream: PresentationStream, segments: readonly PresentationSegment[]) => void;
}

/**
 * Engine-neutral terminal policy and timer scheduling supplied to a presenter.
 *
 * @remarks
 * The Node terminal adapter owns the only implementation that reads real TTY state, `NO_COLOR`,
 * and native timers; tests inject a deterministic host instead.
 */
export interface TerminalPresenterRuntimeHost {
  /** Whether standard output is attached to an interactive terminal. */
  readonly stdoutIsTTY: boolean;
  /** Whether the host requests colorless output. */
  readonly noColor: boolean;
  /** Schedules a repeating callback and returns its cancellation handle. */
  readonly scheduleInterval: (callback: () => void, intervalMs: number) => PresentationScheduledInterval;
}

/** Independent output scope requested for one forked command invocation. */
export interface TerminalPresenterScopeOptions {
  /** Output mode the forked presenter uses. */
  readonly mode: CommandPresentationMode;
  /** Whether the forked presenter emits diagnostic messages. */
  readonly verbose: boolean;
}

/** Configures a composed terminal presenter. */
export interface TerminalPresenterOptions {
  /** Output mode. Defaults to `"human"`. */
  readonly mode?: CommandPresentationMode;
  /** Whether diagnostic messages are emitted. Defaults to `true`. */
  readonly verbose?: boolean;
  /** Whether styling may be emitted when the output stream is an interactive terminal. */
  readonly color?: boolean;
  /**
   * Required output destination; core never selects a platform sink implicitly. Production callers
   * inject `NodeTerminalPresenterSink` and tests inject `RecordingTerminalPresenterSink`, so this
   * is the compile-time guard against a silently discarded production presenter.
   */
  readonly sink: TerminalPresenterSink;
  /** Sensitive literal values replaced before output reaches the sink. */
  readonly redactions?: readonly string[];
  /**
   * Terminal policy and timer scheduling supplied by the runtime. When omitted, the presenter uses
   * a deterministic non-interactive, colorless, no-interval host, so it emits no spinner frame, no
   * styling, and schedules nothing. The presenter never reads ambient terminal, environment, or
   * timer state itself.
   */
  readonly runtimeHost?: TerminalPresenterRuntimeHost;
}

/**
 * Defines semantic and presentation terminal output for monorepository automation.
 */
export abstract class TerminalPresenter {
  /** Writes diagnostic detail useful while troubleshooting. */
  public abstract debug(message: string): void;

  /** Writes normal lifecycle information. */
  public abstract info(message: string): void;

  /** Writes a recoverable or intentionally deferred condition. */
  public abstract warn(message: string): void;

  /** Writes a failed operation before its error propagates. */
  public abstract error(message: string): void;

  /**
   * Writes the single terminal diagnostic that explains why an invocation failed. Human mode
   * renders the normal error form, JSON mode writes exactly one plain redacted line to standard
   * error so no partial success document is produced, and silent mode writes nothing.
   */
  public abstract fatal(message: string): void;

  /** Writes successful lifecycle completion. */
  public abstract success(message: string): void;

  /** Redacts sensitive values without emitting output. */
  public abstract sanitize(text: string, includeJsonEscapes?: boolean): string;

  /** Creates a presenter whose context is appended to this presenter's context. */
  public abstract child(context: string): TerminalPresenter;

  /**
   * Creates an independent invocation presenter with its own mode, verbosity, progress, and
   * single-JSON-document state, while sharing this presenter's sink, colour policy, and redactions.
   */
  public abstract fork(context: string, options: Readonly<TerminalPresenterScopeOptions>): TerminalPresenter;

  /** Registers a sensitive literal value for replacement before output. */
  public abstract redact(value: string): void;

  /** Writes a complete human-oriented presentation line. */
  public abstract line(segments?: string | readonly PresentationSegment[], stream?: PresentationStream): void;

  /** Writes an incomplete or raw human-oriented output chunk. */
  public abstract write(segments: string | readonly PresentationSegment[], stream?: PresentationStream): void;

  /** Creates a stateful raw writer that preserves redaction across chunk boundaries. */
  public abstract createStreamWriter(stream?: PresentationStream): PresentationStreamWriter;

  /** Writes a visually separated section heading. */
  public abstract section(title: string, icon?: string): void;

  /** Writes a sequence of banner lines. */
  public abstract banner(lines: readonly string[], style?: PresentationStyle): void;

  /** Writes an aligned plain-text table. */
  public abstract table(table: Readonly<PresentationTable>): void;

  /** Writes a shell-style command echo. */
  public abstract command(command: string): void;

  /** Writes one machine-readable JSON document. */
  public abstract json(value: unknown): void;

  /** Starts a terminal-aware progress reporter. */
  public abstract progress(message: string): ProgressReporter;
}
