"use client";

import {motion, stagger, useAnimate, useInView} from "motion/react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./typewriter.module.css";

/** Single word definition consumed by the typewriter components. */
export interface TypewriterWord {
  /** Word content split into animated characters at render time. @default undefined */
  text: string;
  /** Additional CSS classes merged with each rendered character. @default undefined */
  className?: string;
}

/** Props accepted by {@link TypewriterText} and {@link TypewriterTextSmooth}. */
export interface TypewriterTextProps {
  /** Ordered list of words rendered by the typewriter animation. @default undefined */
  words: ReadonlyArray<TypewriterWord>;
  /** Additional CSS classes merged with the outer container. @default undefined */
  className?: string;
  /** Additional CSS classes merged with the blinking cursor element. @default undefined */
  cursorClassName?: string;
}

/**
 * Reveals text one character at a time with a stepped typewriter animation.
 *
 * @remarks
 * - Animated component using the `motion` library
 * - Renders a `<div>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 * - Client-side only (`"use client"` directive)
 *
 * @example
 * ```tsx
 * <TypewriterText words={[{text: "Hello"}, {text: "world"}]} />
 * ```
 *
 * @see {@link TypewriterTextProps} for available props
 */
const TypewriterText = React.forwardRef<HTMLDivElement, TypewriterTextProps>(
  ({words, className, cursorClassName}: Readonly<TypewriterTextProps>, ref): React.JSX.Element => {
    const wordsArray = words.map((word) => ({
      ...word,
      text: [...word.text],
    }));

    const [scope, animate] = useAnimate();
    const isInView = useInView(scope);

    React.useEffect(() => {
      if (!isInView) {
        return;
      }

      animate(
        "span",
        {
          display: "inline-block",
          opacity: 1,
          width: "fit-content",
        },
        {
          duration: 0.3,
          delay: stagger(0.1),
          ease: "easeInOut",
        },
      );
    }, [animate, isInView]);

    return (
      <div
        ref={ref}
        className={cn(styles.root, className)}>
        <motion.div
          ref={scope}
          className={styles.inline}>
          {wordsArray.map((word, wordIndex) => (
            <div
              key={`word-${wordIndex}`}
              className={styles.word}>
              {word.text.map((character, characterIndex) => (
                <motion.span
                  initial={{}}
                  key={`char-${characterIndex}`}
                  className={cn(styles.hiddenCharacter, word.className)}>
                  {character}
                </motion.span>
              ))}
              &nbsp;
            </div>
          ))}
        </motion.div>
        <motion.span
          initial={{opacity: 0}}
          animate={{opacity: 1}}
          transition={{duration: 0.8, repeat: Infinity, repeatType: "reverse"}}
          className={cn(styles.cursor, cursorClassName)}
        />
      </div>
    );
  },
);
TypewriterText.displayName = "TypewriterText";

/**
 * Reveals text with a continuous width-based typewriter sweep animation.
 *
 * @remarks
 * - Animated component using the `motion` library
 * - Renders a `<div>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 * - Client-side only (`"use client"` directive)
 *
 * @example
 * ```tsx
 * <TypewriterTextSmooth words={[{text: "Smooth"}, {text: "typing"}]} />
 * ```
 *
 * @see {@link TypewriterTextProps} for available props
 */
const TypewriterTextSmooth = React.forwardRef<HTMLDivElement, TypewriterTextProps>(
  ({words, className, cursorClassName}: Readonly<TypewriterTextProps>, ref): React.JSX.Element => {
    const wordsArray = words.map((word) => ({
      ...word,
      text: [...word.text],
    }));

    const renderWords = (): React.JSX.Element => {
      return (
        <div>
          {wordsArray.map((word, wordIndex) => (
            <div
              key={`word-${wordIndex}`}
              className={styles.word}>
              {word.text.map((character, characterIndex) => (
                <span
                  key={`char-${characterIndex}`}
                  className={cn(styles.visibleCharacter, word.className)}>
                  {character}
                </span>
              ))}
              &nbsp;
            </div>
          ))}
        </div>
      );
    };

    return (
      <div
        ref={ref}
        className={cn(styles.smoothRoot, className)}>
        <motion.div
          className={styles.smoothViewport}
          initial={{width: "0%"}}
          whileInView={{width: "fit-content"}}
          transition={{duration: 2, ease: "linear", delay: 1}}>
          <div className={styles.smoothText}>{renderWords()}</div>
        </motion.div>
        <motion.span
          initial={{opacity: 0}}
          animate={{opacity: 1}}
          transition={{duration: 0.8, repeat: Infinity, repeatType: "reverse"}}
          className={cn(styles.smoothCursor, cursorClassName)}
        />
      </div>
    );
  },
);
TypewriterTextSmooth.displayName = "TypewriterTextSmooth";

export {TypewriterText, TypewriterTextSmooth};
