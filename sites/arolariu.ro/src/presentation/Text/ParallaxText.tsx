/** @format */

"use client";

import {cn} from "@arolariu/components";
import {motion} from "motion/react";

type Props = {
  children?: React.ReactNode;
  className?: string;
  rows: {
    text: string;
    direction: "left" | "right";
    duration: number;
  }[];
};

export const ParallaxText = ({children, className, rows}: Readonly<Props>) => {
  return (
    <div className={cn("parallax text-muted-foreground/50 flex flex-col gap-1 overflow-hidden text-sm", className)}>
      {rows.map((row, index) => (
        <motion.div
          // eslint-disable-next-line react/no-array-index-key
          key={`${index}-${row.text}`}
          className='parallax-layer flex flex-nowrap whitespace-nowrap'
          animate={{
            x: row.direction === "left" ? [-1000, 0] : [0, -1000],
          }}
          transition={{
            duration: row.duration,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}>
          {Array.from({length: 10}).map((_, i) => (
            <span
              // eslint-disable-next-line react/no-array-index-key
              key={`${index}-${row.text}-${i}`}
              className='mr-4'>
              {row.text}
            </span>
          ))}
        </motion.div>
      ))}
      {children}
    </div>
  );
};
