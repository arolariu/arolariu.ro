/**
 * @fileoverview Effect output platform: settings, sinks, the `Presenter`, and the arolariu logger.
 * @module scripts/platform/Output
 *
 * @remarks
 * Effect counterpart of the legacy `MonorepositoryConsoleLogger` (`scripts/common/logger.ts`).
 * Semantic messages flow through `Effect.log*` and render as `[arolariu::<context>] <icon> <message>`;
 * presentation (success, sections, banners, tables, progress, and the single JSON document) flows
 * through {@link Presenter}. Both render into a {@link Sink}, so tests capture every record with
 * {@link memorySink}. {@link SinkLive} is the only place that writes to the process streams.
 */

import {styleText} from "node:util";

import {Cause, Context, Effect, Exit, Formatter, Layer, Logger, LogLevel, References, Schema, type Scope} from "effect";

import type {EnvironmentSnapshot} from "./Environment.ts";

/** Selects human-oriented, machine-readable, or fully suppressed output. */
export type OutputMode = "human" | "json" | "silent";

/** Output configuration selected for one command invocation. */
export interface OutputSettingsShape {
  /** Output mode. */
  readonly mode: OutputMode;
  /** Whether debug log messages are emitted. */
  readonly verbose: boolean;
  /** Whether ANSI styling is emitted. */
  readonly color: boolean;
  /** Default `[arolariu::<context>]` prefix context when no `context` log annotation is set. */
  readonly context: string;
}

/** Service tag for the invocation {@link OutputSettingsShape}. */
export class OutputSettings extends Context.Service<OutputSettings, OutputSettingsShape>()("arolariu/scripts/OutputSettings") {}

/**
 * Decides whether output may be colored, with the same rule as the legacy Node runtime host.
 *
 * @param environment - The ambient environment snapshot.
 * @returns `true` when stdout is a TTY and `NO_COLOR` is absent (any value, including empty, disables color).
 */
export function resolveColor(environment: EnvironmentSnapshot): boolean {
  return environment.stdoutIsTTY && !Object.hasOwn(environment.variables, "NO_COLOR");
}

/** Identifies the process stream that receives output. */
export type OutputStream = "stdout" | "stderr";

/** One fully rendered output chunk. */
export interface SinkRecord {
  /** Destination stream. */
  readonly stream: OutputStream;
  /** Rendered text, including any trailing newline. */
  readonly text: string;
}

/** Destination of rendered output. */
export interface SinkShape {
  /** Writes one record unchanged. */
  readonly write: (record: SinkRecord) => Effect.Effect<void>;
}

/** Service tag for the destination of rendered output. */
export class Sink extends Context.Service<Sink, SinkShape>()("arolariu/scripts/Sink") {}

/**
 * Whether the sink's stdout is an interactive terminal; decides whether progress redraws one line.
 *
 * @remarks
 * {@link SinkLive} sets it from `process.stdout.isTTY`; {@link memorySink} sets it from its options.
 * {@link outputLayer} reads it from the layer that provides the {@link Sink}.
 */
export const StdoutIsTTY: Context.Reference<boolean> = Context.Reference<boolean>("arolariu/scripts/StdoutIsTTY", {
  defaultValue: () => false,
});

/** Layer that writes every record unchanged to `process.stdout` or `process.stderr`. */
export const SinkLive: Layer.Layer<Sink> = Layer.merge(
  Layer.succeed(Sink, {
    write: (record: SinkRecord): Effect.Effect<void> =>
      Effect.sync(() => {
        if (record.stream === "stderr") {
          process.stderr.write(record.text);
          return;
        }
        process.stdout.write(record.text);
      }),
  }),
  Layer.sync(StdoutIsTTY, () => process.stdout.isTTY === true),
);

/**
 * Creates an in-memory sink for deterministic tests.
 *
 * @param options - Optional terminal simulation; `stdoutIsTTY` defaults to `false`.
 * @returns The sink layer and an accessor returning a copy of the ordered records.
 */
