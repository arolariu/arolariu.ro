"use client";

import {motion, type SpringOptions, type Transition, useMotionValue, useSpring} from "motion/react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./bubble-background.module.css";

export interface BubbleBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  transition?: SpringOptions;
  colors?: {
    first: string;
    second: string;
    third: string;
    fourth: string;
    fifth: string;
    sixth: string;
  };
}

type BubbleStyleProperties = React.CSSProperties & {
  "--ac-bubble-first-color": string;
  "--ac-bubble-second-color": string;
  "--ac-bubble-third-color": string;
  "--ac-bubble-fourth-color": string;
  "--ac-bubble-fifth-color": string;
  "--ac-bubble-sixth-color": string;
};

const BubbleBackground = React.forwardRef<HTMLDivElement, BubbleBackgroundProps>(
  (
    {
      className,
      children,
      interactive = false,
      transition = {stiffness: 100, damping: 20},
      colors = {
        first: "18,113,255",
        second: "221,74,255",
        third: "0,220,255",
        fourth: "200,50,50",
        fifth: "180,180,50",
        sixth: "140,100,255",
      },
      ...props
    },
    ref,
  ) => {
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useImperativeHandle(ref, () => containerRef.current!, []);

    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const springX = useSpring(mouseX, transition);
    const springY = useSpring(mouseY, transition);

    React.useEffect(() => {
      if (!interactive) {
        return;
      }

      const currentContainer = containerRef.current;
      if (!currentContainer) {
        return;
      }

      const handleMouseMove = (event: MouseEvent): void => {
        const rect = currentContainer.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        mouseX.set(event.clientX - centerX);
        mouseY.set(event.clientY - centerY);
      };

      currentContainer.addEventListener("mousemove", handleMouseMove);

      return () => {
        currentContainer.removeEventListener("mousemove", handleMouseMove);
      };
    }, [interactive, mouseX, mouseY]);

    const style: BubbleStyleProperties = {
      "--ac-bubble-first-color": colors.first,
      "--ac-bubble-second-color": colors.second,
      "--ac-bubble-third-color": colors.third,
      "--ac-bubble-fourth-color": colors.fourth,
      "--ac-bubble-fifth-color": colors.fifth,
      "--ac-bubble-sixth-color": colors.sixth,
    };

    return (
      <div
        ref={containerRef}
        className={cn(styles.root, className)}
        style={style}
        {...props}>
        <svg
          xmlns='http://www.w3.org/2000/svg'
          className={styles.hiddenSvg}
          aria-hidden='true'>
          <defs>
            <filter id='goo'>
              <feGaussianBlur
                in='SourceGraphic'
                stdDeviation='10'
                result='blur'
              />
              <feColorMatrix
                in='blur'
                mode='matrix'
                values='1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8'
                result='goo'
              />
              <feBlend
                in='SourceGraphic'
                in2='goo'
              />
            </filter>
          </defs>
        </svg>

        <div className={styles.filterLayer}>
          <motion.div
            className={cn(styles.bubble, styles.bubbleFirst)}
            animate={{y: [-50, 50, -50]}}
            transition={{duration: 30, ease: "easeInOut", repeat: Infinity}}
          />

          <motion.div
            className={cn(styles.rotator, styles.rotatorSecond)}
            animate={{rotate: 360}}
            transition={
              {
                duration: 20,
                ease: "linear",
                repeat: Infinity,
                repeatType: "reverse",
              } satisfies Transition
            }>
            <div className={cn(styles.bubble, styles.bubbleSecond)} />
          </motion.div>

          <motion.div
            className={cn(styles.rotator, styles.rotatorThird)}
            animate={{rotate: 360}}
            transition={{duration: 40, ease: "linear", repeat: Infinity}}>
            <div className={cn(styles.bubble, styles.bubbleThird)} />
          </motion.div>

          <motion.div
            className={cn(styles.bubble, styles.bubbleFourth)}
            animate={{x: [-50, 50, -50]}}
            transition={{duration: 40, ease: "easeInOut", repeat: Infinity}}
          />

          <motion.div
            className={cn(styles.rotator, styles.rotatorFifth)}
            animate={{rotate: 360}}
            transition={{duration: 20, ease: "linear", repeat: Infinity}}>
            <div className={cn(styles.bubble, styles.bubbleFifth)} />
          </motion.div>

          {interactive ? (
            <motion.div
              className={cn(styles.bubble, styles.bubbleInteractive)}
              style={{x: springX, y: springY}}
            />
          ) : null}
        </div>

        {children}
      </div>
    );
  },
);

BubbleBackground.displayName = "BubbleBackground";

export {BubbleBackground};
