import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./empty.module.css";

/** Supported visual treatments for {@link EmptyMedia}. */
export type EmptyMediaVariant = "default" | "icon";

/**
 * Props for the {@link Empty} component.
 */
export type EmptyProps = Readonly<React.ComponentPropsWithRef<"div">>;

/**
 * Props for the {@link EmptyHeader} component.
 */
export type EmptyHeaderProps = Readonly<React.ComponentPropsWithRef<"div">>;

/**
 * Props for the {@link EmptyMedia} component.
 */
export interface EmptyMediaProps extends Readonly<React.ComponentPropsWithRef<"div">> {
  /** Visual presentation applied to the media container. @default "default" */
  readonly variant?: EmptyMediaVariant;
}

/**
 * Props for the {@link EmptyTitle} component.
 */
export type EmptyTitleProps = Readonly<React.ComponentPropsWithRef<"div">>;

/**
 * Props for the {@link EmptyDescription} component.
 */
export type EmptyDescriptionProps =
  | (Readonly<React.ComponentPropsWithoutRef<"p">> & {readonly as?: "p"; readonly ref?: React.Ref<HTMLParagraphElement | HTMLDivElement>})
  | (Readonly<React.ComponentPropsWithoutRef<"div">> & {
      readonly as: "div";
      readonly ref?: React.Ref<HTMLParagraphElement | HTMLDivElement>;
    });

/**
 * Props for the {@link EmptyContent} component.
 */
export type EmptyContentProps = Readonly<React.ComponentPropsWithRef<"div">>;

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
const Empty = ({ref, className, ...props}: Readonly<EmptyProps>): React.JSX.Element => (
  <div
    ref={ref}
    data-slot='empty'
    className={cn(styles.empty, className)}
    {...props}
  />
);

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
const EmptyHeader = ({ref, className, ...props}: Readonly<EmptyHeaderProps>): React.JSX.Element => (
  <div
    ref={ref}
    data-slot='empty-header'
    className={cn(styles.header, className)}
    {...props}
  />
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
const EmptyMedia = ({ref, className, variant = "default", ...props}: Readonly<EmptyMediaProps>): React.JSX.Element => (
  <div
    ref={ref}
    data-slot='empty-icon'
    data-variant={variant}
    className={cn(styles.media, variant === "icon" && styles.mediaIcon, className)}
    {...props}
  />
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
const EmptyTitle = ({ref, className, ...props}: Readonly<EmptyTitleProps>): React.JSX.Element => (
  <div
    ref={ref}
    data-slot='empty-title'
    className={cn(styles.title, className)}
    {...props}
  />
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
const EmptyDescription = ({ref, className, as: tagName = "p", ...props}: Readonly<EmptyDescriptionProps>): React.JSX.Element =>
  React.createElement(tagName, {
    ...props,
    ref,
    "data-slot": "empty-description",
    className: cn(styles.description, className),
  });

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
const EmptyContent = ({ref, className, ...props}: Readonly<EmptyContentProps>): React.JSX.Element => (
  <div
    ref={ref}
    data-slot='empty-content'
    className={cn(styles.content, className)}
    {...props}
  />
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