export function memorySink(options: {readonly stdoutIsTTY?: boolean} = {}): {
  readonly layer: Layer.Layer<Sink>;
  readonly records: () => readonly SinkRecord[];
} {
  const records: SinkRecord[] = [];
  const sink = Layer.succeed(Sink, {
    write: (record: SinkRecord): Effect.Effect<void> =>
      Effect.sync(() => {
        records.push(record);
      }),
  });
  return {
    layer: Layer.merge(sink, Layer.succeed(StdoutIsTTY, options.stdoutIsTTY ?? false)),
    records: (): readonly SinkRecord[] => [...records],
  };
}

/** Any value that survives a lossless round trip through `JSON.stringify`/`JSON.parse`. */
export type JsonValue = string | number | boolean | null | readonly JsonValue[] | Readonly<{[key: string]: JsonValue}>;

function isPlainJsonObject(value: unknown): value is Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
}

function isUnknownArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

function describeUnsupportedJsonValue(value: unknown): string {
  if (value === undefined) {
    return "undefined";
  }
  if (typeof value === "number") {
    return "non-finite number";
  }
  if (typeof value === "object" && value !== null) {
    const constructorName: unknown = value.constructor?.name;
    return typeof constructorName === "string" ? `${constructorName} instance` : "non-plain object";
  }

  return typeof value;
}

function convertToJsonValue(value: unknown, ancestors: readonly object[], path: string): JsonValue {
  if (value === null) {
    return null;
  }
  if (typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError(`Value at ${path} is not JSON-serializable: non-finite number.`);
    }
    return value;
  }

  if (isUnknownArray(value)) {
    if (ancestors.includes(value)) {
      throw new TypeError(`Value at ${path} contains a circular reference and cannot be serialized.`);
    }

    const nestedAncestors = [...ancestors, value];
    return value.map((entry, index) => convertToJsonValue(entry, nestedAncestors, `${path}[${String(index)}]`));
  }

  if (isPlainJsonObject(value)) {
    if (ancestors.includes(value)) {
      throw new TypeError(`Value at ${path} contains a circular reference and cannot be serialized.`);
    }

    const nestedAncestors = [...ancestors, value];
    const converted: Record<string, JsonValue> = {};
    for (const key of Object.keys(value)) {
      converted[key] = convertToJsonValue(value[key], nestedAncestors, `${path}.${key}`);
    }
    return converted;
  }

  throw new TypeError(`Value at ${path} is not JSON-serializable: ${describeUnsupportedJsonValue(value)}.`);
}

/**
 * Converts a typed command report into a checked {@link JsonValue}, so a command assigns
 * `CommandCompletion.json` without a type assertion and never emits a document containing a
 * value `JSON.stringify` would silently drop or reject.
 *
 * @param value - Plain report data to convert.
 * @returns The equivalent JSON value.
 * @throws {TypeError} When the value contains `undefined`, a non-finite number, a `bigint`, a
 * function, a symbol, a non-plain object, or a circular reference.
 */
export function toJsonValue(value: unknown): JsonValue {
  return convertToJsonValue(value, [], "$");
}

/** Raised when a command tries to write a second JSON document in one invocation. */
export class JsonDocumentAlreadyWritten extends Schema.TaggedError<JsonDocumentAlreadyWritten>()("JsonDocumentAlreadyWritten", {
  message: Schema.String,
}) {}

/** Defines a plain-text table rendered by the presenter (same shape as the legacy `LoggerTable`). */
export interface PresenterTable {
  /** Optional table headings. */
  readonly headers?: readonly string[];
  /** Table body rows. */
  readonly rows: readonly (readonly string[])[];
  /** Optional alignment for each column. */
  readonly align?: readonly ("left" | "right")[];
}

/** Handle over an active progress line; it ends when its scope closes. */
export interface Progress {
  /** Advances the counter by `by` (default `1`) and optionally replaces the label. */
  readonly advance: (by?: number, label?: string) => Effect.Effect<void>;
}

