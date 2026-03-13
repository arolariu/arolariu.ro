"use client";

import * as React from "react";

import {Separator} from "@/components/ui/separator";
import {cn} from "@/lib/utilities";
import styles from "./item.module.css";

type ItemVariant = "default" | "outline" | "muted";
type ItemSize = "default" | "sm";
type ItemMediaVariant = "default" | "icon" | "image";
type ItemDataAttributes = Record<`data-${string}`, string | boolean | undefined>;

interface ItemProps extends React.ComponentPropsWithoutRef<"div"> {
  /** @deprecated Prefer Base UI's `render` prop. */

  asChild?: boolean;
  size?: ItemSize;
  variant?: ItemVariant;
}

interface ItemMediaProps extends React.ComponentPropsWithoutRef<"div"> {
  variant?: ItemMediaVariant;
}

const ItemGroup = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<"div">>(
  ({className, ...props}: Readonly<React.ComponentPropsWithoutRef<"div">>, ref): React.JSX.Element => (
    <div
      ref={ref}
      role='list'
      data-slot='item-group'
      className={cn(styles.group, className)}
      {...props}
    />
  ),
);
ItemGroup.displayName = "ItemGroup";

const ItemSeparator = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof Separator>>(
  ({className, ...props}: Readonly<React.ComponentPropsWithoutRef<typeof Separator>>, ref): React.JSX.Element => (
    <Separator
      ref={ref}
      data-slot='item-separator'
      orientation='horizontal'
      className={cn(styles.separator, className)}
      {...props}
    />
  ),
);
ItemSeparator.displayName = "ItemSeparator";

const Item = React.forwardRef<HTMLDivElement, ItemProps>(
  (
    {className, variant = "default", size = "default", asChild = false, children, ...props}: Readonly<ItemProps>,
    ref,
  ): React.JSX.Element => {
    const mergedClassName = cn(
      styles.item,
      variant === "outline" && styles.outline,
      variant === "muted" && styles.muted,
      size === "sm" ? styles.sizeSm : styles.sizeDefault,
      className,
    );

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<
        React.ComponentPropsWithoutRef<"div"> & ItemDataAttributes & {ref?: React.Ref<HTMLDivElement>}
      >;

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
Item.displayName = "Item";

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
ItemMedia.displayName = "ItemMedia";

const ItemContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<"div">>(
  ({className, ...props}: Readonly<React.ComponentPropsWithoutRef<"div">>, ref): React.JSX.Element => (
    <div
      ref={ref}
      data-slot='item-content'
      className={cn(styles.content, className)}
      {...props}
    />
  ),
);
ItemContent.displayName = "ItemContent";

const ItemTitle = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<"div">>(
  ({className, ...props}: Readonly<React.ComponentPropsWithoutRef<"div">>, ref): React.JSX.Element => (
    <div
      ref={ref}
      data-slot='item-title'
      className={cn(styles.title, className)}
      {...props}
    />
  ),
);
ItemTitle.displayName = "ItemTitle";

const ItemDescription = React.forwardRef<HTMLParagraphElement, React.ComponentPropsWithoutRef<"p">>(
  ({className, ...props}: Readonly<React.ComponentPropsWithoutRef<"p">>, ref): React.JSX.Element => (
    <p
      ref={ref}
      data-slot='item-description'
      className={cn(styles.description, className)}
      {...props}
    />
  ),
);
ItemDescription.displayName = "ItemDescription";

const ItemActions = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<"div">>(
  ({className, ...props}: Readonly<React.ComponentPropsWithoutRef<"div">>, ref): React.JSX.Element => (
    <div
      ref={ref}
      data-slot='item-actions'
      className={cn(styles.actions, className)}
      {...props}
    />
  ),
);
ItemActions.displayName = "ItemActions";

const ItemHeader = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<"div">>(
  ({className, ...props}: Readonly<React.ComponentPropsWithoutRef<"div">>, ref): React.JSX.Element => (
    <div
      ref={ref}
      data-slot='item-header'
      className={cn(styles.header, className)}
      {...props}
    />
  ),
);
ItemHeader.displayName = "ItemHeader";

const ItemFooter = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<"div">>(
  ({className, ...props}: Readonly<React.ComponentPropsWithoutRef<"div">>, ref): React.JSX.Element => (
    <div
      ref={ref}
      data-slot='item-footer'
      className={cn(styles.footer, className)}
      {...props}
    />
  ),
);
ItemFooter.displayName = "ItemFooter";

export {Item, ItemActions, ItemContent, ItemDescription, ItemFooter, ItemGroup, ItemHeader, ItemMedia, ItemSeparator, ItemTitle};
