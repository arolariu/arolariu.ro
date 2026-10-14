"use client";

import * as React from "react";
import {useInView} from "motion/react";
import {useReducedMotion} from "@/hooks/useReducedMotion";

interface MotionPreferences {
  readonly reducedMotion: boolean;
  readonly documentHidden: boolean;
}

interface VisualEffectPolicy extends MotionPreferences {
  readonly visible: boolean;
  readonly paused: boolean;
  readonly settled: boolean;
}

/** Shared per-instance controls required by public prop declarations; this module is not a public entrypoint. */
export interface VisualEffectOptions {
  /** Stop nonessential motion. Supply a localized native pause/resume control when using `loop`. @default false */
  readonly motionPaused?: boolean;
  /** Intentionally continue past five seconds; requires a caller-owned pause/stop control. @default false */
  readonly loop?: boolean;
}

const serverPreferences: MotionPreferences = {reducedMotion: true, documentHidden: false};

/**
 * Observes per-instance visibility and live platform motion preferences.
 *
 * @internal
 * Starts paused until the first intersecting observation. Keep reveal/replay state
 * separate from this resource policy. Motion14's real reduced-motion hook is retained,
 * with a native subscription for preference changes it does not currently publish.
 */
export function useVisualEffectPolicy<TElement extends Element>(
  ref: React.RefObject<TElement | null>,
  {motionPaused = false, loop = false}: Readonly<VisualEffectOptions> = {},
): VisualEffectPolicy {
  const [settled, setSettled] = React.useState(false);
  React.useEffect(() => {
    if (loop || settled) return;
    // Wall-clock lifetime, not a restartable viewport timer: toggling visibility
    // must not extend automatic motion indefinitely (WCAG 2.2.2).
    const settleMotion = (): void => {
      setSettled(true);
    };
    const timer = globalThis.setTimeout(settleMotion, 5000);
    return (): void => globalThis.clearTimeout(timer);
  }, [loop, settled]);
  const initialReducedMotion = useReducedMotion();
  const preferences = React.useMemo(() => {
    const media = typeof window === "undefined" ? null : globalThis.matchMedia("(prefers-reduced-motion: reduce)");
    let previous = serverPreferences;
    return {
      subscribe(notify: () => void): () => void {
        media?.addEventListener("change", notify);
        document.addEventListener("visibilitychange", notify);
        return (): void => {
          media?.removeEventListener("change", notify);
          document.removeEventListener("visibilitychange", notify);
        };
      },
      snapshot(): MotionPreferences {
        const reducedMotion = media?.matches ?? initialReducedMotion !== false;
        const documentHidden = document.visibilityState === "hidden";
        if (previous.reducedMotion !== reducedMotion || previous.documentHidden !== documentHidden) {
          previous = {reducedMotion, documentHidden};
        }
        return previous;
      },
    };
  }, [initialReducedMotion]);
  const {reducedMotion, documentHidden} = React.useSyncExternalStore(preferences.subscribe, preferences.snapshot, () => serverPreferences);
  const visible = useInView(ref);
  return {
    reducedMotion,
    documentHidden,
    visible,
    settled: !loop && settled,
    paused: motionPaused || (!loop && settled) || reducedMotion || documentHidden || !visible,
  };
}
