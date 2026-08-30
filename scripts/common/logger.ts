/**
 * @fileoverview Semantic and presentation logging contracts for monorepository scripts.
 * @module scripts.common.logger
 */

import {styleText} from "node:util";

/** Selects human-oriented or machine-readable logger output. */
export type LoggerMode = "human" | "json";

/** Identifies the process stream that receives logger output. */
export type LoggerStream = "stdout" | "stderr";

/** Styles supported by logger presentation segments. */
export type LoggerStyle = "bold" | "dim" | "gray" | "red" | "green" | "yellow" | "blue" | "cyan" | "magenta" | "white" | "bgRed";

/** Defines one optionally styled segment of presentation output. */
export interface LogSegment {
  /** Segment text. */
  readonly text: string;
  /** Styles applied in declaration order when color output is enabled. */
  readonly styles?: readonly LoggerStyle[];
}

/** Defines a plain-text table rendered by the logger. */
export interface LoggerTable {
  /** Optional table headings. */
  readonly headers?: readonly string[];
  /** Table body rows. */
  readonly rows: readonly (readonly string[])[];
  /** Optional alignment for each column. */
  readonly align?: readonly ("left" | "right")[];
}

/** Receives fully rendered logger output. */
export interface LoggerSink {
  /** Writes one complete line without a caller-supplied newline. */
  readonly line: (stream: LoggerStream, text: string) => void;
  /** Writes an incomplete or raw output chunk. */
  readonly write: (stream: LoggerStream, text: string) => void;
}

/** Redacts and forwards one logical stream across arbitrary chunk boundaries. */
export interface LoggerStreamWriter {
  /** Writes the next decoded stream chunk. */
  readonly write: (chunk: string) => void;
  /** Flushes the final buffered stream tail. */
  readonly end: () => void;
}

/** Configures a monorepository console logger. */
export interface LoggerOptions {
  /** Output mode. */
  readonly mode?: LoggerMode;
  /** Whether diagnostic messages are emitted. */
  readonly verbose?: boolean;
  /** Whether ANSI styling may be emitted when the output stream is a TTY. */
  readonly color?: boolean;
  /** Destination for rendered output. */
  readonly sink?: LoggerSink;
  /** Sensitive literal values replaced before output reaches the sink. */
  readonly redactions?: readonly string[];
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

type SemanticLevel = "debug" | "info" | "warn" | "error" | "success";

interface ActiveProgress {
  readonly pause: () => void;
  readonly stop: () => void;
}

interface LoggerRuntimeState {
  readonly mode: LoggerMode;
  readonly verbose: boolean;
  readonly color: boolean;
  readonly tty: boolean;
  readonly sink: LoggerSink;
  readonly redactions: Set<string>;
  activeProgress: ActiveProgress | null;
  jsonEmitted: boolean;
}

const LOGGER_RUNTIME_STATE = Symbol("loggerRuntimeState");

type InternalLoggerOptions = LoggerOptions & {
  readonly [LOGGER_RUNTIME_STATE]?: LoggerRuntimeState;
};

const PROGRESS_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"] as const;
const REDACTION_MARKER = "[REDACTED]";
const PROGRESS_INTERVAL_MS = 80;

/**
 * Writes rendered logger output to the process console and output streams.
 */
class ConsoleLoggerSink implements LoggerSink {
  /** {@inheritDoc LoggerSink.line} */
  public line(stream: LoggerStream, text: string): void {
    if (stream === "stderr") {
      console.error(text);
      return;
    }

    console.log(text);
  }

  /** {@inheritDoc LoggerSink.write} */
  public write(stream: LoggerStream, text: string): void {
    if (stream === "stderr") {
      process.stderr.write(text);
      return;
    }

    process.stdout.write(text);
  }

