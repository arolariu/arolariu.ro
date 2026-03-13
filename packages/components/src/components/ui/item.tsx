"use client";

import * as React from "react";

import {Separator} from "@/components/ui/separator";
import {cn} from "@/lib/utilities";
import styles from "./item.module.css";

/** Supported surface variants for {@link Item}. */
export type ItemVariant = "default" | "outline" | "muted";

/** Supported size variants for {@link Item}. */
export type ItemSize = "default" | "sm";

/** Supported media treatments for {@link ItemMedia}. */
export type ItemMediaVariant = "default" | "icon" | "image";

type ItemDataAttributes = Record<`data-${string}`, string | boolean | undefined>;

/**
 * Props for the {@link ItemGroup} component.
 */
export type ItemGroupProps = React.ComponentPropsWithoutRef<"div">;

/**
 * Props for the {@link ItemSeparator} component.
 */
export type ItemSeparatorProps = React.ComponentPropsWithoutRef<typeof Separator>;

/**
 * Props for the {@link Item} component.
 */
export interface ItemProps extends React.ComponentPropsWithoutRef<"div"> {
  /** Enables rendering an existing div-compatible child element. @default false */
  asChild?: boolean;
  /** Compactness applied to the item container. @default "default" */
  size?: ItemSize;
  /** Visual surface treatment for the item container. @default "default" */
  variant?: ItemVariant;
}

/**
 * Props for the {@link ItemMedia} component.
 */
export interface ItemMediaProps extends React.ComponentPropsWithoutRef<"div"> {
  /** Visual treatment used for the media slot. @default "default" */
  variant?: ItemMediaVariant;
}

/**
 * Props for the {@link ItemContent} component.
 */
export type ItemContentProps = React.ComponentPropsWithoutRef<"div">;

/**
 * Props for the {@link ItemTitle} component.
 */
export type ItemTitleProps = React.ComponentPropsWithoutRef<"div">;

/**
 * Props for the {@link ItemDescription} component.
 */
export type ItemDescriptionProps = React.ComponentPropsWithoutRef<"p">;

/**
 * Props for the {@link ItemActions} component.
 */
export type ItemActionsProps = React.ComponentPropsWithoutRef<"div">;

/**
 * Props for the {@link ItemHeader} component.
 */
export type ItemHeaderProps = React.ComponentPropsWithoutRef<"div">;

/**
 * Props for the {@link ItemFooter} component.
 */
export type ItemFooterProps = React.ComponentPropsWithoutRef<"div">;

/**
 * Groups a collection of list-like items with consistent spacing.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<div>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <ItemGroup>
 *   <Item />
 * </ItemGroup>
 * ```
 *
 * @see {@link ItemGroupProps} for available props
 */
const ItemGroup = React.forwardRef<HTMLDivElement, ItemGroupProps>(
  ({className, ...props}: Readonly<ItemGroupProps>, ref): React.JSX.Element => (
    <div
      ref={ref}
      role='list'
      data-slot='item-group'
      className={cn(styles.group, className)}
      {...props}
    />
  ),
);

/**
 * Inserts a separator between adjacent items.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a wrapped `Separator` component
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <ItemSeparator />
 * ```
 *
 * @see {@link ItemSeparatorProps} for available props
 */
const ItemSeparator = React.forwardRef<HTMLDivElement, ItemSeparatorProps>(
  ({className, ...props}: Readonly<ItemSeparatorProps>, ref): React.JSX.Element => (
    <Separator
      ref={ref}
      data-slot='item-separator'
      orientation='horizontal'
      className={cn(styles.separator, className)}
      {...props}
    />
  ),
);

/**
 * Creates a flexible data-display row with optional media and actions.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<div>` element by default
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <Item variant='outline'>Content</Item>
 * ```
 *
 * @see {@link ItemProps} for available props
 */
const Item = React.forwardRef<HTMLDivElement, ItemProps>(
  ({className, variant = "default", size = "default", asChild = false, children, ...props}: Readonly<ItemProps>, ref): React.JSX.Element => {
    const mergedClassName = cn(
      styles.item,
      variant === "outline" && styles.outline,
      variant === "muted" && styles.muted,
      size === "sm" ? styles.sizeSm : styles.sizeDefault,
      className,
    );

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<React.ComponentPropsWithoutRef<"div"> & ItemDataAttributes & {ref?: React.Ref<HTMLDivElement>}>;

      // eslint-disable-next-line react-x/no-clone-element -- replaces Radix Slot while preserving asChild prop merging
      return React.cloneElement(child, {
        ...props,
        ref,
        "data-size": size,
        "data-slot": "item",
        "data-variant": variant,
        className: cn(mergedClassName, child.props.className),
      });
    }

    return (
      <div
        ref={ref}
        data-slot='item'
        data-size={size}
        data-variant={variant}
        className={mergedClassName}
        {...props}>
        {children}
      </div>
    );
  },
);

