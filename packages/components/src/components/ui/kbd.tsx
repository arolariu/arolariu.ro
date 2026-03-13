"use client";

import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./kbd.module.css";

/**
 * Props for the {@link Kbd} component.
 */
export type KbdProps = React.ComponentPropsWithoutRef<"kbd">;

/**
 * Props for the {@link KbdGroup} component.
 */
export type KbdGroupProps = React.ComponentPropsWithoutRef<"kbd">;

/**
 * Renders an inline keyboard keycap label.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<kbd>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <Kbd>⌘K</Kbd>
 * ```
 *
 * @see {@link KbdProps} for available props
 */
const Kbd = React.forwardRef<HTMLElement, KbdProps>(
  ({className, ...props}: Readonly<KbdProps>, ref): React.JSX.Element => (
    <kbd
      ref={ref}
      data-slot='kbd'
      className={cn(styles.kbd, className)}
      {...props}
    />
  ),
);

/**
 * Groups multiple keyboard keycap labels into a shared visual cluster.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<kbd>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <KbdGroup>
 *   <Kbd>⌘</Kbd>
 *   <Kbd>K</Kbd>
 * </KbdGroup>
 * ```
 *
 * @see {@link KbdGroupProps} for available props
 */
const KbdGroup = React.forwardRef<HTMLElement, KbdGroupProps>(
  ({className, ...props}: Readonly<KbdGroupProps>, ref): React.JSX.Element => (
    <kbd
      ref={ref}
      data-slot='kbd-group'
      className={cn(styles.group, className)}
      {...props}
    />
  ),
);

Kbd.displayName = "Kbd";
KbdGroup.displayName = "KbdGroup";

export {Kbd, KbdGroup};