  /**
   * Preserves the semantic console method used by the original logger.
   *
   * @param level - Semantic level selected by the caller.
   * @param text - Fully rendered and redacted message.
   */
  public semantic(level: SemanticLevel, text: string): void {
    switch (level) {
      case "debug":
        console.debug(text);
        break;
      case "info":
      case "success":
        console.info(text);
        break;
      case "warn":
        console.warn(text);
        break;
      case "error":
        console.error(text);
        break;
    }
  }
}

/**
 * Stores ordered logger output records for deterministic tests and adapters.
 */
export class InMemoryLoggerSink implements LoggerSink {
  readonly #records: Array<Readonly<{stream: LoggerStream; text: string; write: boolean}>> = [];

  /** Ordered output received by this sink. */
  public get records(): readonly Readonly<{stream: LoggerStream; text: string; write: boolean}>[] {
    return this.#records;
  }

  /** {@inheritDoc LoggerSink.line} */
  public line(stream: LoggerStream, text: string): void {
    this.#records.push({stream, text, write: false});
  }

  /** {@inheritDoc LoggerSink.write} */
  public write(stream: LoggerStream, text: string): void {
    this.#records.push({stream, text, write: true});
  }
}

/**
 * Defines semantic and presentation logging for monorepository automation.
 */
export abstract class MonorepositoryLogger {
  /** Writes diagnostic detail useful while troubleshooting. */
  public abstract debug(message: string): void;

  /** Writes normal lifecycle information. */
  public abstract info(message: string): void;

  /** Writes a recoverable or intentionally deferred condition. */
  public abstract warn(message: string): void;

  /** Writes a failed operation before its error propagates. */
  public abstract error(message: string): void;

  /** Writes successful lifecycle completion. */
  public abstract success(message: string): void;

  /** Creates a logger whose context is appended to this logger's context. */
  public abstract child(context: string): MonorepositoryLogger;

  /** Registers a sensitive literal value for replacement before output. */
  public abstract redact(value: string): void;

  /** Writes a complete human-oriented presentation line. */
  public abstract line(segments?: string | readonly LogSegment[], stream?: LoggerStream): void;

  /** Writes an incomplete or raw human-oriented output chunk. */
  public abstract write(segments: string | readonly LogSegment[], stream?: LoggerStream): void;

  /** Creates a stateful raw writer that preserves redaction across chunk boundaries. */
  public abstract createStreamWriter(stream?: LoggerStream): LoggerStreamWriter;

  /** Writes a visually separated section heading. */
  public abstract section(title: string, icon?: string): void;

  /** Writes a sequence of banner lines. */
  public abstract banner(lines: readonly string[], style?: LoggerStyle): void;

  /** Writes an aligned plain-text table. */
  public abstract table(table: Readonly<LoggerTable>): void;

  /** Writes a shell-style command echo. */
  public abstract command(command: string): void;

  /** Writes one machine-readable JSON document. */
  public abstract json(value: unknown): void;

  /** Starts a TTY-aware progress reporter. */
  public abstract progress(message: string): ProgressReporter;
}

/**
 * Writes sink-backed semantic and presentation output for monorepository scripts.
 *
 * @remarks
 * Semantic messages retain the stable `[arolariu::<context>]` prefix. Child
 * loggers share output configuration, redactions, JSON state, and progress
 * cleanup with their parent.
 *
 * @example
 * ```typescript
 * const logger = new MonorepositoryConsoleLogger("generate::artifacts", {
 *   mode: "human",
 *   verbose: false,
 * });
 * logger.info("Starting artifact generation.");
 * ```
 */
export class MonorepositoryConsoleLogger extends MonorepositoryLogger {
  /** Logical script context included in semantic log prefixes. */
  readonly #context: string;

  /** Shared output and runtime state. */
  readonly #state: LoggerRuntimeState;

