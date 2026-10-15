"use client";

import {mergeProps} from "@base-ui/react/merge-props";
import type {HTMLProps} from "@base-ui/react/types";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {Separator} from "@/components/ui/separator";
import {cn} from "@/lib/utilities";
import styles from "./button-group.module.css";

/** Supported layout directions for {@link ButtonGroup}. */
export type ButtonGroupOrientation = "horizontal" | "vertical";

/** Options for generating {@link ButtonGroup} layout classes. */
export interface ButtonGroupVariantOptions {
  /** Orientation used to resolve the root style classes. @default "horizontal" */
  readonly orientation?: ButtonGroupOrientation;
  /** Additional classes merged into the generated variant string. @default undefined */
  readonly className?: string;
}

/**
 * Props for the {@link ButtonGroup} component.
 */
export type ButtonGroupProps = Readonly<
  React.ComponentPropsWithRef<"div"> & {
    /** Arrangement of grouped controls. @default "horizontal" */
    orientation?: ButtonGroupOrientation;
  }
>;

/** State exposed to {@link ButtonGroupText} render callbacks. */
export type ButtonGroupTextState = Readonly<{slot: "button-group-text"}>;

// Base UI resolves input object/callback refs to a merged callback (or null).
type ButtonGroupTextRenderProps = Readonly<
  Omit<HTMLProps<HTMLElement>, "ref"> & {
    ref?: React.RefCallback<HTMLElement> | null;
  }
>;

/**
 * Props for the {@link ButtonGroupText} component.
 */
export type ButtonGroupTextProps = Readonly<
  Omit<useRender.ComponentProps<"div", ButtonGroupTextState, ButtonGroupTextRenderProps>, "ref"> & {
    /** Ref to the actual rendered element; the default target is a div. */
    ref?: React.Ref<HTMLElement>;
  }
>;

/**
 * Props for the {@link ButtonGroupSeparator} component.
 */
export type ButtonGroupSeparatorProps = Readonly<React.ComponentPropsWithRef<typeof Separator>>;

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
const ButtonGroup = ({ref, className, orientation = "horizontal", ...props}: Readonly<ButtonGroupProps>): React.JSX.Element => (
  <div
    ref={ref}
    role='group'
    data-slot='button-group'
    data-orientation={orientation}
    className={buttonGroupVariants({orientation, className})}
    {...props}
  />
);

/**
 * Adds descriptive text content within a button group layout.
 *
 * @remarks
 * - Base UI owns render composition, merging both refs and event handlers.
 * - Renders a `<div>` by default; prefer `render` for labels or other markup.
 * - The common `HTMLElement` ref boundary supports refs to the chosen target.
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <ButtonGroupText>Actions</ButtonGroupText>
 * ```
 *
 * @see {@link ButtonGroupTextProps} for available props
 */
const ButtonGroupText = ({ref, className, render, children, ...props}: Readonly<ButtonGroupTextProps>): React.ReactElement => {
  return useRender<ButtonGroupTextState, HTMLElement>({
    defaultTagName: "div",
    ref,
    render,
    state: {slot: "button-group-text"},
    props: mergeProps<"div">({className: cn(styles.text, className)}, props, {children}),
  });
};

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
const ButtonGroupSeparator = ({
  ref,
  className,
  orientation = "vertical",
  ...props
}: Readonly<ButtonGroupSeparatorProps>): React.JSX.Element => (
  <Separator
    ref={ref}
    data-slot='button-group-separator'
    orientation={orientation}
    className={cn(styles.separator, className)}
    {...props}
  />
);

ButtonGroup.displayName = "ButtonGroup";
ButtonGroupText.displayName = "ButtonGroupText";
ButtonGroupSeparator.displayName = "ButtonGroupSeparator";

export {ButtonGroup, ButtonGroupSeparator, ButtonGroupText, buttonGroupVariants};