/** Presentation operations that are not semantic log messages. */
export interface PresenterShape {
  /** Writes a `✅` success line (human mode only). */
  readonly success: (message: string) => Effect.Effect<void>;
  /** Writes the terminal failure diagnostic: `⛔` in human mode, the plain message on stderr in JSON mode. */
  readonly fatal: (message: string) => Effect.Effect<void>;
  /** Writes one complete line (human mode only). */
  readonly line: (stream: OutputStream, text: string) => Effect.Effect<void>;
  /** Writes a raw chunk without a newline (human mode only). */
  readonly write: (stream: OutputStream, text: string) => Effect.Effect<void>;
  /** Writes a visually separated section heading (human mode only). */
  readonly section: (title: string, icon?: string) => Effect.Effect<void>;
  /** Writes a bold title followed by plain lines (human mode only). */
  readonly banner: (title: string, lines?: readonly string[]) => Effect.Effect<void>;
  /** Writes an aligned plain-text table (human mode only). */
  readonly table: (table: PresenterTable) => Effect.Effect<void>;
  /** Starts a progress line that ends when the surrounding scope closes (human mode only). */
  readonly progress: (label: string, total?: number) => Effect.Effect<Progress, never, Scope.Scope>;
  /** Writes the single JSON document of the invocation (JSON mode only). */
  readonly json: (document: JsonValue) => Effect.Effect<void, JsonDocumentAlreadyWritten>;
}

/** Service tag for the invocation {@link PresenterShape}. */
export class Presenter extends Context.Service<Presenter, PresenterShape>()("arolariu/scripts/Presenter") {}

type OutputStyle = "bold" | "gray" | "red" | "green" | "yellow" | "cyan";

interface SemanticLevel {
  readonly icon: string;
  readonly style: OutputStyle;
  readonly stream: OutputStream;
}

const DEBUG: SemanticLevel = {icon: "🐛", style: "gray", stream: "stdout"};
const INFO: SemanticLevel = {icon: "ℹ️", style: "cyan", stream: "stdout"};
const WARN: SemanticLevel = {icon: "⚠️", style: "yellow", stream: "stderr"};
const ERROR: SemanticLevel = {icon: "⛔", style: "red", stream: "stderr"};
const SUCCESS: SemanticLevel = {icon: "✅", style: "green", stream: "stdout"};
const LOG_LEVELS: Readonly<Partial<Record<LogLevel.LogLevel, SemanticLevel>>> = {
  Trace: DEBUG,
  Debug: DEBUG,
  Warn: WARN,
  Error: ERROR,
  Fatal: ERROR,
};
const PROGRESS_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"] as const;
const CLEAR_LINE = "\r\u001B[K";

/**
 * Picks the prefix context: the `context` log annotation when it is a string, else the default.
 *
 * @param annotations - The current log annotations.
 * @param fallback - The settings context.
 * @returns The context rendered inside `[arolariu::…]`.
 */
function contextOf(annotations: Readonly<Record<string, unknown>>, fallback: string): string {
  const context = annotations["context"];
  return typeof context === "string" ? context : fallback;
}

/**
 * Builds the presenter and logger of one output layer build; they share progress and JSON state.
 *
 * @param settings - The invocation output settings.
 * @param sink - The destination sink.
 * @param tty - Whether the sink's stdout is an interactive terminal.
 * @returns The presenter and the arolariu logger.
 */
