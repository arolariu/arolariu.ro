"use client";

import {motion, useInView} from "motion/react";
import * as React from "react";

import {useMergedRefs} from "@/hooks/useMergedRefs";
import {cn} from "@/lib/utilities";
import styles from "./typewriter.module.css";
import {VisuallyHidden} from "./visually-hidden";
import {useVisualEffectPolicy, type VisualEffectOptions} from "./_visual-effects";

/** Single word definition consumed by the typewriter components. */
export interface TypewriterWord {
  /** Word content split into animated Unicode code points at render time. */
  readonly text: string;
  /** Additional CSS classes merged with each rendered character. */
  readonly className?: string;
}

/** Native root attributes and animation options for both typewriter variants. */
export interface TypewriterTextProps extends Readonly<Omit<React.ComponentPropsWithRef<"div">, "children">>, VisualEffectOptions {
  /** Ordered words. Accessible text joins them with a single space. */
  readonly words: ReadonlyArray<TypewriterWord>;
  /** Additional CSS classes merged with the blinking decorative cursor. */
  readonly cursorClassName?: string;
}

const cursorTransition = {duration: 0.8, repeat: Infinity, repeatType: "reverse"} as const;

function getMotionState(completed: boolean | undefined, paused: boolean, wordCount: number): "completed" | "paused" | "running" {
  if (completed || wordCount === 0) return "completed";
  return paused ? "paused" : "running";
}

/**
 * Reveals text one character at a time when it enters the viewport.
 *
 * @remarks
 * Client component. A stable visually hidden phrase is readable immediately;
 * animated characters and the cursor are decorative. Reduced motion displays
 * completed text without a cursor. Changed word text restarts the entire
 * decorative phrase without replacing the root or accessible text node.
 * The root is a generic `<div>`, which cannot be named: to label it, pair
 * `aria-label` with a role that supports naming, such as `role="group"`
 * (never `aria-label` alone).
 *
 * @example
 * ```tsx
 * <TypewriterText words={[{text: "Hello"}, {text: "world"}]} />
 * <TypewriterText role="group" aria-label="Greeting" words={[{text: "Hello"}, {text: "world"}]} />
 * ```
 */
function TypewriterText({
  ref,
  loop,
  motionPaused,
  words,
  className,
  cursorClassName,
  ...props
}: Readonly<TypewriterTextProps>): React.JSX.Element {
  const scopeRef = React.useRef<HTMLDivElement>(null);
  const setRefs = useMergedRefs(scopeRef, ref);
  const isInView = useInView(scopeRef, {once: true});
  const {paused, reducedMotion, settled} = useVisualEffectPolicy(scopeRef, {loop, motionPaused});
  const reduced = reducedMotion || settled || motionPaused;
  const fullText = words.map((word) => word.text).join(" ");
  const visualPhraseKey = JSON.stringify(words.map((word) => word.text));
  let characterOffset = 0;

  return (
    <div
      ref={setRefs}
      className={cn(styles.root, className)}
      data-motion={getMotionState(reduced, paused, words.length)}
      {...props}>
      {words.length > 0 ? (
        <>
          <VisuallyHidden data-slot='typewriter-text'>{fullText}</VisuallyHidden>
          <div
            key={visualPhraseKey}
            aria-hidden='true'
            data-slot='typewriter-visual'
            className={styles.inline}>
            {words.map((word, wordIndex) => {
              const offset = characterOffset;
              characterOffset += [...word.text].length;
              return (
                <span
                  key={`${wordIndex}-${word.text}`}
                  className={styles.word}>
                  {[...word.text].map((character, characterIndex) =>
                    reduced ? (
                      <span
                        key={characterIndex}
                        className={cn(styles.visibleCharacter, word.className)}>
                        {character}
                      </span>
                    ) : (
                      <motion.span
                        key={characterIndex}
                        initial={{opacity: 0}}
                        animate={{opacity: isInView && !paused ? 1 : 0}}
                        transition={
                          paused ? {duration: 0} : {duration: 0.3, delay: Math.min(4.5, (offset + characterIndex) * 0.1), ease: "easeInOut"}
                        }
                        className={cn(styles.hiddenCharacter, word.className)}>
                        {character}
                      </motion.span>
                    ),
                  )}
                  {wordIndex < words.length - 1 ? "\u00A0" : null}
                </span>
              );
            })}
          </div>
          {!reduced ? (
            <motion.span
              aria-hidden='true'
              data-slot='typewriter-cursor'
              initial={{opacity: 0}}
              animate={{opacity: paused ? 0 : 1}}
              transition={paused ? {duration: 0} : cursorTransition}
              className={cn(styles.cursor, cursorClassName)}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
TypewriterText.displayName = "TypewriterText";

/**
 * Reveals a decorative text copy with a continuous width-based sweep.
 *
 * @remarks
 * Client component. The complete accessible phrase is present before reveal.
 * Reduced motion completes the visual text and removes the cursor immediately.
 * New words restart the sweep; root native attributes and refs are preserved.
 * Like {@link TypewriterText}, the generic `<div>` root is named only through a
 * role that supports naming (`role="group"` with `aria-label`).
 *
 * @example
 * ```tsx
 * <TypewriterTextSmooth words={[{text: "Smooth"}, {text: "typing"}]} />
 * ```
 */
function TypewriterTextSmooth({
  ref,
  loop,
  motionPaused,
  words,
  className,
  cursorClassName,
  ...props
}: Readonly<TypewriterTextProps>): React.JSX.Element {
  const localRef = React.useRef<HTMLDivElement>(null);
  const setRefs = useMergedRefs(localRef, ref);
  const {paused, reducedMotion, settled} = useVisualEffectPolicy(localRef, {loop, motionPaused});
  const reduced = reducedMotion || settled || motionPaused;
  const fullText = words.map((word) => word.text).join(" ");
  const visualText = (
    <div className={styles.smoothText}>
      {words.map((word, wordIndex) => (
        <span
          key={`${wordIndex}-${word.text}`}
          className={cn(styles.word, styles.visibleCharacter, word.className)}>
          {word.text}
          {wordIndex < words.length - 1 ? "\u00A0" : null}
        </span>
      ))}
    </div>
  );

  return (
    <div
      ref={setRefs}
      className={cn(styles.smoothRoot, className)}
      data-motion={getMotionState(reduced, paused, words.length)}
      {...props}>
      {words.length > 0 ? (
        <>
          <VisuallyHidden data-slot='typewriter-text'>{fullText}</VisuallyHidden>
          {reduced ? (
            <div
              aria-hidden='true'
              data-slot='typewriter-visual'
              className={styles.smoothViewport}>
              {visualText}
            </div>
          ) : (
            <motion.div
              key={fullText}
              aria-hidden='true'
              data-slot='typewriter-visual'
              className={styles.smoothViewport}
              initial={{width: "0%"}}
              whileInView={{width: "fit-content"}}
              transition={paused ? {duration: 0} : {duration: 2, ease: "linear", delay: 1}}>
              {visualText}
            </motion.div>
          )}
          {!reduced ? (
            <motion.span
              aria-hidden='true'
              data-slot='typewriter-cursor'
              initial={{opacity: 0}}
              animate={{opacity: paused ? 0 : 1}}
              transition={paused ? {duration: 0} : cursorTransition}
              className={cn(styles.smoothCursor, cursorClassName)}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
TypewriterTextSmooth.displayName = "TypewriterTextSmooth";

export {TypewriterText, TypewriterTextSmooth};
