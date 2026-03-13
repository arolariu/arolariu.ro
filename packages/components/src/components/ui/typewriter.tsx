"use client";

import {motion, stagger, useAnimate, useInView} from "motion/react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./typewriter.module.css";

interface TypewriterWord {
  text: string;
  className?: string;
}

interface TypewriterProps {
  words: ReadonlyArray<TypewriterWord>;
  className?: string;
  cursorClassName?: string;
}

export const TypewriterText = ({words, className, cursorClassName}: TypewriterProps): React.JSX.Element => {
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
    <div className={cn(styles.root, className)}>
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
};

export const TypewriterTextSmooth = ({words, className, cursorClassName}: TypewriterProps): React.JSX.Element => {
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
    <div className={cn(styles.smoothRoot, className)}>
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
};