function makeOutput(
  settings: OutputSettingsShape,
  sink: SinkShape,
  tty: boolean,
): {readonly presenter: PresenterShape; readonly logger: Logger.Logger<unknown, void>} {
  const human = settings.mode === "human";
  let jsonWritten = false;
  let activeProgress: {displayed: boolean} | undefined;

  const paint = (text: string, styles: readonly OutputStyle[]): string =>
    settings.color ? styleText(styles.length === 1 ? (styles[0] ?? "bold") : [...styles], text, {validateStream: false}) : text;
  const pauseProgress = Effect.suspend(() => {
    if (activeProgress?.displayed !== true) {
      return Effect.void;
    }
    activeProgress.displayed = false;
    return sink.write({stream: "stdout", text: CLEAR_LINE});
  });
  const emit = (stream: OutputStream, text: string): Effect.Effect<void> => Effect.andThen(pauseProgress, sink.write({stream, text}));
  const semantic = (level: SemanticLevel, context: string, message: string): Effect.Effect<void> =>
    emit(level.stream, `${paint(`[arolariu::${context}] ${level.icon} ${message}`, [level.style])}\n`);
  const humanOnly =
    <Args extends readonly unknown[]>(render: (...args: Args) => Effect.Effect<void>) =>
    (...args: Args): Effect.Effect<void> =>
      human ? render(...args) : Effect.void;
  const annotatedSemantic = (level: SemanticLevel, message: string): Effect.Effect<void> =>
    Effect.flatMap(Effect.service(References.CurrentLogAnnotations), (annotations) =>
      semantic(level, contextOf(annotations, settings.context), message),
    );

  const table = (input: PresenterTable): Effect.Effect<void> => {
    const columnCount = Math.max(input.headers?.length ?? 0, ...input.rows.map((row) => row.length));
    if (columnCount === 0) {
      return Effect.void;
    }
    const rowsForWidth = input.headers === undefined ? input.rows : [input.headers, ...input.rows];
    const widths = Array.from({length: columnCount}, (_, columnIndex) =>
      Math.max(...rowsForWidth.map((row) => row[columnIndex]?.length ?? 0)),
    );
    const formatRow = (row: readonly string[]): string =>
      Array.from({length: columnCount}, (_, columnIndex) => {
        const value = row[columnIndex] ?? "";
        const width = widths[columnIndex] ?? 0;
        if ((input.align?.[columnIndex] ?? "left") === "right") {
          return value.padStart(width);
        }
        return columnIndex === columnCount - 1 ? value : value.padEnd(width);
      }).join("  ");
    const header =
      input.headers === undefined
        ? []
        : [paint(formatRow(input.headers), ["bold"]), paint(widths.map((width) => "-".repeat(width)).join("  "), ["gray"])];
    return Effect.forEach([...header, ...input.rows.map(formatRow)], (text) => emit("stdout", `${text}\n`), {discard: true});
  };

  const progress = (label: string, total?: number): Effect.Effect<Progress, never, Scope.Scope> =>
    Effect.gen(function* () {
      let current = label;
      let count = 0;
      let frame = 0;
      const handle = {displayed: false};
      const describe = (): string => (total === undefined ? current : `${current} (${String(count)}/${String(total)})`);
      const draw = Effect.suspend(() => {
        if (!tty || activeProgress !== handle) {
          return Effect.void;
        }
        const glyph = PROGRESS_FRAMES[frame % PROGRESS_FRAMES.length] ?? PROGRESS_FRAMES[0];
        frame += 1;
        handle.displayed = true;
        return sink.write({stream: "stdout", text: `\r${paint(glyph, ["cyan"])} ${describe()}`});
      });

      yield* pauseProgress;
      activeProgress = handle;
      yield* tty ? draw : emit("stdout", `${describe()}\n`);
      yield* Effect.addFinalizer((exit) =>
        Effect.gen(function* () {
          if (activeProgress === handle) {
            yield* pauseProgress;
            activeProgress = undefined;
          }
          if (tty) {
            return;
          }
          yield* Exit.isSuccess(exit)
            ? emit("stdout", `${paint("✔ ", ["green"])}${describe()}\n`)
            : emit("stderr", `${paint("✖ ", ["red"])}${describe()}\n`);
        }),
      );
      return {
        advance: (by = 1, nextLabel?: string): Effect.Effect<void> =>
          Effect.suspend(() => {
            count += by;
            current = nextLabel ?? current;
            return draw;
          }),
      };
    });

  const presenter: PresenterShape = {
    success: humanOnly((message: string) => annotatedSemantic(SUCCESS, message)),
    fatal: (message) => {
      if (settings.mode === "json") {
        return emit("stderr", `${message}\n`);
      }
      return human ? annotatedSemantic(ERROR, message) : Effect.void;
    },
    line: humanOnly((stream: OutputStream, text: string) => emit(stream, `${text}\n`)),
    write: humanOnly((stream: OutputStream, text: string) => emit(stream, text)),
    section: humanOnly((title: string, icon?: string) =>
      Effect.forEach(
        ["", `${icon === undefined ? "" : `${icon} `}${paint(title, ["bold", "cyan"])}`, ""],
        (text) => emit("stdout", `${text}\n`),
        {
          discard: true,
        },
      ),
    ),
    banner: humanOnly((title: string, lines: readonly string[] = []) =>
      Effect.forEach([paint(title, ["bold"]), ...lines], (text) => emit("stdout", `${text}\n`), {discard: true}),
    ),
    table: humanOnly(table),
    progress: (label, total) => (human ? progress(label, total) : Effect.succeed({advance: () => Effect.void})),
    json: (document) => {
      if (settings.mode !== "json") {
        return Effect.void;
      }
      if (jsonWritten) {
        return Effect.fail(new JsonDocumentAlreadyWritten({message: "A JSON document was already written for this invocation."}));
      }
      jsonWritten = true;
      return emit("stdout", `${JSON.stringify(document, null, 2)}\n`);
    },
  };

  const logger = Logger.make<unknown, void>((options) => {
    if (!human) {
      return;
    }
    const parts = Array.isArray(options.message) ? options.message : [options.message];
    let message = parts.map((part: unknown) => (typeof part === "string" ? part : Formatter.format(part))).join(" ");
    if (options.cause.reasons.length > 0) {
      message += `\n${Cause.pretty(options.cause)}`;
    }
    const context = contextOf(options.fiber.getRef(References.CurrentLogAnnotations), settings.context);
    Effect.runSync(semantic(LOG_LEVELS[options.logLevel] ?? INFO, context, message));
  });

  return {presenter, logger};
}

