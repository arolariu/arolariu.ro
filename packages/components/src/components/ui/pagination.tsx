"use client";

/* eslint-disable jsx-a11y/anchor-has-content */

import {ChevronLeft, ChevronRight, MoreHorizontal} from "lucide-react";
import * as React from "react";

import type {ButtonProps} from "@/components/ui/button";
import {cn} from "@/lib/utilities";
import buttonStyles from "./button.module.css";
import styles from "./pagination.module.css";

/**
 * Props for the {@link Pagination} component.
 */
export type PaginationProps = React.ComponentPropsWithoutRef<"nav">;

/**
 * Props for the {@link PaginationContent} component.
 */
export type PaginationContentProps = React.ComponentPropsWithoutRef<"ul">;

/**
 * Props for the {@link PaginationItem} component.
 */
export type PaginationItemProps = React.ComponentPropsWithoutRef<"li">;

/**
 * Props for the {@link PaginationLink} component.
 */
export interface PaginationLinkProps extends Pick<ButtonProps, "size">, React.ComponentPropsWithoutRef<"a"> {
  /** Marks the link as the current active page. @default false */
  isActive?: boolean;
}

/**
 * Props for the {@link PaginationPrevious} component.
 */
export type PaginationPreviousProps = React.ComponentPropsWithoutRef<typeof PaginationLink>;

/**
 * Props for the {@link PaginationNext} component.
 */
export type PaginationNextProps = React.ComponentPropsWithoutRef<typeof PaginationLink>;

/**
 * Props for the {@link PaginationEllipsis} component.
 */
export type PaginationEllipsisProps = React.ComponentPropsWithoutRef<"span">;

const buttonSizeStyles: Record<NonNullable<ButtonProps["size"]>, string> = {
  default: buttonStyles.sizeDefault,
  icon: buttonStyles.sizeIcon,
  lg: buttonStyles.sizeLg,
  sm: buttonStyles.sizeSm,
};

/**
 * Provides semantic navigation for paginated content.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<nav>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <Pagination>
 *   <PaginationContent />
 * </Pagination>
 * ```
 *
 * @see {@link PaginationProps} for available props
 */
const Pagination = React.forwardRef<HTMLElement, PaginationProps>(
  ({className, ...props}: Readonly<PaginationProps>, ref): React.JSX.Element => (
    <nav
      ref={ref}
      role='navigation'
      aria-label='pagination'
      className={cn(styles.root, className)}
      {...props}
    />
  ),
);

/**
 * Wraps pagination items in a flex-based list container.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<ul>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <PaginationContent>
 *   <PaginationItem />
 * </PaginationContent>
 * ```
 *
 * @see {@link PaginationContentProps} for available props
 */
const PaginationContent = React.forwardRef<HTMLUListElement, PaginationContentProps>(
  ({className, ...props}: Readonly<PaginationContentProps>, ref): React.JSX.Element => (
    <ul
      ref={ref}
      className={cn(styles.content, className)}
      {...props}
    />
  ),
);

/**
 * Wraps an individual pagination control.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders an `<li>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <PaginationItem>
 *   <PaginationLink href='?page=1'>1</PaginationLink>
 * </PaginationItem>
 * ```
 *
 * @see {@link PaginationItemProps} for available props
 */
const PaginationItem = React.forwardRef<HTMLLIElement, PaginationItemProps>(
  ({className, ...props}: Readonly<PaginationItemProps>, ref): React.JSX.Element => (
    <li
      ref={ref}
      className={cn(styles.item, className)}
      {...props}
    />
  ),
);

/**
 * Renders an anchor styled to match pagination controls.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders an `<a>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <PaginationLink href='?page=2' isActive>
 *   2
 * </PaginationLink>
 * ```
 *
 * @see {@link PaginationLinkProps} for available props
 */
const PaginationLink = React.forwardRef<HTMLAnchorElement, PaginationLinkProps>(
  ({className, isActive = false, size = "icon", ...props}: Readonly<PaginationLinkProps>, ref): React.JSX.Element => {
    return (
      <a
        ref={ref}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          buttonStyles.button,
          isActive ? buttonStyles.outline : buttonStyles.ghost,
          buttonSizeStyles[size],
          styles.link,
          className,
        )}
        {...props}
      />
    );
  },
);

/**
 * Renders the pagination control for navigating to the previous page.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders an `<a>` element through {@link PaginationLink}
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <PaginationPrevious href='?page=1' />
 * ```
 *
 * @see {@link PaginationPreviousProps} for available props
 */
const PaginationPrevious = React.forwardRef<HTMLAnchorElement, PaginationPreviousProps>(
  ({className, ...props}: Readonly<PaginationPreviousProps>, ref): React.JSX.Element => (
    <PaginationLink
      ref={ref}
      aria-label='Go to previous page'
      size='default'
      className={cn(styles.previous, className)}
      {...props}>
      <ChevronLeft />
      <span>Previous</span>
    </PaginationLink>
  ),
);

/**
 * Renders the pagination control for navigating to the next page.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders an `<a>` element through {@link PaginationLink}
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <PaginationNext href='?page=3' />
 * ```
 *
 * @see {@link PaginationNextProps} for available props
 */
const PaginationNext = React.forwardRef<HTMLAnchorElement, PaginationNextProps>(
  ({className, ...props}: Readonly<PaginationNextProps>, ref): React.JSX.Element => (
    <PaginationLink
      ref={ref}
      aria-label='Go to next page'
      size='default'
      className={cn(styles.next, className)}
      {...props}>
      <span>Next</span>
      <ChevronRight />
    </PaginationLink>
  ),
);

/**
 * Indicates truncated page ranges within pagination.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<span>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <PaginationEllipsis />
 * ```
 *
 * @see {@link PaginationEllipsisProps} for available props
 */
const PaginationEllipsis = React.forwardRef<HTMLSpanElement, PaginationEllipsisProps>(
  ({className, ...props}: Readonly<PaginationEllipsisProps>, ref): React.JSX.Element => (
    <span
      ref={ref}
      aria-hidden='true'
      className={cn(styles.ellipsis, className)}
      {...props}>
      <MoreHorizontal />
      <span className={styles.srOnly}>More pages</span>
    </span>
  ),
);

Pagination.displayName = "Pagination";
PaginationContent.displayName = "PaginationContent";
PaginationItem.displayName = "PaginationItem";
PaginationLink.displayName = "PaginationLink";
PaginationPrevious.displayName = "PaginationPrevious";
PaginationNext.displayName = "PaginationNext";
PaginationEllipsis.displayName = "PaginationEllipsis";

export {Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious};
