"use client";

import {mergeProps} from "@base-ui/react/merge-props";
import type {HTMLProps} from "@base-ui/react/types";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {Separator} from "@/components/ui/separator";
import {cn} from "@/lib/utilities";
import styles from "./item.module.css";

/** Supported surface variants for {@link Item}. */
export type ItemVariant = "default" | "outline" | "muted";

/** Supported size variants for {@link Item}. */
export type ItemSize = "default" | "sm" | "xs";

/** Supported media treatments for {@link ItemMedia}. */
export type ItemMediaVariant = "default" | "icon" | "image";

/** Item-owned state supplied to render callbacks and mapped to data attributes. */
export type ItemState = Readonly<{
  slot: "item";
  variant: ItemVariant;
  size: ItemSize;
}>;

// Base UI resolves input object/callback refs to a merged callback (or null).
type ItemRenderProps = Readonly<
  Omit<HTMLProps<HTMLElement>, "ref"> & {
    ref?: React.RefCallback<HTMLElement> | null;
  }
>;

/**
 * Props for the {@link ItemGroup} component.
 */
export type ItemGroupProps = Readonly<React.ComponentPropsWithoutRef<"div">>;

/**
 * Props for the {@link ItemSeparator} component.
 */
export type ItemSeparatorProps = Readonly<React.ComponentPropsWithoutRef<typeof Separator>>;

/**
 * Props for the {@link Item} component.
 */
export type ItemProps = Readonly<
  Omit<useRender.ComponentProps<"div", ItemState, ItemRenderProps>, "ref"> & {
    /** Ref to the actual rendered element; the default target is a div. */
    ref?: React.Ref<HTMLElement>;
    /**
     * Composes a single non-fragment child, preserving its content, handlers and refs.
     * A valid child takes precedence over `render`; other content uses normal rendering.
     * @default false
     * @deprecated Prefer `render` for element composition.
     */
    asChild?: boolean;
    /** Compactness applied to the item container and direct media slots. @default "default" */
    size?: ItemSize;
    /** Visual surface treatment for the item container. @default "default" */
    variant?: ItemVariant;
  }
>;

/**
 * Props for the {@link ItemMedia} component.
 */
export type ItemMediaProps = Readonly<
  React.ComponentPropsWithoutRef<"div"> & {
    /** Visual treatment used for the media slot. @default "default" */
    variant?: ItemMediaVariant;
  }
>;

/**
 * Props for the {@link ItemContent} component.
 */
export type ItemContentProps = Readonly<React.ComponentPropsWithoutRef<"div">>;

/**
 * Props for the {@link ItemTitle} component.
 */
export type ItemTitleProps = Readonly<React.ComponentPropsWithoutRef<"div">>;

/**
 * Props for the {@link ItemDescription} component.
 */
export type ItemDescriptionProps = Readonly<React.ComponentPropsWithoutRef<"p">>;

/**
 * Props for the {@link ItemActions} component.
 */
export type ItemActionsProps = Readonly<React.ComponentPropsWithoutRef<"div">>;

/**
 * Props for the {@link ItemHeader} component.
 */
export type ItemHeaderProps = Readonly<React.ComponentPropsWithoutRef<"div">>;

/**
 * Props for the {@link ItemFooter} component.
 */
export type ItemFooterProps = Readonly<React.ComponentPropsWithoutRef<"div">>;

/**
 * Groups a collection of list-like items with consistent spacing.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<div>` element
 * - Assign `role="listitem"` to grouped entries when using list semantics.
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <ItemGroup>
 *   <Item role='listitem' />
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
 * - Delegates rendering and state ownership to the existing `Separator` component.
 * - Uses its stable default API; does not evaluate primitive render callbacks.
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
 * - Client boundary for Base UI render/ref composition; no interaction primitive.
 * - Renders an inert `<div>` by default, without button role or keyboard handlers.
 * - Use `render` with a native anchor/button/label for its native behavior and
 *   provide children valid for that target's content model.
 * - Base UI merges child-first handlers and both refs; `preventDefault()` cancels
 *   native behavior, while `preventBaseUIHandler()` also suppresses the wrapper handler.
 * - Common `HTMLElement` refs support the actual composed target. Existing div
 *   object refs remain valid; explicitly div-only callback consumers should use
 *   `HTMLElement` or narrow the actual node before accessing div-specific members.
 * - `xs` adds the densest spacing and smaller direct icon/image media slots.
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <Item variant='outline'>Content</Item>
 * ```
 *
 * @see {@link ItemProps} for available props
 */
const Item = React.forwardRef<HTMLElement, Item.Props>(
  (
    {
      className,
      variant = "default",
      size = "default",
      render,
      // eslint-disable-next-line sonarjs/deprecation -- retain the supported legacy composition API
      asChild = false,
      children,
      ...props
    }: Readonly<React.PropsWithoutRef<Item.Props>>,
    ref,
  ): React.ReactElement => {
    const mergedClassName = cn(
      styles.item,
      variant === "outline" && styles.outline,
      variant === "muted" && styles.muted,
      size === "xs" ? styles.sizeXs : size === "sm" ? styles.sizeSm : styles.sizeDefault,
      className,
    );

    const legacyChild =
      asChild && React.isValidElement<{children?: React.ReactNode}>(children) && children.type !== React.Fragment ? children : undefined;

    return useRender<Item.State, HTMLElement>({
      defaultTagName: "div",
      ref,
      render: legacyChild ?? render,
      state: {slot: "item", variant, size},
      props: mergeProps<"div">({className: mergedClassName}, props, {children: legacyChild ? legacyChild.props.children : children}),
    });
  },
);

/**
 * Renders the leading media slot for an item.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<div>` element
 * - Icon/image dimensions follow the direct parent Item size; images are cropped
 *   with `object-fit: cover`. The default media variant leaves content intrinsic.
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
 * - Uses a shrinking flex column so long content cannot force the row wider.
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
 * - Visually clamps to one line with ellipsis while keeping all content in the DOM.
 *   Inline text/icons remain supported; use `className` to override the clamp.
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
 * - Accepts rich phrasing content, including inline links, not nested block markup.
 * - Visually clamps to two lines without removing accessible content; override
 *   the CSS Module treatment through `className` when full expansion is needed.
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

// eslint-disable-next-line no-redeclare -- canonical component namespace typing API
namespace Item {
  /** Readonly composition and visual props for the item root. */
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- public namespace and named-import compatibility
  export type Props = ItemProps;
  /** Item-owned state passed to render callbacks. */
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- public namespace and named-import compatibility
  export type State = ItemState;
}

export {Item, ItemActions, ItemContent, ItemDescription, ItemFooter, ItemGroup, ItemHeader, ItemMedia, ItemSeparator, ItemTitle};