/**
 * Renders the leading media slot for an item.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<div>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <ItemMedia variant='icon'>⭐</ItemMedia>
 * ```
 *
 * @see {@link ItemMediaProps} for available props
 */
const ItemMedia = React.forwardRef<HTMLDivElement, ItemMediaProps>(
  ({className, variant = "default", ...props}: Readonly<ItemMediaProps>, ref): React.JSX.Element => (
    <div
      ref={ref}
      data-slot='item-media'
      data-variant={variant}
      className={cn(styles.media, variant === "icon" && styles.mediaIcon, variant === "image" && styles.mediaImage, className)}
      {...props}
    />
  ),
);

/**
 * Wraps the main textual content for an item.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<div>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <ItemContent>Details</ItemContent>
 * ```
 *
 * @see {@link ItemContentProps} for available props
 */
const ItemContent = React.forwardRef<HTMLDivElement, ItemContentProps>(
  ({className, ...props}: Readonly<ItemContentProps>, ref): React.JSX.Element => (
    <div
      ref={ref}
      data-slot='item-content'
      className={cn(styles.content, className)}
      {...props}
    />
  ),
);

/**
 * Displays the primary title text for an item.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<div>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <ItemTitle>Title</ItemTitle>
 * ```
 *
 * @see {@link ItemTitleProps} for available props
 */
const ItemTitle = React.forwardRef<HTMLDivElement, ItemTitleProps>(
  ({className, ...props}: Readonly<ItemTitleProps>, ref): React.JSX.Element => (
    <div
      ref={ref}
      data-slot='item-title'
      className={cn(styles.title, className)}
      {...props}
    />
  ),
);

/**
 * Displays secondary descriptive content for an item.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<p>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <ItemDescription>Support text</ItemDescription>
 * ```
 *
 * @see {@link ItemDescriptionProps} for available props
 */
const ItemDescription = React.forwardRef<HTMLParagraphElement, ItemDescriptionProps>(
  ({className, ...props}: Readonly<ItemDescriptionProps>, ref): React.JSX.Element => (
    <p
      ref={ref}
      data-slot='item-description'
      className={cn(styles.description, className)}
      {...props}
    />
  ),
);

/**
 * Hosts action controls aligned to the trailing edge of an item.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<div>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <ItemActions>
 *   <button type='button'>Edit</button>
 * </ItemActions>
 * ```
 *
 * @see {@link ItemActionsProps} for available props
 */
const ItemActions = React.forwardRef<HTMLDivElement, ItemActionsProps>(
  ({className, ...props}: Readonly<ItemActionsProps>, ref): React.JSX.Element => (
    <div
      ref={ref}
      data-slot='item-actions'
      className={cn(styles.actions, className)}
      {...props}
    />
  ),
);

/**
 * Wraps leading title and description content for an item.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<div>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <ItemHeader>
 *   <ItemTitle>Profile</ItemTitle>
 * </ItemHeader>
 * ```
 *
 * @see {@link ItemHeaderProps} for available props
 */
const ItemHeader = React.forwardRef<HTMLDivElement, ItemHeaderProps>(
  ({className, ...props}: Readonly<ItemHeaderProps>, ref): React.JSX.Element => (
    <div
      ref={ref}
      data-slot='item-header'
      className={cn(styles.header, className)}
      {...props}
    />
  ),
);

/**
 * Wraps trailing metadata or supplementary content for an item.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<div>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <ItemFooter>Updated 2m ago</ItemFooter>
 * ```
 *
 * @see {@link ItemFooterProps} for available props
 */
const ItemFooter = React.forwardRef<HTMLDivElement, ItemFooterProps>(
  ({className, ...props}: Readonly<ItemFooterProps>, ref): React.JSX.Element => (
    <div
      ref={ref}
      data-slot='item-footer'
      className={cn(styles.footer, className)}
      {...props}
    />
  ),
);

ItemGroup.displayName = "ItemGroup";
ItemSeparator.displayName = "ItemSeparator";
Item.displayName = "Item";
ItemMedia.displayName = "ItemMedia";
ItemContent.displayName = "ItemContent";
ItemTitle.displayName = "ItemTitle";
ItemDescription.displayName = "ItemDescription";
ItemActions.displayName = "ItemActions";
ItemHeader.displayName = "ItemHeader";
ItemFooter.displayName = "ItemFooter";

export {Item, ItemActions, ItemContent, ItemDescription, ItemFooter, ItemGroup, ItemHeader, ItemMedia, ItemSeparator, ItemTitle};
