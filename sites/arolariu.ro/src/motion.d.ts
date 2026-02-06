/**
 * Type augmentation for motion/framer-motion with React 19.
 *
 * React 19 moved JSX types from global `JSX` namespace to `React.JSX`.
 * framer-motion v12 still references the global `JSX.IntrinsicElements`,
 * which resolves to `unknown` and breaks className/style props on
 * motion components (e.g. `motion.div`, `motion.section`).
 *
 * This declaration re-exports the React.JSX namespace globally so
 * framer-motion's `HTMLMotionProps<Tag>` picks up the correct element types.
 *
 * @see https://github.com/motiondivision/motion/issues/2981
 */

import type React from "react";

declare global {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface IntrinsicElements extends React.JSX.IntrinsicElements {}
    type Element = React.JSX.Element;
    type ElementClass = React.JSX.ElementClass;
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface IntrinsicAttributes extends React.JSX.IntrinsicAttributes {}
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface IntrinsicClassAttributes<T> extends React.JSX.IntrinsicClassAttributes<T> {}
    type ElementAttributesProperty = React.JSX.ElementAttributesProperty;
    type ElementChildrenAttribute = React.JSX.ElementChildrenAttribute;
  }
}

export {};