  /**
   * Creates a sink-backed console logger.
   *
   * @param context - Logical context appended to the `arolariu` prefix.
   * @param options - Optional logger behavior and destination.
   */
  public constructor(context: string, options: LoggerOptions = {}) {
    super();
    this.#context = context;

    const internalOptions = options as InternalLoggerOptions;
    const sharedState = internalOptions[LOGGER_RUNTIME_STATE];
    if (sharedState !== undefined) {
      this.#state = sharedState;
      return;
    }

    const mode = options.mode ?? "human";
    const tty = process.stdout.isTTY === true;
    const color = mode === "human" && tty && options.color !== false && !Object.hasOwn(process.env, "NO_COLOR");
    const redactions = new Set<string>();
    for (const value of options.redactions ?? []) {
      if (value.length > 0) {
        redactions.add(value);
      }
    }

    this.#state = {
      mode,
      verbose: options.verbose ?? true,
      color,
      tty,
      sink: options.sink ?? new ConsoleLoggerSink(),
      redactions,
      activeProgress: null,
      jsonEmitted: false,
    };
  }

  /** {@inheritDoc MonorepositoryLogger.debug} */
  public override debug(message: string): void {
    if (this.#state.verbose) {
      this.emitSemantic("debug", "🐛", "gray", message);
    }
  }

  /** {@inheritDoc MonorepositoryLogger.info} */
  public override info(message: string): void {
    this.emitSemantic("info", "ℹ️", "cyan", message);
  }

  /** {@inheritDoc MonorepositoryLogger.warn} */
  public override warn(message: string): void {
    this.emitSemantic("warn", "⚠️", "yellow", message);
  }

  /** {@inheritDoc MonorepositoryLogger.error} */
  public override error(message: string): void {
    this.emitSemantic("error", "⛔", "red", message);
  }

  /** {@inheritDoc MonorepositoryLogger.success} */
  public override success(message: string): void {
    this.emitSemantic("success", "✅", "green", message);
  }

  /** {@inheritDoc MonorepositoryLogger.child} */
  public override child(context: string): MonorepositoryLogger {
    const options: InternalLoggerOptions = {
      [LOGGER_RUNTIME_STATE]: this.#state,
    };

    return new MonorepositoryConsoleLogger(`${this.#context}::${context}`, options);
  }

  /** {@inheritDoc MonorepositoryLogger.redact} */
  public override redact(value: string): void {
    if (value.length > 0) {
      this.#state.redactions.add(value);
    }
  }

  /** {@inheritDoc MonorepositoryLogger.line} */
  public override line(segments: string | readonly LogSegment[] = "", stream: LoggerStream = "stdout"): void {
    if (this.#state.mode === "json") {
      return;
    }

    this.prepareForOutput();
    this.writeToSink(stream, this.render(segments), false);
  }

  /** {@inheritDoc MonorepositoryLogger.write} */
  public override write(segments: string | readonly LogSegment[], stream: LoggerStream = "stdout"): void {
    if (this.#state.mode === "json") {
      return;
    }

    this.prepareForOutput();
    this.writeToSink(stream, this.render(segments), true);
  }

