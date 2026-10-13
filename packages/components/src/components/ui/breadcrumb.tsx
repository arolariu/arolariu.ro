"use client";

import {mergeProps} from "@base-ui/react/merge-props";
import type {HTMLProps} from "@base-ui/react/types";
import {useRender} from "@base-ui/react/use-render";
import {ChevronRight, Ellipsis} from "lucide-react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./breadcrumb.module.css";

/**
 * Props for the {@link Breadcrumb} component.
 */
export type BreadcrumbProps = Readonly<
  React.ComponentPropsWithoutRef<"nav"> & {
    /**
     * Retained for compatibility only; this prop is inert and never renders content.
     * @deprecated Pass custom content to each `BreadcrumbSeparator` instead.
     */
    separator?: React.ReactNode;
  }
>;

/**
 * Props for the {@link BreadcrumbList} component.
 */
export type BreadcrumbListProps = Readonly<React.ComponentPropsWithoutRef<"ol">>;

/**
 * Props for the {@link BreadcrumbItem} component.
 */
export type BreadcrumbItemProps = Readonly<React.ComponentPropsWithoutRef<"li">>;

/** Link-owned state supplied to render callbacks and mapped to data attributes. */
export type BreadcrumbLinkState = Readonly<{slot: "breadcrumb-link"}>;

// Base UI resolves input object/callback refs to a merged callback (or null).
type BreadcrumbLinkRenderProps = Readonly<
  Omit<HTMLProps<HTMLElement>, "ref">
    & React.AnchorHTMLAttributes<HTMLElement> & {
      ref?: React.RefCallback<HTMLElement> | null;
    }
>;

/**
 * Props for the {@link BreadcrumbLink} component.
 */
export type BreadcrumbLinkProps = Readonly<
  Omit<useRender.ComponentProps<"a", BreadcrumbLinkState, BreadcrumbLinkRenderProps>, "ref"> & {
    /** Ref to the actual rendered element; the default target is an anchor. */
    ref?: React.Ref<HTMLElement>;
    /**
     * Composes a single non-fragment child, preserving its content, handlers and refs.
     * A valid child takes precedence over `render`; other content uses normal rendering.
     * @default false
     * @deprecated Prefer `render` for element composition.
     */
    asChild?: boolean;
  }
>;

/**
 * Props for the {@link BreadcrumbPage} component.
 */
export type BreadcrumbPageProps = Readonly<React.ComponentPropsWithoutRef<"span">>;

/**
 * Props for the {@link BreadcrumbSeparator} component.
 */
export type BreadcrumbSeparatorProps = Readonly<React.ComponentPropsWithoutRef<"li">>;

/**
 * Props for the {@link BreadcrumbEllipsis} component.
 */
export type BreadcrumbEllipsisProps = Readonly<React.ComponentPropsWithoutRef<"span">>;

/**
 * Provides semantic breadcrumb navigation for hierarchical page structures.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<nav>` element
 * - The legacy root `separator` prop is inert; customize `BreadcrumbSeparator` children.
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <Breadcrumb>
 *   <BreadcrumbList>
 *     <BreadcrumbItem>
 *       <BreadcrumbLink href='/'>Home</BreadcrumbLink>
 *     </BreadcrumbItem>
 *   </BreadcrumbList>
 * </Breadcrumb>
 * ```
 *
 * @see {@link BreadcrumbProps} for available props
 */
const Breadcrumb = React.forwardRef<HTMLElement, BreadcrumbProps>(
  // eslint-disable-next-line sonarjs/deprecation -- strip the inert legacy prop rather than forwarding it to the DOM
  ({className, separator: _separator, ...props}: Readonly<BreadcrumbProps>, ref): React.JSX.Element => (
    <nav
      ref={ref}
      aria-label='breadcrumb'
      data-slot='breadcrumb'
      className={cn(styles.root, className)}
      {...props}
    />
  ),
);

/**
 * Groups breadcrumb items inside an ordered list.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders an `<ol>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <BreadcrumbList>
 *   <BreadcrumbItem />
 * </BreadcrumbList>
 * ```
 *
 * @see {@link BreadcrumbListProps} for available props
 */
const BreadcrumbList = React.forwardRef<HTMLOListElement, BreadcrumbListProps>(
  ({className, ...props}: Readonly<BreadcrumbListProps>, ref): React.JSX.Element => (
    <ol
      ref={ref}
      data-slot='breadcrumb-list'
      className={cn(styles.list, className)}
      {...props}
    />
  ),
);

/**
 * Wraps a single breadcrumb node within the list.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders an `<li>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <BreadcrumbItem>
 *   <BreadcrumbLink href='/docs'>Docs</BreadcrumbLink>
 * </BreadcrumbItem>
 * ```
 *
 * @see {@link BreadcrumbItemProps} for available props
 */
const BreadcrumbItem = React.forwardRef<HTMLLIElement, BreadcrumbItemProps>(
  ({className, ...props}: Readonly<BreadcrumbItemProps>, ref): React.JSX.Element => (
    <li
      ref={ref}
      data-slot='breadcrumb-item'
      className={cn(styles.item, className)}
      {...props}
    />
  ),
);

