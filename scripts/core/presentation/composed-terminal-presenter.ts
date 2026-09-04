/**
 * @fileoverview Mode, redaction, layout, and document state for composed terminal output.
 * @module scripts/core/presentation/composed-terminal-presenter
 *
 * @remarks
 * This module decides *what* is emitted: mode and verbosity gating, the stable
 * `[arolariu::<context>]` prefix, icons, table layout, the redaction registry, its stream-safe
 * writer, and the single-JSON-document slot. It never decides *how* bytes reach a terminal, so it
 * holds no styling, no host output selection, no stream handle, and no timer. Progress mechanics
 * live in `terminal-progress.ts` and the two redaction algorithms live in `terminal-redaction.ts`,
 * so every presentation module stays inside the 500-line budget.
 */

import {
  TerminalPresenter,
  type PresentationScheduledInterval,
  type PresentationSegment,
  type PresentationSemanticLevel,
  type PresentationStream,
  type PresentationStreamWriter,
  type PresentationStyle,
  type PresentationTable,
  type ProgressReporter,
  type TerminalPresenterOptions,
  type TerminalPresenterRuntimeHost,
  type TerminalPresenterScopeOptions,
  type TerminalPresenterSink,
} from "./terminal-presenter.ts";
import {createTerminalProgress, type TerminalProgressSlot} from "./terminal-progress.ts";
import {findStreamingRedactionBoundary, redactText} from "./terminal-redaction.ts";
import type {CommandPresentationMode} from "../command/command-execution.ts";

/**
 * Deterministic {@link TerminalPresenterRuntimeHost} used when no host is injected.
 *
 * @remarks
 * Library-only and test construction must never depend on ambient terminal state, `NO_COLOR`, or
 * native timers, so the omitted host reports a non-interactive, colorless terminal and schedules
 * nothing. Every production presenter receives the Node terminal host instead.
 */
const inertTerminalPresenterRuntimeHost: TerminalPresenterRuntimeHost = {
  stdoutIsTTY: false,
  noColor: true,
  scheduleInterval: (): PresentationScheduledInterval => ({
    cancel: (): void => undefined,
    unref: (): void => undefined,
  }),
};

/** Output configuration and mutable presentation state shared by one presenter tree. */
interface ComposedTerminalPresenterState extends TerminalProgressSlot {
  readonly mode: CommandPresentationMode;
  readonly verbose: boolean;
  readonly color: boolean;
  readonly colorAllowed: boolean;
  readonly tty: boolean;
  readonly sink: TerminalPresenterSink;
  readonly runtimeHost: TerminalPresenterRuntimeHost;
  readonly redactions: Set<string>;
  jsonDocumentWritten: boolean;
}

const COMPOSED_TERMINAL_PRESENTER_STATE = Symbol("composedTerminalPresenterState");

type InternalTerminalPresenterOptions = Readonly<TerminalPresenterOptions> & {
  readonly [COMPOSED_TERMINAL_PRESENTER_STATE]?: ComposedTerminalPresenterState;
};

/**
 * Composes sink-backed semantic and presentation output for monorepository scripts.
 *
 * @remarks
 * Semantic messages retain the stable `[arolariu::<context>]` prefix. Child presenters share
 * output configuration, redactions, JSON state, and progress cleanup with their parent.
 *
 * @example
 * ```typescript
 * const presenter = new ComposedTerminalPresenter("generate::artifacts", {verbose: false, sink});
 * presenter.info("Starting artifact generation.");
 * ```
 */
export class ComposedTerminalPresenter extends TerminalPresenter {
  /** Logical script context included in semantic prefixes. */
  readonly #context: string;

  /** Shared output and runtime state. */
  readonly #state: ComposedTerminalPresenterState;

