/**
 * @fileoverview The whole Node terminal adapter: styled output routing and terminal policy.
 * @module scripts/adapters/node/node-terminal-sink
 *
 * @remarks
 * This is the sole module allowed to turn composed presentation segments into real terminal bytes.
 * It owns ANSI styling, the semantic console-method selection, the raw stream writes, and the
 * Node-backed terminal, `NO_COLOR`, and interval policy. The presentation core decides what is
 * emitted and whether styling is allowed; this adapter only decides how those bytes leave the
 * process. Both halves share one file: together they stay well below the module budget and always
 * change for the same reason.
 */

import {styleText} from "node:util";

import type {
  PresentationScheduledInterval,
  PresentationSegment,
  PresentationSemanticLevel,
  PresentationStream,
  PresentationStyle,
  TerminalPresenterRuntimeHost,
  TerminalPresenterSink,
} from "../../core/presentation/terminal-presenter.ts";

/**
 * Renders already redacted segments into terminal text, styling each styled segment.
 *
 * @param segments - Already redacted presentation segments.
 * @returns The concatenated, optionally styled terminal text.
 */
function renderSegments(segments: readonly PresentationSegment[]): string {
  return segments
    .map((segment) => {
      const styles = segment.styles ?? [];
      if (styles.length === 0) {
        return segment.text;
      }

      const format: PresentationStyle | PresentationStyle[] = styles.length === 1 ? (styles[0] ?? "white") : [...styles];
      return styleText(format, segment.text, {validateStream: false});
    })
    .join("");
}

/**
 * Writes composed presenter output to the Node process console and output streams.
 */
export class NodeTerminalPresenterSink implements TerminalPresenterSink {
  /** {@inheritDoc TerminalPresenterSink.line} */
  public line(stream: PresentationStream, segments: readonly PresentationSegment[], level?: PresentationSemanticLevel): void {
    const text = renderSegments(segments);

    if (level === undefined) {
      if (stream === "stderr") {
        console.error(text);
        return;
      }

      console.log(text);
      return;
    }

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

  /** {@inheritDoc TerminalPresenterSink.write} */
  public write(stream: PresentationStream, segments: readonly PresentationSegment[]): void {
    const text = renderSegments(segments);

    if (stream === "stderr") {
      process.stderr.write(text);
      return;
    }

    process.stdout.write(text);
  }
}

/**
 * Sole Node.js-backed {@link TerminalPresenterRuntimeHost}: real terminal and colour policy plus
 * native interval scheduling behind an explicit cancellation handle.
 */
export const nodeTerminalPresenterRuntimeHost: TerminalPresenterRuntimeHost = {
  stdoutIsTTY: process.stdout.isTTY === true,
  noColor: Object.hasOwn(process.env, "NO_COLOR"),
  scheduleInterval: (callback: () => void, intervalMs: number): PresentationScheduledInterval => {
    const timer = setInterval(callback, intervalMs);
    return {
      cancel: (): void => {
        clearInterval(timer);
      },
      unref: (): void => {
        timer.unref();
      },
    };
  },
};
