"use client";

import {Toolbar as BaseToolbar} from "@base-ui/react/toolbar";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./toolbar.module.css";

type ToolbarProps = React.ComponentPropsWithoutRef<typeof BaseToolbar.Root>;
type ToolbarButtonProps = React.ComponentPropsWithoutRef<typeof BaseToolbar.Button>;
type ToolbarGroupProps = React.ComponentPropsWithoutRef<typeof BaseToolbar.Group>;
type ToolbarSeparatorProps = React.ComponentPropsWithoutRef<typeof BaseToolbar.Separator>;
type ToolbarLinkProps = React.ComponentPropsWithoutRef<typeof BaseToolbar.Link>;

/**
 * Wraps the Base UI toolbar root with compact Mira spacing and borders.
 */
const Toolbar = React.forwardRef<HTMLDivElement, ToolbarProps>(
  ({className, ...props}: Readonly<ToolbarProps>, ref): React.JSX.Element => (
    <BaseToolbar.Root
      ref={ref}
      className={cn(styles.root, className)}
      {...props}
    />
  ),
);
Toolbar.displayName = "Toolbar";

/**
 * Renders a compact interactive toolbar button.
 */
const ToolbarButton = React.forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  ({className, ...props}: Readonly<ToolbarButtonProps>, ref): React.JSX.Element => (
    <BaseToolbar.Button
      ref={ref}
      className={cn(styles.item, styles.button, className)}
      {...props}
    />
  ),
);
ToolbarButton.displayName = "ToolbarButton";

/**
 * Groups toolbar items while preserving Base UI keyboard navigation semantics.
 */
const ToolbarGroup = React.forwardRef<HTMLDivElement, ToolbarGroupProps>(
  ({className, ...props}: Readonly<ToolbarGroupProps>, ref): React.JSX.Element => (
    <BaseToolbar.Group
      ref={ref}
      className={cn(styles.group, className)}
      {...props}
    />
  ),
);
ToolbarGroup.displayName = "ToolbarGroup";

/**
 * Renders a separator between toolbar items or groups.
 */
const ToolbarSeparator = React.forwardRef<HTMLDivElement, ToolbarSeparatorProps>(
  ({className, ...props}: Readonly<ToolbarSeparatorProps>, ref): React.JSX.Element => (
    <BaseToolbar.Separator
      ref={ref}
      className={cn(styles.separator, className)}
      {...props}
    />
  ),
);
ToolbarSeparator.displayName = "ToolbarSeparator";

/**
 * Renders a compact toolbar link with button-like affordances.
 */
const ToolbarLink = React.forwardRef<HTMLAnchorElement, ToolbarLinkProps>(
  ({className, ...props}: Readonly<ToolbarLinkProps>, ref): React.JSX.Element => (
    <BaseToolbar.Link
      ref={ref}
      className={cn(styles.item, styles.link, className)}
      {...props}
    />
  ),
);
ToolbarLink.displayName = "ToolbarLink";

export {Toolbar, ToolbarButton, ToolbarGroup, ToolbarLink, ToolbarSeparator};
