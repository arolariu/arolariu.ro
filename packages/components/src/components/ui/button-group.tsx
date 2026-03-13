"use client";

import * as React from "react";

import {Separator} from "@/components/ui/separator";
import {cn} from "@/lib/utilities";
import styles from "./button-group.module.css";

/** Supported layout directions for {@link ButtonGroup}. */
export type ButtonGroupOrientation = "horizontal" | "vertical";

interface ButtonGroupVariantOptions {
  /** Orientation used to resolve the root style classes. @default "horizontal" */
  orientation?: ButtonGroupOrientation;
  /** Additional classes merged into the generated variant string. @default undefined */
  className?: string;
}

/**
 * Props for the {@link ButtonGroup} component.
 */
export interface ButtonGroupProps extends React.ComponentPropsWithoutRef<"div"> {
  /** Arrangement of grouped controls. @default "horizontal" */
  orientation?: ButtonGroupOrientation;
}

/**
 * Props for the {@link ButtonGroupText} component.
 */
export interface ButtonGroupTextProps extends React.ComponentPropsWithoutRef<"div"> {
  /** Enables rendering an existing div-compatible child element. @default false */
  asChild?: boolean;
}

/**
 * Props for the {@link ButtonGroupSeparator} component.
 */
export type ButtonGroupSeparatorProps = React.ComponentPropsWithoutRef<typeof Separator>;

/**
 * Returns the CSS class list for a button group root.
 *
 * @param options - Variant options used to derive the generated class string.
 * @returns The merged class name string for the requested orientation.
 *
 * @example
 * ```tsx
 * const className = buttonGroupVariants({orientation: "vertical"});
 * ```
 */
function buttonGroupVariants({orientation = "horizontal", className}: Readonly<ButtonGroupVariantOptions> = {}): string {
  return cn(styles.root, orientation === "vertical" ? styles.vertical : styles.horizontal, className);
}

/**
 * Aligns related buttons into a single visual control group.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<div>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <ButtonGroup>
 *   <button type='button'>Left</button>
 *   <button type='button'>Right</button>
 * </ButtonGroup>
 * ```
 *
 * @see {@link ButtonGroupProps} for available props
 */
const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({className, orientation = "horizontal", ...props}: Readonly<ButtonGroupProps>, ref): React.JSX.Element => (
    <div
      ref={ref}
      role='group'
      data-slot='button-group'
      data-orientation={orientation}
      className={buttonGroupVariants({orientation, className})}
      {...props}
    />
  ),
);

/**
 * Adds descriptive text content within a button group layout.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<div>` element by default
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <ButtonGroupText>Actions</ButtonGroupText>
 * ```
 *
 * @see {@link ButtonGroupTextProps} for available props
 */
const ButtonGroupText = React.forwardRef<HTMLDivElement, ButtonGroupTextProps>(
  ({className, asChild = false, children, ...props}: Readonly<ButtonGroupTextProps>, ref): React.JSX.Element => {
    const mergedClassName = cn(styles.text, className);

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<React.ComponentPropsWithoutRef<"div"> & {ref?: React.Ref<HTMLDivElement>}>;

      // eslint-disable-next-line react-x/no-clone-element -- replaces Radix Slot while preserving asChild prop merging
      return React.cloneElement(child, {
        ...props,
        ref,
        className: cn(mergedClassName, child.props.className),
      });
    }

    return (
      <div
        ref={ref}
        className={mergedClassName}
        {...props}>
        {children}
      </div>
    );
  },
);

/**
 * Inserts a separator between grouped controls.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a wrapped `Separator` component
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <ButtonGroupSeparator orientation='vertical' />
 * ```
 *
 * @see {@link ButtonGroupSeparatorProps} for available props
 */
const ButtonGroupSeparator = React.forwardRef<HTMLDivElement, ButtonGroupSeparatorProps>(
  ({className, orientation = "vertical", ...props}: Readonly<ButtonGroupSeparatorProps>, ref): React.JSX.Element => (
    <Separator
      ref={ref}
      data-slot='button-group-separator'
      orientation={orientation}
      className={cn(styles.separator, className)}
      {...props}
    />
  ),
);

ButtonGroup.displayName = "ButtonGroup";
ButtonGroupText.displayName = "ButtonGroupText";
ButtonGroupSeparator.displayName = "ButtonGroupSeparator";

export {ButtonGroup, ButtonGroupSeparator, ButtonGroupText, buttonGroupVariants};
