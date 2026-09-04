/**
 * @fileoverview Deterministic terminal presentation fixture for script tests.
 * @module scripts/testing/fixtures/terminal
 *
 * @remarks
 * Every test that needs presenter output injects {@link RecordingTerminalPresenterSink} instead of
 * spying on the process console. The recorded `text` is the plain concatenation of the composed
 * segment text, so an assertion never depends on ANSI bytes.
 */

import type {CommandPresentationMode} from "../../core/command/command-execution.ts";
import {ComposedTerminalPresenter} from "../../core/presentation/composed-terminal-presenter.ts";
import type {
  PresentationSegment,
  PresentationSemanticLevel,
  PresentationStream,
  TerminalPresenter,
  TerminalPresenterRuntimeHost,
  TerminalPresenterSink,
} from "../../core/presentation/terminal-presenter.ts";

/** One ordered output record observed by a {@link RecordingTerminalPresenterSink}. */
type RecordedPresentationOutput = Readonly<{
  /** Destination stream the presenter selected. */
  stream: PresentationStream;
  /** Plain concatenation of the composed segment text. */
  text: string;
  /** Whether the record is a raw write rather than a complete line. */
  write: boolean;
  /** Semantic level, present only for semantic lines. */
  level?: PresentationSemanticLevel;
}>;

/**
 * Stores ordered presenter output records for deterministic tests.
 */
export class RecordingTerminalPresenterSink implements TerminalPresenterSink {
  readonly #records: RecordedPresentationOutput[] = [];

  /** Ordered output received by this sink. */
  public get records(): readonly RecordedPresentationOutput[] {
    return this.#records;
  }

  /** {@inheritDoc TerminalPresenterSink.line} */
  public line(stream: PresentationStream, segments: readonly PresentationSegment[], level?: PresentationSemanticLevel): void {
    const text = segments.map((segment) => segment.text).join("");
    this.#records.push(level === undefined ? {stream, text, write: false} : {stream, text, write: false, level});
  }

  /** {@inheritDoc TerminalPresenterSink.write} */
  public write(stream: PresentationStream, segments: readonly PresentationSegment[]): void {
    this.#records.push({stream, text: segments.map((segment) => segment.text).join(""), write: true});
  }
}

/** Presentation host whose progress interval never fires, so no test depends on wall-clock timing. */
const recordingTerminalPresenterRuntimeHost: TerminalPresenterRuntimeHost = {
  stdoutIsTTY: false,
  noColor: true,
  scheduleInterval: () => ({cancel: (): void => undefined, unref: (): void => undefined}),
};

/**
 * Builds a colorless, timer-free presenter bound to a fresh recording sink.
 *
 * @param options - Optional context, presentation mode, and verbosity for the built presenter.
 * @returns The presenter and the sink that observes every record it emits.
 */
export function buildRecordingPresenter(
  options: Readonly<{context?: string; mode?: CommandPresentationMode; verbose?: boolean}> = {},
): Readonly<{presenter: TerminalPresenter; sink: RecordingTerminalPresenterSink}> {
  const sink = new RecordingTerminalPresenterSink();
  const presenter = new ComposedTerminalPresenter(options.context ?? "test", {
    mode: options.mode ?? "human",
    verbose: options.verbose ?? false,
    color: false,
    sink,
    runtimeHost: recordingTerminalPresenterRuntimeHost,
  });

  return {presenter, sink};
}
