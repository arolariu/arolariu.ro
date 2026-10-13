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
export function useVisualEffectPolicy<TElement extends Element>(ref: React.RefObject<TElement | null>): VisualEffectPolicy {
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
  return {reducedMotion, documentHidden, visible, paused: reducedMotion || documentHidden || !visible};
}
