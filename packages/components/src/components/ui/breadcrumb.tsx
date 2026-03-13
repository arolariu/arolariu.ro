"use client";

/* eslint-disable jsx-a11y/label-has-associated-control */

import {ChevronRight, MoreHorizontal} from "lucide-react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./breadcrumb.module.css";

/**
 * Props for the {@link Breadcrumb} component.
 */
export interface BreadcrumbProps extends React.ComponentPropsWithoutRef<"nav"> {
  /** Reserved separator content prop for custom breadcrumb compositions. @default undefined */
  separator?: React.ReactNode;
}

/**
 * Props for the {@link BreadcrumbList} component.
 */
export type BreadcrumbListProps = React.ComponentPropsWithoutRef<"ol">;

/**
 * Props for the {@link BreadcrumbItem} component.
 */
export type BreadcrumbItemProps = React.ComponentPropsWithoutRef<"li">;

/**
 * Props for the {@link BreadcrumbLink} component.
 */
export interface BreadcrumbLinkProps extends React.ComponentPropsWithoutRef<"a"> {
  /** Enables rendering an existing anchor-compatible child element. @default false */
  asChild?: boolean;
}

/**
 * Props for the {@link BreadcrumbPage} component.
 */
export type BreadcrumbPageProps = React.ComponentPropsWithoutRef<"span">;

/**
 * Props for the {@link BreadcrumbSeparator} component.
 */
export type BreadcrumbSeparatorProps = React.ComponentPropsWithoutRef<"li">;

/**
 * Props for the {@link BreadcrumbEllipsis} component.
 */
export type BreadcrumbEllipsisProps = React.ComponentPropsWithoutRef<"span">;

/**
 * Provides semantic breadcrumb navigation for hierarchical page structures.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<nav>` element
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
  ({className, separator: _separator, ...props}: Readonly<BreadcrumbProps>, ref): React.JSX.Element => (
    <nav
      ref={ref}
      aria-label='breadcrumb'
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
      className={cn(styles.item, className)}
      {...props}
    />
  ),
);

/**
 * Renders a navigable breadcrumb link with optional child element composition.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders an `<a>` element by default
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <BreadcrumbLink href='/settings'>Settings</BreadcrumbLink>
 * ```
 *
 * @see {@link BreadcrumbLinkProps} for available props
 */
const BreadcrumbLink = React.forwardRef<HTMLAnchorElement, BreadcrumbLinkProps>(
  ({asChild = false, className, children, ...props}: Readonly<BreadcrumbLinkProps>, ref): React.JSX.Element => {
    const mergedClassName = cn(styles.link, className);

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<React.ComponentPropsWithoutRef<"a"> & {ref?: React.Ref<HTMLAnchorElement>}>;

      // eslint-disable-next-line react-x/no-clone-element -- replaces Radix Slot while preserving asChild prop merging
      return React.cloneElement(child, {
        ...props,
        ref,
        className: cn(mergedClassName, child.props.className),
      });
    }

    return (
      <a
        ref={ref}
        className={mergedClassName}
        {...props}>
        {children}
      </a>
    );
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
      role='presentation'
      aria-hidden='true'
      className={cn(styles.separator, className)}
      {...props}>
      {children ?? <ChevronRight />}
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
      role='presentation'
      aria-hidden='true'
      className={cn(styles.ellipsis, className)}
      {...props}>
      <MoreHorizontal />
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

export {Breadcrumb, BreadcrumbEllipsis, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator};
