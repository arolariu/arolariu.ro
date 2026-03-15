import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./aspect-ratio.module.css";

/**
 * Props for the {@link AspectRatio} component.
 */
export interface AspectRatioProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Aspect ratio applied to the wrapper element. @default 1 */
  ratio?: number | string;
}

/**
 * Preserves a predictable width-to-height ratio for arbitrary content.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<div>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <AspectRatio ratio={16 / 9}>Media</AspectRatio>
 * ```
 *
 * @see {@link AspectRatioProps} for available props
 */
const AspectRatio = React.forwardRef<HTMLDivElement, AspectRatioProps>(
  ({className, ratio = 1, style, ...props}: Readonly<AspectRatioProps>, ref): React.JSX.Element => (
    <div
      ref={ref}
      className={cn(styles.root, className)}
      style={{...style, aspectRatio: String(ratio)}}
      {...props}
    />
  ),
);

AspectRatio.displayName = "AspectRatio";

export {AspectRatio};
