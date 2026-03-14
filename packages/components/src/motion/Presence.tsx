"use client";

import {AnimatePresence} from "motion/react";
import * as React from "react";

/**
 * Represents the configurable props for the {@link Presence} component.
 */
interface PresenceProps {
  /**
   * Whether the child should be mounted and visible.
   */
  present: boolean;
  /**
   * The animated child element.
   */
  children: React.ReactNode;
  /**
   * AnimatePresence mode.
   * @default "sync"
   */
  mode?: "wait" | "sync" | "popLayout";
}

/**
 * Simplified mount/unmount animation wrapper built on `AnimatePresence`.
 *
 * @example
 * ```tsx
 * <Presence present={isOpen}>
 *   <motion.div {...fadeIn}>Content</motion.div>
 * </Presence>
 * ```
 *
 * @see {@link https://motion.dev/docs/react-animate-presence | motion AnimatePresence}
 */
function Presence({present, children, mode = "sync"}: Readonly<PresenceProps>): React.JSX.Element {
  return <AnimatePresence mode={mode}>{present ? children : null}</AnimatePresence>;
}

Presence.displayName = "Presence";

export {Presence};
export type {PresenceProps};
