"use client";

import {motion} from "motion/react";
import type {ReactNode} from "react";

/**
 * Props for the StaggerContainer component.
 */
type StaggerContainerProps = {
  /**
   * Child elements to animate with stagger effect.
   */
  children: ReactNode;

  /**
   * Delay between each child's animation (in seconds).
   * @default 0.1
   */
  staggerDelay?: number;

  /**
   * Optional CSS class name for the container.
   */
  className?: string;
};

/**
 * Props for the StaggerItem component.
 */
type StaggerItemProps = {
  /**
   * Content to animate as a stagger item.
   */
  children: ReactNode;

  /**
   * Optional CSS class name for the item.
   */
  className?: string;
};

/**
 * StaggerContainer - A wrapper that staggers children animations.
 *
 * @remarks
 * This component creates a parent container that controls the staggered timing
 * of its children. Use with StaggerItem components as children for best results.
 *
 * @example
 * ```tsx
 * <StaggerContainer staggerDelay={0.1}>
 *   <StaggerItem><Card /></StaggerItem>
 *   <StaggerItem><Card /></StaggerItem>
 *   <StaggerItem><Card /></StaggerItem>
 * </StaggerContainer>
 * ```
 *
 * @param props - Component properties
 * @returns A React element that staggers child animations
 */
export function StaggerContainer({children, staggerDelay = 0.1, className}: Readonly<StaggerContainerProps>): React.JSX.Element {
  return (
    <motion.div
      className={className}
      initial='hidden'
      animate='visible'
      variants={{
        hidden: {opacity: 0},
        visible: {
          opacity: 1,
          transition: {staggerChildren: staggerDelay},
        },
      }}>
      {children}
    </motion.div>
  );
}

/**
 * StaggerItem - A child element for StaggerContainer with animated entrance.
 *
 * @remarks
 * This component should be used as a direct child of StaggerContainer.
 * It animates from below with a spring animation.
 *
 * @example
 * ```tsx
 * <StaggerItem>
 *   <div>Content here</div>
 * </StaggerItem>
 * ```
 *
 * @param props - Component properties
 * @returns A React element with stagger animation variants
 */
export function StaggerItem({children, className}: Readonly<StaggerItemProps>): React.JSX.Element {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: {y: 20, opacity: 0},
        visible: {
          y: 0,
          opacity: 1,
          transition: {type: "spring", stiffness: 300, damping: 24},
        },
      }}>
      {children}
    </motion.div>
  );
}
