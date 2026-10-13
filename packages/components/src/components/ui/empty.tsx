import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./empty.module.css";

/** Supported visual treatments for {@link EmptyMedia}. */
export type EmptyMediaVariant = "default" | "icon";

/**
 * Props for the {@link Empty} component.
 */
export type EmptyProps = Readonly<React.ComponentPropsWithoutRef<"div">>;

/**
 * Props for the {@link EmptyHeader} component.
 */
export type EmptyHeaderProps = Readonly<React.ComponentPropsWithoutRef<"div">>;

/**
 * Props for the {@link EmptyMedia} component.
 */
export interface EmptyMediaProps extends Readonly<React.ComponentPropsWithoutRef<"div">> {
  /** Visual presentation applied to the media container. @default "default" */
  readonly variant?: EmptyMediaVariant;
}

/**
 * Props for the {@link EmptyTitle} component.
 */
export type EmptyTitleProps = Readonly<React.ComponentPropsWithoutRef<"div">>;

/**
 * Props for the {@link EmptyDescription} component.
 */
export type EmptyDescriptionProps =
  | (Readonly<React.ComponentPropsWithoutRef<"p">> & {readonly as?: "p"})
  | (Readonly<React.ComponentPropsWithoutRef<"div">> & {readonly as: "div"});

/**
 * Props for the {@link EmptyContent} component.
 */
export type EmptyContentProps = Readonly<React.ComponentPropsWithoutRef<"div">>;

/**
 * Creates a structured empty-state container.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<div>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <Empty>
 *   <EmptyHeader />
 * </Empty>
 * ```
 *
 * @see {@link EmptyProps} for available props
 */
const Empty = React.forwardRef<HTMLDivElement, EmptyProps>(({className, ...props}: Readonly<EmptyProps>, ref): React.JSX.Element => (
  <div
    ref={ref}
    data-slot='empty'
    className={cn(styles.empty, className)}
    {...props}
  />
));

/**
 * Groups the leading header content for an empty state.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<div>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <EmptyHeader>Nothing here yet</EmptyHeader>
 * ```
 *
 * @see {@link EmptyHeaderProps} for available props
 */
const EmptyHeader = React.forwardRef<HTMLDivElement, EmptyHeaderProps>(
  ({className, ...props}: Readonly<EmptyHeaderProps>, ref): React.JSX.Element => (
    <div
      ref={ref}
      data-slot='empty-header'
      className={cn(styles.header, className)}
      {...props}
    />
  ),
);

/**
 * Hosts media or icon content for an empty state.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<div>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <EmptyMedia variant='icon'>📭</EmptyMedia>
 * ```
 *
 * @see {@link EmptyMediaProps} for available props
 */
const EmptyMedia = React.forwardRef<HTMLDivElement, EmptyMediaProps>(
  ({className, variant = "default", ...props}: Readonly<EmptyMediaProps>, ref): React.JSX.Element => (
    <div
      ref={ref}
      data-slot='empty-icon'
      data-variant={variant}
      className={cn(styles.media, variant === "icon" && styles.mediaIcon, className)}
      {...props}
    />
  ),
);

/**
 * Renders the primary title for an empty state.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<div>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <EmptyTitle>No results found</EmptyTitle>
 * ```
 *
 * @see {@link EmptyTitleProps} for available props
 */
const EmptyTitle = React.forwardRef<HTMLDivElement, EmptyTitleProps>(
  ({className, ...props}: Readonly<EmptyTitleProps>, ref): React.JSX.Element => (
    <div
      ref={ref}
      data-slot='empty-title'
      className={cn(styles.title, className)}
      {...props}
    />
  ),
);

/**
 * Renders supporting copy for an empty state.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<p>` by default; use `as="div"` for paragraphs, lists, or other rich block content
 * - Props and the forwarded ref correspond to the selected native element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <EmptyDescription>Try adjusting your filters.</EmptyDescription>
 * ```
 *
 * @see {@link EmptyDescriptionProps} for available props
 */
const EmptyDescription = React.forwardRef<HTMLParagraphElement | HTMLDivElement, EmptyDescriptionProps>(
  ({className, as: tagName = "p", ...props}: Readonly<EmptyDescriptionProps>, ref): React.JSX.Element =>
    React.createElement(tagName, {
      ...props,
      ref,
      "data-slot": "empty-description",
      className: cn(styles.description, className),
    }),
);

/**
 * Hosts trailing actions or supplemental content for an empty state.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<div>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <EmptyContent>
 *   <button type='button'>Create item</button>
 * </EmptyContent>
 * ```
 *
 * @see {@link EmptyContentProps} for available props
 */
const EmptyContent = React.forwardRef<HTMLDivElement, EmptyContentProps>(
  ({className, ...props}: Readonly<EmptyContentProps>, ref): React.JSX.Element => (
    <div
      ref={ref}
      data-slot='empty-content'
      className={cn(styles.content, className)}
      {...props}
    />
  ),
);

Empty.displayName = "Empty";
EmptyHeader.displayName = "EmptyHeader";
EmptyMedia.displayName = "EmptyMedia";
EmptyTitle.displayName = "EmptyTitle";
EmptyDescription.displayName = "EmptyDescription";
EmptyContent.displayName = "EmptyContent";

// eslint-disable-next-line no-redeclare -- public component namespace
namespace Empty {
  export type Props = Readonly<EmptyProps>;
}
// eslint-disable-next-line no-redeclare -- public component namespace
namespace EmptyHeader {
  export type Props = Readonly<EmptyHeaderProps>;
}
// eslint-disable-next-line no-redeclare -- public component namespace
namespace EmptyMedia {
  export type Props = EmptyMediaProps;
}
// eslint-disable-next-line no-redeclare -- public component namespace
namespace EmptyTitle {
  export type Props = Readonly<EmptyTitleProps>;
}
// eslint-disable-next-line no-redeclare -- public component namespace
namespace EmptyDescription {
  export type Props = Readonly<EmptyDescriptionProps>;
}
// eslint-disable-next-line no-redeclare -- public component namespace
namespace EmptyContent {
  export type Props = Readonly<EmptyContentProps>;
}

export {Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle};
