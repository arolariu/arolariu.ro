/** @format */

"use client";

import {cn} from "@arolariu/components";
import {motion, stagger, useAnimate, useInView} from "motion/react";
import {useEffect} from "react";

type Word = {text: string; className?: string} | string;
type Props = {
  words: Word[];
  className?: string;
  cursorClassName?: string;
};

export const TypewriterText = ({words, className, cursorClassName}: Readonly<Props>) => {
  const [scope, animate] = useAnimate();
  const isInView = useInView(scope);

  useEffect(() => {
    if (isInView) {
      animate(
        "span",
        {
          display: "inline-block",
          opacity: 1,
        },
        {
          duration: 0.3,
          delay: stagger(0.1),
          ease: "easeInOut",
        },
      );
    }
  }, [isInView, animate]);

  const renderWords = () => {
    return (
      <motion.div
        ref={scope}
        className='inline'>
        {words.map((word, idx) => {
          // Check if the word is a string or an object
          const isString = typeof word === "string";
          const wordText = isString ? word : word.text;
          return (
            <div
              // eslint-disable-next-line react/no-array-index-key
              key={`${idx}-${wordText}`}
              className='inline-block'>
              {[...wordText].map((char, index) => (
                <motion.span
                  initial={{
                    opacity: 0,
                    display: "none",
                  }}
                  // eslint-disable-next-line react/no-array-index-key
                  key={`${idx}-${isString ? wordText : word.text}-${index}`}
                  className={cn(isString ? undefined : word.className)}>
                  {char}
                </motion.span>
              ))}
              &nbsp;
            </div>
          );
        })}
      </motion.div>
    );
  };

  return (
    <div className={cn("flex items-center justify-center justify-items-center", className)}>
      <div className='inline-block'>{renderWords()}</div>
      <motion.span
        initial={{opacity: 0}}
        animate={{opacity: 1}}
        transition={{
          duration: 0.8,
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "reverse",
        }}
        className={cn("bg-primary ml-1 inline-block h-6 w-[2px] rounded-full", cursorClassName)}
      />
    </div>
  );
};
