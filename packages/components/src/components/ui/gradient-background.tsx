"use client";

import {motion, type HTMLMotionProps, type Transition} from "motion/react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./gradient-background.module.css";

export interface GradientBackgroundProps extends HTMLMotionProps<"div"> {
  transition?: Transition;
}

const GradientBackground = React.forwardRef<HTMLDivElement, GradientBackgroundProps>(
  ({className, transition = {duration: 15, ease: "easeInOut", repeat: Infinity}, ...props}, ref) => {
    // eslint-disable-next-line sonarjs/no-unused-vars -- removing React key avoids implicit key spreading
    const {key: _ignoredKey, ...restProps} = props;

    return (
      <motion.div
        ref={ref}
        className={cn(styles.root, className)}
        animate={{
          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
        }}
        transition={transition}
        {...restProps}
      />
    );
  },
);

GradientBackground.displayName = "GradientBackground";

export {GradientBackground};