/**
 * Renders a navigable breadcrumb link with optional child element composition.
 *
 * @remarks
 * - Client boundary for Base UI render/ref composition.
 * - Renders an `<a>` element by default
 * - Base UI preserves child content, merges refs and runs child handlers first.
 * - `preventDefault()` cancels native navigation; `preventBaseUIHandler()` also
 *   prevents the wrapper handler. No synthetic button behavior is introduced.
 * - Common `HTMLElement` refs reflect composed targets; existing anchor object refs
 *   remain valid. Callback consumers should narrow before using anchor-only members.
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <BreadcrumbLink href='/settings'>Settings</BreadcrumbLink>
 * ```
 *
 * @see {@link BreadcrumbLinkProps} for available props
 */
const BreadcrumbLink = React.forwardRef<HTMLElement, BreadcrumbLink.Props>(
  (
    // eslint-disable-next-line sonarjs/deprecation -- retain the supported legacy composition API
    {asChild = false, className, children, render, ...props}: Readonly<React.PropsWithoutRef<BreadcrumbLink.Props>>,
    ref,
  ): React.ReactElement => {
    const mergedClassName = cn(styles.link, className);

    const legacyChild =
      asChild && React.isValidElement<{children?: React.ReactNode}>(children) && children.type !== React.Fragment ? children : undefined;

    return useRender<BreadcrumbLink.State, HTMLElement>({
      defaultTagName: "a",
      ref,
      render: legacyChild ?? render,
      state: {slot: "breadcrumb-link"},
      props: mergeProps<"a">({className: mergedClassName}, props, {children: legacyChild ? legacyChild.props.children : children}),
    });
  },
);

/**
 * Marks the current page within the breadcrumb trail.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<span>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <BreadcrumbPage>Current page</BreadcrumbPage>
 * ```
 *
 * @see {@link BreadcrumbPageProps} for available props
 */
const BreadcrumbPage = React.forwardRef<HTMLSpanElement, BreadcrumbPageProps>(
  ({className, ...props}: Readonly<BreadcrumbPageProps>, ref): React.JSX.Element => (
    <span
      ref={ref}
      data-slot='breadcrumb-page'
      role='link'
      aria-current='page'
      aria-disabled='true'
      className={cn(styles.page, className)}
      {...props}
    />
  ),
);

/**
 * Displays visual separation between breadcrumb items.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders an `<li>` element
 * - Defaults to a `ChevronRight` separator icon when `children` is not provided
 * - Only the default decorative chevron flips with inherited RTL direction;
 *   consumer-provided separator content is never transformed automatically.
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <BreadcrumbSeparator />
 * ```
 *
 * @example Custom separator
 * ```tsx
 * <BreadcrumbSeparator>/</BreadcrumbSeparator>
 * ```
 *
 * @see {@link BreadcrumbSeparatorProps} for available props
 */
const BreadcrumbSeparator = React.forwardRef<HTMLLIElement, BreadcrumbSeparatorProps>(
  ({children, className, ...props}: Readonly<BreadcrumbSeparatorProps>, ref): React.JSX.Element => (
    <li
      ref={ref}
      data-slot='breadcrumb-separator'
      role='presentation'
      aria-hidden='true'
      className={cn(styles.separator, className)}
      {...props}>
      {children ?? <ChevronRight className={styles.chevron} />}
    </li>
  ),
);

/**
 * Indicates collapsed breadcrumb items in truncated navigation trails.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<span>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <BreadcrumbEllipsis />
 * ```
 *
 * @see {@link BreadcrumbEllipsisProps} for available props
 */
const BreadcrumbEllipsis = React.forwardRef<HTMLSpanElement, BreadcrumbEllipsisProps>(
  ({className, ...props}: Readonly<BreadcrumbEllipsisProps>, ref): React.JSX.Element => (
    <span
      ref={ref}
      data-slot='breadcrumb-ellipsis'
      role='presentation'
      aria-hidden='true'
      className={cn(styles.ellipsis, className)}
      {...props}>
      <Ellipsis />
      <span className={styles.srOnly}>More</span>
    </span>
  ),
);

Breadcrumb.displayName = "Breadcrumb";
BreadcrumbList.displayName = "BreadcrumbList";
BreadcrumbItem.displayName = "BreadcrumbItem";
BreadcrumbLink.displayName = "BreadcrumbLink";
BreadcrumbPage.displayName = "BreadcrumbPage";
BreadcrumbSeparator.displayName = "BreadcrumbSeparator";
BreadcrumbEllipsis.displayName = "BreadcrumbEllipsis";

// eslint-disable-next-line no-redeclare -- canonical component namespace typing API
namespace BreadcrumbLink {
  /** Readonly native-anchor and composition props for a breadcrumb link. */
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- public namespace and named-import compatibility
  export type Props = BreadcrumbLinkProps;
  /** Breadcrumb-link-owned state passed to render callbacks. */
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- public namespace and named-import compatibility
  export type State = BreadcrumbLinkState;
}

export {Breadcrumb, BreadcrumbEllipsis, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator};
