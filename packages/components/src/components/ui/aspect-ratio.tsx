import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./aspect-ratio.module.css";

/**
 * Props for the {@link AspectRatio} component.
 */
export interface AspectRatioProps extends Readonly<React.HTMLAttributes<HTMLDivElement>> {
  /** Aspect ratio applied to the wrapper element. @default 1 */
  readonly ratio?: number | string;
  /** Native caller styles. `ratio` wins over `aspectRatio` and `--ac-aspect-ratio`. */
  readonly style?: AspectRatioStyle;
}

/** The approved dynamic ratio bridge; all authored layout remains in the CSS Module. */
export type AspectRatioStyle = React.CSSProperties & {readonly "--ac-aspect-ratio"?: number | string};

/**
 * Preserves a predictable width-to-height ratio for arbitrary content.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<div>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 * - Accepts numeric ratios and native CSS ratio strings, defaulting to a square
 * - The ratio prop remains authoritative over caller ratio styles; other caller styles are preserved
 * - The existing full-width, clipped wrapper and inherited radius remain CSS-owned
 *
 * @example
 * ```tsx
 * <AspectRatio ratio={16 / 9}>Media</AspectRatio>
 * ```
 *
 * @see {@link AspectRatioProps} for available props
 */
const AspectRatio = React.forwardRef<HTMLDivElement, AspectRatioProps>(
  ({className, ratio = 1, style, ...props}: Readonly<AspectRatioProps>, ref): React.JSX.Element => {
    const ratioStyle: AspectRatioStyle = {...style, aspectRatio: undefined, "--ac-aspect-ratio": String(ratio)};
    return (
      <div
        ref={ref}
        data-slot='aspect-ratio'
        className={cn(styles.root, className)}
        style={ratioStyle}
        {...props}
      />
    );
  },
);

AspectRatio.displayName = "AspectRatio";

// eslint-disable-next-line no-redeclare -- public component namespace
namespace AspectRatio {
  export type Props = AspectRatioProps;
}

export {AspectRatio};