  /**
   * Creates a sink-backed composed presenter.
   *
   * @param context - Logical context appended to the `arolariu` prefix.
   * @param options - Presenter behavior and its required output destination.
   */
  public constructor(context: string, options: Readonly<TerminalPresenterOptions>) {
    super();
    this.#context = context;

    const internalOptions = options as InternalTerminalPresenterOptions;
    const sharedState = internalOptions[COMPOSED_TERMINAL_PRESENTER_STATE];
    if (sharedState !== undefined) {
      this.#state = sharedState;
      return;
    }

    const mode = options.mode ?? "human";
    const runtimeHost = options.runtimeHost ?? inertTerminalPresenterRuntimeHost;
    const tty = runtimeHost.stdoutIsTTY;
    const colorAllowed = tty && options.color !== false && !runtimeHost.noColor;
    const redactions = new Set<string>();
    for (const value of options.redactions ?? []) {
      if (value.length > 0) {
        redactions.add(value);
      }
    }

    this.#state = {
      mode,
      verbose: options.verbose ?? true,
      color: colorAllowed && mode === "human",
      colorAllowed,
      tty,
      sink: options.sink,
      runtimeHost,
      redactions,
      jsonDocumentWritten: false,
      activeProgress: null,
    };
  }

  /** {@inheritDoc TerminalPresenter.debug} */
  public override debug(message: string): void {
    if (this.#state.verbose) {
      this.#emitSemantic("debug", "🐛", "gray", message);
    }
  }

  /** {@inheritDoc TerminalPresenter.info} */
  public override info(message: string): void {
    this.#emitSemantic("info", "ℹ️", "cyan", message);
  }

  /** {@inheritDoc TerminalPresenter.warn} */
  public override warn(message: string): void {
    this.#emitSemantic("warn", "⚠️", "yellow", message);
  }

  /** {@inheritDoc TerminalPresenter.error} */
  public override error(message: string): void {
    this.#emitSemantic("error", "⛔", "red", message);
  }

  /** {@inheritDoc TerminalPresenter.success} */
  public override success(message: string): void {
    this.#emitSemantic("success", "✅", "green", message);
  }

  /** {@inheritDoc TerminalPresenter.fatal} */
  public override fatal(message: string): void {
    if (this.#state.mode === "silent") {
      return;
    }

    if (this.#state.mode === "json") {
      this.#prepareForOutput();
      this.#state.sink.line("stderr", [{text: this.sanitize(message)}], "error");
      return;
    }

    this.#emitSemantic("error", "⛔", "red", message);
  }

  /** {@inheritDoc TerminalPresenter.sanitize} */
  public override sanitize(text: string, includeJsonEscapes = false): string {
    return redactText(text, this.#state.redactions, includeJsonEscapes);
  }

  /** {@inheritDoc TerminalPresenter.child} */
  public override child(context: string): TerminalPresenter {
    const options: InternalTerminalPresenterOptions = {
      sink: this.#state.sink,
      [COMPOSED_TERMINAL_PRESENTER_STATE]: this.#state,
    };

    return new ComposedTerminalPresenter(`${this.#context}::${context}`, options);
  }

  /** {@inheritDoc TerminalPresenter.fork} */
  public override fork(context: string, options: Readonly<TerminalPresenterScopeOptions>): TerminalPresenter {
    const forkedState: ComposedTerminalPresenterState = {
      mode: options.mode,
      verbose: options.verbose,
      color: this.#state.colorAllowed && options.mode === "human",
      colorAllowed: this.#state.colorAllowed,
      tty: this.#state.tty,
      sink: this.#state.sink,
      runtimeHost: this.#state.runtimeHost,
      redactions: this.#state.redactions,
      jsonDocumentWritten: false,
      activeProgress: null,
    };

    const forkOptions: InternalTerminalPresenterOptions = {
      sink: forkedState.sink,
      [COMPOSED_TERMINAL_PRESENTER_STATE]: forkedState,
    };

    return new ComposedTerminalPresenter(context, forkOptions);
  }

  /** {@inheritDoc TerminalPresenter.redact} */
  public override redact(value: string): void {
    if (value.length > 0) {
      this.#state.redactions.add(value);
    }
  }

  /** {@inheritDoc TerminalPresenter.line} */
  public override line(segments: string | readonly PresentationSegment[] = "", stream: PresentationStream = "stdout"): void {
    if (this.#state.mode !== "human") {
      return;
    }

    this.#prepareForOutput();
    this.#emit(stream, normalizeSegments(segments), false);
  }

  /** {@inheritDoc TerminalPresenter.write} */
  public override write(segments: string | readonly PresentationSegment[], stream: PresentationStream = "stdout"): void {
    if (this.#state.mode !== "human") {
      return;
    }

    this.#prepareForOutput();
    this.#emit(stream, normalizeSegments(segments), true);
  }

  /** {@inheritDoc TerminalPresenter.createStreamWriter} */
  public override createStreamWriter(stream: PresentationStream = "stdout"): PresentationStreamWriter {
    let pending = "";
    let ended = false;

    const emit = (text: string): void => {
      if (text === "" || this.#state.mode !== "human") {
        return;
      }
      this.#prepareForOutput();
      this.#emit(stream, [{text}], true);
    };

    return {
      write: (chunk) => {
        if (ended || chunk === "") {
          return;
        }

        pending += chunk;
        const boundary = findStreamingRedactionBoundary(pending, this.#state.redactions);
        if (boundary === 0) {
          return;
        }

        emit(pending.slice(0, boundary));
        pending = pending.slice(boundary);
      },
      end: () => {
        if (ended) {
          return;
        }
        ended = true;
        emit(pending);
        pending = "";
      },
    };
  }

  /** {@inheritDoc TerminalPresenter.section} */
  public override section(title: string, icon?: string): void {
    if (this.#state.mode !== "human") {
      return;
    }

    this.line();
    this.line([{text: icon === undefined ? "" : `${icon} `}, {text: title, styles: ["bold", "cyan"]}]);
    this.line();
  }

  /** {@inheritDoc TerminalPresenter.banner} */
  public override banner(lines: readonly string[], style: PresentationStyle = "bold"): void {
    if (this.#state.mode !== "human") {
      return;
    }

    for (const bannerLine of lines) {
      this.line([{text: bannerLine, styles: [style]}]);
    }
  }

  /** {@inheritDoc TerminalPresenter.table} */
  public override table(table: Readonly<PresentationTable>): void {
    if (this.#state.mode !== "human") {
      return;
    }

    const columnCount = Math.max(table.headers?.length ?? 0, ...table.rows.map((row) => row.length));
    if (columnCount === 0) {
      return;
    }

    const rowsForWidth = table.headers === undefined ? table.rows : [table.headers, ...table.rows];
    const widths = Array.from({length: columnCount}, (_, columnIndex) =>
      Math.max(...rowsForWidth.map((row) => row[columnIndex]?.length ?? 0)),
    );
    const formatRow = (row: readonly string[]): string =>
      Array.from({length: columnCount}, (_, columnIndex) => {
        const value = row[columnIndex] ?? "";
        const width = widths[columnIndex] ?? 0;
        const alignment = table.align?.[columnIndex] ?? "left";

        if (alignment === "right") {
          return value.padStart(width);
        }

        return columnIndex === columnCount - 1 ? value : value.padEnd(width);
      }).join("  ");

    if (table.headers !== undefined) {
      this.line([{text: formatRow(table.headers), styles: ["bold"]}]);
      this.line([
        {
          text: widths.map((width) => "-".repeat(width)).join("  "),
          styles: ["gray"],
        },
      ]);
    }

    for (const row of table.rows) {
      this.line(formatRow(row));
    }
  }

  /** {@inheritDoc TerminalPresenter.command} */
  public override command(command: string): void {
    this.line([{text: `$ ${command}`, styles: ["dim"]}]);
  }

  /** {@inheritDoc TerminalPresenter.json} */
  public override json(value: unknown): void {
    if (this.#state.mode !== "json" || this.#state.jsonDocumentWritten) {
      return;
    }

    const document = JSON.stringify(value, null, 2) ?? "null";
    this.#prepareForOutput();
    this.#state.jsonDocumentWritten = true;
    this.#emit("stdout", [{text: document}], false, undefined, true);
  }

  /** {@inheritDoc TerminalPresenter.progress} */
  public override progress(initialMessage: string): ProgressReporter {
    if (this.#state.mode !== "human") {
      return {
        update: () => undefined,
        succeed: () => undefined,
        fail: () => undefined,
        stop: () => undefined,
      };
    }

    return createTerminalProgress(initialMessage, {
      interactive: this.#state.tty,
      slot: this.#state,
      scheduleInterval: (callback, intervalMs) => this.#state.runtimeHost.scheduleInterval(callback, intervalMs),
      emit: (stream, segments, write) => {
        this.#emit(stream, segments, write);
      },
    });
  }

  /**
   * Emits one prefixed semantic message.
   *
   * @param level - Semantic output level.
   * @param icon - Level-specific icon.
   * @param style - Level-specific style.
   * @param message - Caller-supplied message.
   */
  #emitSemantic(level: PresentationSemanticLevel, icon: string, style: PresentationStyle, message: string): void {
    if (this.#state.mode !== "human") {
      return;
    }

    this.#prepareForOutput();
    const stream: PresentationStream = level === "warn" || level === "error" ? "stderr" : "stdout";
    const text = this.sanitize(`[arolariu::${this.#context}] ${icon} ${message}`);
    const segment: PresentationSegment = this.#state.color ? {text, styles: [style]} : {text};
    this.#state.sink.line(stream, [segment], level);
  }

  /**
   * Pauses and clears any progress output before writing unrelated output.
   */
  #prepareForOutput(): void {
    const activeProgress = this.#state.activeProgress;
    if (activeProgress === null) {
      return;
    }

    activeProgress.pause();
  }

  /**
   * Redacts and routes one composed presentation record to the configured sink.
   *
   * When styling is not allowed the whole record is joined before redaction, so a sensitive value
   * split across segments is still replaced exactly once. When styling is allowed each segment
   * keeps its own style and is redacted independently, because the host styles per segment.
   *
   * @param stream - Destination stream.
   * @param segments - Composed presentation segments.
   * @param write - Whether this is a raw write rather than a complete line.
   * @param level - Optional semantic level the host preserves.
   * @param includeJsonEscapes - Whether JSON-escaped redaction variants are matched.
   */
  #emit(
    stream: PresentationStream,
    segments: readonly PresentationSegment[],
    write: boolean,
    level?: PresentationSemanticLevel,
    includeJsonEscapes = false,
  ): void {
    const composed: readonly PresentationSegment[] = this.#state.color
      ? segments.map((segment) => {
          const text = this.sanitize(segment.text, includeJsonEscapes);
          return segment.styles === undefined ? {text} : {text, styles: segment.styles};
        })
      : [{text: this.sanitize(segments.map((segment) => segment.text).join(""), includeJsonEscapes)}];

    if (write) {
      this.#state.sink.write(stream, composed);
      return;
    }

    this.#state.sink.line(stream, composed, level);
  }
}

/**
 * Normalizes plain text or styled segments into a segment list.
 *
 * @param segments - Plain text or styled segments.
 * @returns The equivalent segment list.
 */
function normalizeSegments(segments: string | readonly PresentationSegment[]): readonly PresentationSegment[] {
  return typeof segments === "string" ? [{text: segments}] : segments;
}