  /** {@inheritDoc MonorepositoryLogger.createStreamWriter} */
  public override createStreamWriter(stream: LoggerStream = "stdout"): LoggerStreamWriter {
    let pending = "";
    let ended = false;

    const emit = (text: string): void => {
      if (text === "" || this.#state.mode === "json") {
        return;
      }
      this.prepareForOutput();
      this.writeToSink(stream, text, true);
    };

    return {
      write: (chunk) => {
        if (ended || chunk === "") {
          return;
        }

        pending += chunk;
        const boundary = this.findStreamingRedactionBoundary(pending);
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

  /** {@inheritDoc MonorepositoryLogger.section} */
  public override section(title: string, icon?: string): void {
    if (this.#state.mode === "json") {
      return;
    }

    this.line();
    this.line([{text: icon === undefined ? "" : `${icon} `}, {text: title, styles: ["bold", "cyan"]}]);
    this.line();
  }

  /** {@inheritDoc MonorepositoryLogger.banner} */
  public override banner(lines: readonly string[], style: LoggerStyle = "bold"): void {
    if (this.#state.mode === "json") {
      return;
    }

    for (const bannerLine of lines) {
      this.line([{text: bannerLine, styles: [style]}]);
    }
  }

  /** {@inheritDoc MonorepositoryLogger.table} */
  public override table(table: Readonly<LoggerTable>): void {
    if (this.#state.mode === "json") {
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

  /** {@inheritDoc MonorepositoryLogger.command} */
  public override command(command: string): void {
    this.line([{text: `$ ${command}`, styles: ["dim"]}]);
  }

  /** {@inheritDoc MonorepositoryLogger.json} */
  public override json(value: unknown): void {
    if (this.#state.jsonEmitted) {
      return;
    }

    const document = JSON.stringify(value, null, 2) ?? "null";
    this.prepareForOutput();
    this.#state.jsonEmitted = true;
    this.writeToSink("stdout", document, false, undefined, true);
  }

  /** {@inheritDoc MonorepositoryLogger.progress} */
  public override progress(initialMessage: string): ProgressReporter {
    if (this.#state.mode === "json") {
      return {
        update: () => undefined,
        succeed: () => undefined,
        fail: () => undefined,
        stop: () => undefined,
      };
    }

    this.#state.activeProgress?.stop();

    let message = initialMessage;
    let frameIndex = 0;
    let active = true;
    let timer: NodeJS.Timeout | null = null;
    let progressDisplayed = false;

    const renderProgress = (): void => {
      if (!active || !this.#state.tty) {
        return;
      }

      const frame = PROGRESS_FRAMES[frameIndex] ?? PROGRESS_FRAMES[0];
      frameIndex = (frameIndex + 1) % PROGRESS_FRAMES.length;
      this.writeToSink("stdout", `\r${this.applyStyles(frame, ["cyan"])} ${message}`, true);
      progressDisplayed = true;
    };

    const startProgress = (): void => {
      if (!active || !this.#state.tty || timer !== null) {
        return;
      }

      renderProgress();
      timer = setInterval(renderProgress, PROGRESS_INTERVAL_MS);
      timer.unref();
    };

    const pauseProgress = (): void => {
      if (!active) {
        return;
      }

      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
      if (this.#state.tty && progressDisplayed) {
        this.writeToSink("stdout", "\r\u001B[K", true);
        progressDisplayed = false;
      }
    };

    const stopProgress = (): void => {
      if (!active) {
        return;
      }

      if (this.#state.activeProgress === activeProgress) {
        this.#state.activeProgress = null;
      }
      pauseProgress();
      active = false;
    };

    const activeProgress: ActiveProgress = {
      pause: pauseProgress,
      stop: stopProgress,
    };
    this.#state.activeProgress = activeProgress;

    startProgress();

    const finish = (stream: LoggerStream, icon: string, style: LoggerStyle, finalMessage: string): void => {
      if (!active) {
        return;
      }

      stopProgress();
      this.writeToSink(stream, this.render([{text: `${icon} `, styles: [style]}, {text: finalMessage}]), false);
    };

    return {
      update: (updatedMessage: string): void => {
        if (!active) {
          return;
        }

        message = updatedMessage;
        if (timer === null) {
          startProgress();
        } else {
          renderProgress();
        }
      },
      succeed: (finalMessage: string): void => {
        finish("stdout", "✔", "green", finalMessage);
      },
      fail: (finalMessage: string): void => {
        finish("stderr", "✖", "red", finalMessage);
      },
      stop: stopProgress,
    };
  }

  /**
   * Emits one prefixed semantic message.
   *
   * @param level - Semantic output level.
   * @param icon - Level-specific icon.
   * @param style - Level-specific style.
   * @param message - Caller-supplied message.
   */
  private emitSemantic(level: SemanticLevel, icon: string, style: LoggerStyle, message: string): void {
    if (this.#state.mode === "json") {
      return;
    }

    this.prepareForOutput();
    const stream: LoggerStream = level === "warn" || level === "error" ? "stderr" : "stdout";
    const text = this.applyStyles(`[arolariu::${this.#context}] ${icon} ${message}`, [style]);
    this.writeToSink(stream, text, false, level);
  }

  /**
   * Pauses and clears any progress output before writing unrelated output.
   */
  private prepareForOutput(): void {
    const activeProgress = this.#state.activeProgress;
    if (activeProgress === null) {
      return;
    }

    activeProgress.pause();
  }

  /**
   * Renders plain or segmented presentation text.
   *
   * @param segments - Plain text or styled segments.
   * @returns Fully rendered text.
   */
  private render(segments: string | readonly LogSegment[]): string {
    if (typeof segments === "string") {
      return segments;
    }

    return segments.map((segment) => this.applyStyles(segment.text, segment.styles ?? [])).join("");
  }

  /**
   * Applies ANSI styling when the logger permits color output.
   *
   * @param text - Text to style.
   * @param styles - Styles to apply.
   * @returns Styled or unchanged text.
   */
  private applyStyles(text: string, styles: readonly LoggerStyle[]): string {
    if (!this.#state.color || styles.length === 0) {
      return text;
    }

    const format: LoggerStyle | LoggerStyle[] = styles.length === 1 ? (styles[0] ?? "white") : [...styles];
    return styleText(format, text, {validateStream: false});
  }

  /**
   * Redacts and routes one output record to the configured sink.
   *
   * @param stream - Destination stream.
   * @param text - Rendered text.
   * @param write - Whether this is a raw write rather than a complete line.
   * @param semanticLevel - Optional semantic console method to preserve.
   * @param includeJsonEscapes - Whether JSON-escaped redaction variants are matched.
   */
  private writeToSink(stream: LoggerStream, text: string, write: boolean, semanticLevel?: SemanticLevel, includeJsonEscapes = false): void {
    const redacted = this.redactText(text, includeJsonEscapes);
    if (semanticLevel !== undefined && this.#state.sink instanceof ConsoleLoggerSink) {
      this.#state.sink.semantic(semanticLevel, redacted);
      return;
    }

    if (write) {
      this.#state.sink.write(stream, redacted);
      return;
    }

    this.#state.sink.line(stream, redacted);
  }

  /**
   * Finds a prefix that can be emitted without splitting a registered redaction.
   *
   * @param text - Buffered decoded stream text.
   * @returns Exclusive boundary of text safe to redact and emit immediately.
   */
  private findStreamingRedactionBoundary(text: string): number {
    const redactions = [...this.#state.redactions];
    if (redactions.length === 0) {
      return text.length;
    }

    const maximumLength = Math.max(...redactions.map((value) => value.length));
    let boundary = Math.max(0, text.length - maximumLength + 1);
    let changed = true;

    while (changed) {
      changed = false;
      for (const value of redactions) {
        let matchIndex = text.indexOf(value, Math.max(0, boundary - value.length + 1));
        while (matchIndex !== -1 && matchIndex < boundary) {
          if (matchIndex + value.length > boundary) {
            boundary = matchIndex;
            changed = true;
            break;
          }
          matchIndex = text.indexOf(value, matchIndex + 1);
        }
      }

      const precedingCodeUnit = boundary === 0 ? undefined : text.charCodeAt(boundary - 1);
      const followingCodeUnit = boundary === text.length ? undefined : text.charCodeAt(boundary);
      if (
        precedingCodeUnit !== undefined
        && followingCodeUnit !== undefined
        && precedingCodeUnit >= 0xd800
        && precedingCodeUnit <= 0xdbff
        && followingCodeUnit >= 0xdc00
        && followingCodeUnit <= 0xdfff
      ) {
        boundary--;
        changed = true;
      }
    }

    return boundary;
  }

  /**
   * Replaces registered sensitive values, applying longest values first.
   *
   * @param text - Text about to be written to a sink.
   * @param includeJsonEscapes - Whether JSON-escaped variants are also sensitive.
   * @returns Redacted output text.
   */
  private redactText(text: string, includeJsonEscapes: boolean): string {
    let redacted = text;
    const values = new Set<string>();
    for (const value of this.#state.redactions) {
      values.add(value);
      if (includeJsonEscapes) {
        values.add(JSON.stringify(value).slice(1, -1));
      }
    }

    for (const value of [...values].toSorted((left, right) => right.length - left.length)) {
      redacted = redacted.replaceAll(value, REDACTION_MARKER);
    }

    return redacted;
  }
}
