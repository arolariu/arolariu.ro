/**
 * @fileoverview Progress-line state for composed terminal presentation.
 * @module scripts/core/presentation/terminal-progress
 *
 * @remarks
 * Split out of `composed-terminal-presenter.ts` to keep both modules inside the 500-line budget.
 * A progress line owns frame advancement, its scheduled interval, and the pause/clear sequence;
 * its presenter still owns mode gating, redaction, colour policy, and the active-progress slot.
 */

import type {
  PresentationScheduledInterval,
  PresentationSegment,
  PresentationStream,
  PresentationStyle,
  ProgressReporter,
} from "./terminal-presenter.ts";

const PROGRESS_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"] as const;
const PROGRESS_INTERVAL_MS = 80;

/** Pause and stop handles of one active progress line. */
interface ActiveProgress {
  readonly pause: () => void;
  readonly stop: () => void;
}

/** The single active-progress slot one presenter state tree shares. */
export interface TerminalProgressSlot {
  /** The progress line currently owning the terminal, if any. */
  activeProgress: ActiveProgress | null;
}

/** Everything one progress line needs from its owning presenter: terminal capability, the shared
 * single-progress slot, interval scheduling, and the presenter's redaction- and colour-aware emit. */
interface TerminalProgressHost {
  readonly interactive: boolean;
  readonly slot: TerminalProgressSlot;
  readonly scheduleInterval: (callback: () => void, intervalMs: number) => PresentationScheduledInterval;
  readonly emit: (stream: PresentationStream, segments: readonly PresentationSegment[], write: boolean) => void;
}

/**
 * Starts one progress line and returns the reporter that controls it.
 *
 * Starting a progress line stops the host's previous one, so a presenter tree never animates two
 * lines at once. A non-interactive terminal emits no frame and no cursor escape; only the final
 * `succeed`/`fail` message is written.
 *
 * @param initialMessage - Message displayed with the first frame.
 * @param host - Terminal capability and slot supplied by the owning presenter.
 * @returns The reporter controlling this progress line.
 */
export function createTerminalProgress(initialMessage: string, host: TerminalProgressHost): ProgressReporter {
  host.slot.activeProgress?.stop();

  let message = initialMessage;
  let frameIndex = 0;
  let active = true;
  let interval: PresentationScheduledInterval | null = null;
  let progressDisplayed = false;

  const renderProgress = (): void => {
    if (!active || !host.interactive) {
      return;
    }

    const frame = PROGRESS_FRAMES[frameIndex] ?? PROGRESS_FRAMES[0];
    frameIndex = (frameIndex + 1) % PROGRESS_FRAMES.length;
    host.emit("stdout", [{text: "\r"}, {text: frame, styles: ["cyan"]}, {text: ` ${message}`}], true);
    progressDisplayed = true;
  };

  const startProgress = (): void => {
    if (!active || !host.interactive || interval !== null) {
      return;
    }

    renderProgress();
    interval = host.scheduleInterval(renderProgress, PROGRESS_INTERVAL_MS);
    interval.unref();
  };

  const pauseProgress = (): void => {
    if (!active) {
      return;
    }

    if (interval !== null) {
      interval.cancel();
      interval = null;
    }
    if (host.interactive && progressDisplayed) {
      host.emit("stdout", [{text: "\r\u001B[K"}], true);
      progressDisplayed = false;
    }
  };

  const stopProgress = (): void => {
    if (!active) {
      return;
    }

    if (host.slot.activeProgress === activeProgress) {
      host.slot.activeProgress = null;
    }
    pauseProgress();
    active = false;
  };

  const activeProgress: ActiveProgress = {
    pause: pauseProgress,
    stop: stopProgress,
  };
  host.slot.activeProgress = activeProgress;

  startProgress();

  const finish = (stream: PresentationStream, icon: string, style: PresentationStyle, finalMessage: string): void => {
    if (!active) {
      return;
    }

    stopProgress();
    host.emit(stream, [{text: `${icon} `, styles: [style]}, {text: finalMessage}], false);
  };

  return {
    update: (updatedMessage: string): void => {
      if (!active) {
        return;
      }

      message = updatedMessage;
      if (interval === null) {
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
