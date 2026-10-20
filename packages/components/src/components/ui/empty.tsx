"use client";

import {mergeProps} from "@base-ui/react/merge-props";
import type {HTMLProps} from "@base-ui/react/types";
import {useRender} from "@base-ui/react/use-render";
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
 * State owned by the {@link EmptyDescription} renderer and passed to its `render` callback.
 */
export type EmptyDescriptionState = Readonly<{slot: "empty-description"}>;

// Base UI resolves input object/callback refs to a merged callback (or null).
type EmptyDescriptionRenderProps = Readonly<Omit<HTMLProps<HTMLElement>, "ref"> & {ref?: React.RefCallback<HTMLElement> | null}>;

/**
 * Props for the {@link EmptyDescription} component.
 *
 * @remarks
 * Native paragraph attributes plus Base UI `render` composition. The ref targets the actual rendered element.
 */
export type EmptyDescriptionProps = Readonly<
  Omit<useRender.ComponentProps<"p", EmptyDescriptionState, EmptyDescriptionRenderProps>, "ref"> & {
    /** Ref to the actual rendered element; the default target is a `<p>`. */
    ref?: React.Ref<HTMLElement>;
  }
>;

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
 * - The `empty` module is a client module (`"use client"`) because {@link EmptyDescription} composes through Base UI
 *   `useRender`; Server Components can still render every part
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
 * - **Rendering Context**: client boundary for Base UI render/ref composition
 * - Renders a `<p>` by default. For paragraphs, lists or other block content, compose a block element with
 *   `render={<div />}`; Base UI merges that element's props, class names, child-first event handlers and both refs
 * - A `render` callback receives the merged props and {@link EmptyDescriptionState}
 * - Caller props, including `data-slot`, are applied last
 * - Plain nested links inherit the description colour and are underlined; class-styled anchors such as
 *   `buttonVariants()` keep their own paint, hover colour and focus ring
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <EmptyDescription>Try adjusting your filters.</EmptyDescription>
 *
 * <EmptyDescription render={<div />}>
 *   <p>There are several ways to get started:</p>
 *   <ul>
 *     <li>Create an item.</li>
 *   </ul>
 * </EmptyDescription>
 * ```
 *
 * @see {@link EmptyDescriptionProps} for available props
 */
const EmptyDescription = ({ref, className, render, ...props}: Readonly<EmptyDescriptionProps>): React.ReactElement =>
  useRender<EmptyDescriptionState, HTMLElement>({
    defaultTagName: "p",
    ref,
    render,
    state: {slot: "empty-description"},
    props: mergeProps<"p">({className: cn(styles.description, className)}, props),
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
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- named and namespace public typing
  export type State = EmptyDescriptionState;
}
// eslint-disable-next-line no-redeclare -- public component namespace
namespace EmptyContent {
  export type Props = Readonly<EmptyContentProps>;
}

export {Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle};