/**
 * Builds the per-invocation output layer.
 *
 * @param settings - The invocation output settings.
 * @returns A layer providing {@link OutputSettings} and {@link Presenter}, replacing the default
 * Effect loggers with the arolariu logger, and keeping the incoming minimum log level (`Info`
 * unless effect/cli's `--log-level` set it), lowered to at least `Debug` when `settings.verbose`.
 */
export function outputLayer(settings: OutputSettingsShape): Layer.Layer<OutputSettings | Presenter, never, Sink> {
  return Layer.unwrap(
    Effect.gen(function* () {
      const sink = yield* Sink;
      const tty = yield* StdoutIsTTY;
      const incoming = yield* References.MinimumLogLevel;
      const {presenter, logger} = makeOutput(settings, sink, tty);
      return Layer.mergeAll(
        Layer.succeed(OutputSettings, settings),
        Layer.succeed(Presenter, presenter),
        Logger.layer([logger]),
        Layer.succeed(References.MinimumLogLevel, settings.verbose && LogLevel.isGreaterThan(incoming, "Debug") ? "Debug" : incoming),
      );
    }),
  );
}

/**
 * Sets the `[arolariu::<context>]` prefix context for every log line and presenter message of an effect.
 *
 * @param context - The prefix context.
 * @returns A function that annotates the effect's logs with `context`.
 */
export function withLogContext(context: string): <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R> {
  return <A, E, R>(self: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> => Effect.annotateLogs(self, "context", context);
}

/**
 * Whether the current minimum log level emits debug messages, that is, whether the invocation is verbose.
 *
 * @remarks
 * {@link outputLayer} lowers the level to `Debug` for `--verbose`; a program may lower it further
 * for a scope with `Effect.provideService(References.MinimumLogLevel, "Debug")`.
 */
export const debugLogsEnabled: Effect.Effect<boolean> = Effect.map(References.MinimumLogLevel, (level) =>
  ["All", "Trace", "Debug"].includes(level),
);
