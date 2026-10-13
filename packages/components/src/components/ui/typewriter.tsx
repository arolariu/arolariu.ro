"use client";

import {motion, useInView} from "motion/react";
import * as React from "react";

import {useMediaQuery} from "@/hooks/useMediaQuery";
import {cn} from "@/lib/utilities";
import styles from "./typewriter.module.css";
import {VisuallyHidden} from "./visually-hidden";

/** Single word definition consumed by the typewriter components. */
export interface TypewriterWord {
  /** Word content split into animated Unicode code points at render time. */
  readonly text: string;
  /** Additional CSS classes merged with each rendered character. */
  readonly className?: string;
}

/** Native root attributes and animation options for both typewriter variants. */
export interface TypewriterTextProps extends Readonly<Omit<React.ComponentPropsWithoutRef<"div">, "children">> {
  /** Ordered words. Accessible text joins them with a single space. */
  readonly words: ReadonlyArray<TypewriterWord>;
  /** Additional CSS classes merged with the blinking decorative cursor. */
  readonly cursorClassName?: string;
}

const cursorTransition = {duration: 0.8, repeat: Infinity, repeatType: "reverse"} as const;

/**
 * Reveals text one character at a time when it enters the viewport.
 *
 * @remarks
 * Client component. A stable visually hidden phrase is readable immediately;
 * animated characters and the cursor are decorative. Reduced motion displays
 * completed text without a cursor. Changed word text restarts the entire
 * decorative phrase without replacing the root or accessible text node.
 *
 * @example
 * ```tsx
 * <TypewriterText words={[{text: "Hello"}, {text: "world"}]} aria-label="Greeting" />
 * ```
 */
const TypewriterText = React.forwardRef<HTMLDivElement, TypewriterTextProps>(
  ({words, className, cursorClassName, ...props}: Readonly<TypewriterTextProps>, ref): React.JSX.Element => {
    const scopeRef = React.useRef<HTMLDivElement>(null);
    const setRefs = React.useCallback(
      (node: HTMLDivElement | null): void | (() => void) => {
        scopeRef.current = node;
        if (typeof ref === "function") {
          const callback: React.RefCallback<HTMLDivElement> = ref;
          const cleanup = callback(node);
          if (typeof cleanup === "function")
            return () => {
              scopeRef.current = null;
              cleanup();
            };
        } else if (ref) ref.current = node;
      },
      [ref],
    );
    const isInView = useInView(scopeRef, {once: true});
    const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
    const fullText = words.map((word) => word.text).join(" ");
    const visualPhraseKey = JSON.stringify(words.map((word) => word.text));
    let characterOffset = 0;

    return (
      <div
        {...props}
        ref={setRefs}
        className={cn(styles.root, className)}
        data-motion={reduced || words.length === 0 ? "completed" : "running"}>
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
                          animate={{opacity: isInView ? 1 : 0}}
                          transition={{duration: 0.3, delay: (offset + characterIndex) * 0.1, ease: "easeInOut"}}
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
                animate={{opacity: 1}}
                transition={cursorTransition}
                className={cn(styles.cursor, cursorClassName)}
              />
            ) : null}
          </>
        ) : null}
      </div>
    );
  },
);
TypewriterText.displayName = "TypewriterText";

/**
 * Reveals a decorative text copy with a continuous width-based sweep.
 *
 * @remarks
 * Client component. The complete accessible phrase is present before reveal.
 * Reduced motion completes the visual text and removes the cursor immediately.
 * New words restart the sweep; root native attributes and refs are preserved.
 *
 * @example
 * ```tsx
 * <TypewriterTextSmooth words={[{text: "Smooth"}, {text: "typing"}]} />
 * ```
 */
const TypewriterTextSmooth = React.forwardRef<HTMLDivElement, TypewriterTextProps>(
  ({words, className, cursorClassName, ...props}: Readonly<TypewriterTextProps>, ref): React.JSX.Element => {
    const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
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
        {...props}
        ref={ref}
        className={cn(styles.smoothRoot, className)}
        data-motion={reduced || words.length === 0 ? "completed" : "running"}>
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
                transition={{duration: 2, ease: "linear", delay: 1}}>
                {visualText}
              </motion.div>
            )}
            {!reduced ? (
              <motion.span
                aria-hidden='true'
                data-slot='typewriter-cursor'
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                transition={cursorTransition}
                className={cn(styles.smoothCursor, cursorClassName)}
              />
            ) : null}
          </>
        ) : null}
      </div>
    );
  },
);
TypewriterTextSmooth.displayName = "TypewriterTextSmooth";

export {TypewriterText, TypewriterTextSmooth};
