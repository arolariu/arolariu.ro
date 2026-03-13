"use client";

import {Separator as BaseSeparator} from "@base-ui/react/separator";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./separator.module.css";

/**
 * Represents the configurable props for the Separator component.
 *
 * @remarks
 * Extends the Base UI separator primitive props and documents the orientation default
 * plus the legacy decorative flag retained for API compatibility.
 *
 * @default orientation `"horizontal"`
 * @default decorative `true`
 */
export interface SeparatorProps extends React.ComponentPropsWithoutRef<typeof BaseSeparator> {
  /**
   * Additional CSS classes merged with the separator track styles.
   */
  className?: string;
  /**
   * The visual axis used when rendering the separator line.
   *
   * @default "horizontal"
   */
  orientation?: "horizontal" | "vertical";
  /**
   * Legacy compatibility flag retained by the wrapper but not forwarded to Base UI.
   *
   * @default true
   */
  decorative?: boolean;
}

/**
 * A thin divider for separating content horizontally or vertically.
 *
 * @remarks
 * **Rendering Context**: Client Component.
 *
 * Wraps the Base UI separator primitive and applies design-system spacing and color.
 * By default it is decorative, making it ideal for purely visual section dividers.
 *
 * @example
 * ```tsx
 * <div>
 *   <span>Profile</span>
 *   <Separator className="my-4" />
 *   <span>Preferences</span>
 * </div>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/separator Base UI Separator docs}
 */
const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({className, orientation = "horizontal", decorative: _decorative = true, ...props}, ref) => (
    <BaseSeparator
      ref={ref}
      className={cn(styles.separator, orientation === "horizontal" ? styles.horizontal : styles.vertical, className)}
      orientation={orientation}
      {...props}
    />
  ),
);
Separator.displayName = "Separator";

export {Separator};
