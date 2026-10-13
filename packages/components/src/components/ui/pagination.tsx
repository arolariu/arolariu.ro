import {ChevronLeft, ChevronRight, Ellipsis} from "lucide-react";
import * as React from "react";

import type {ButtonProps} from "@/components/ui/button";
import {cn} from "@/lib/utilities";
import buttonStyles from "./button.module.css";
import styles from "./pagination.module.css";

/**
 * Props for the {@link Pagination} component.
 */
export type PaginationProps = Readonly<React.ComponentPropsWithoutRef<"nav">>;

/**
 * Props for the {@link PaginationContent} component.
 */
export type PaginationContentProps = Readonly<React.ComponentPropsWithoutRef<"ul">>;

/**
 * Props for the {@link PaginationItem} component.
 */
export type PaginationItemProps = Readonly<React.ComponentPropsWithoutRef<"li">>;

/**
 * Props for the {@link PaginationLink} component.
 */
export interface PaginationLinkProps extends Readonly<Pick<ButtonProps, "size">>, Readonly<React.ComponentPropsWithoutRef<"a">> {
  /** Marks the link as the current active page. @default false */
  readonly isActive?: boolean;
}

/**
 * Props for the {@link PaginationPrevious} component.
 */
export interface PaginationPreviousProps extends PaginationLinkProps {
  /** Visible navigation copy. Override `aria-label` separately to localize the accessible name. @default "Previous" */
  readonly text?: string;
}

/**
 * Props for the {@link PaginationNext} component.
 */
export interface PaginationNextProps extends PaginationLinkProps {
  /** Visible navigation copy. Override `aria-label` separately to localize the accessible name. @default "Next" */
  readonly text?: string;
}

/**
 * Props for the {@link PaginationEllipsis} component.
 */
export type PaginationEllipsisProps = Readonly<React.ComponentPropsWithoutRef<"span">>;

const buttonSizeStyles: Readonly<Record<NonNullable<ButtonProps["size"]>, string | undefined>> = {
  default: buttonStyles.sizeDefault,
  xs: buttonStyles.sizeXs,
  icon: buttonStyles.sizeIcon,
  "icon-xs": buttonStyles.sizeIconXs,
  "icon-sm": buttonStyles.sizeIconSm,
  "icon-lg": buttonStyles.sizeIconLg,
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
      data-slot='pagination'
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
      data-slot='pagination-content'
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
      data-slot='pagination-item'
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
  ({className, children, isActive = false, size = "icon", ...props}: Readonly<PaginationLinkProps>, ref): React.JSX.Element => {
    return (
      <a
        ref={ref}
        data-slot='pagination-link'
        data-active={isActive}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          buttonStyles.button,
          isActive ? buttonStyles.outline : buttonStyles.ghost,
          buttonSizeStyles[size],
          styles.link,
          className,
        )}
        {...props}>
        {children}
      </a>
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
  ({className, text = "Previous", ...props}: Readonly<PaginationPreviousProps>, ref): React.JSX.Element => (
    <PaginationLink
      ref={ref}
      aria-label='Go to previous page'
      size='default'
      className={cn(styles.previous, className)}
      {...props}>
      <ChevronLeft
        aria-hidden='true'
        focusable='false'
        data-icon='inline-start'
      />
      <span className={styles.navigationText}>{text}</span>
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
  ({className, text = "Next", ...props}: Readonly<PaginationNextProps>, ref): React.JSX.Element => (
    <PaginationLink
      ref={ref}
      aria-label='Go to next page'
      size='default'
      className={cn(styles.next, className)}
      {...props}>
      <span className={styles.navigationText}>{text}</span>
      <ChevronRight
        aria-hidden='true'
        focusable='false'
        data-icon='inline-end'
      />
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
      data-slot='pagination-ellipsis'
      aria-hidden='true'
      className={cn(styles.ellipsis, className)}
      {...props}>
      <Ellipsis />
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

// eslint-disable-next-line no-redeclare -- public component namespace
namespace Pagination {
  export type Props = Readonly<PaginationProps>;
}
// eslint-disable-next-line no-redeclare -- public component namespace
namespace PaginationContent {
  export type Props = Readonly<PaginationContentProps>;
}
// eslint-disable-next-line no-redeclare -- public component namespace
namespace PaginationItem {
  export type Props = Readonly<PaginationItemProps>;
}
// eslint-disable-next-line no-redeclare -- public component namespace
namespace PaginationLink {
  export type Props = PaginationLinkProps;
}
// eslint-disable-next-line no-redeclare -- public component namespace
namespace PaginationPrevious {
  export type Props = PaginationPreviousProps;
}
// eslint-disable-next-line no-redeclare -- public component namespace
namespace PaginationNext {
  export type Props = PaginationNextProps;
}
// eslint-disable-next-line no-redeclare -- public component namespace
namespace PaginationEllipsis {
  export type Props = Readonly<PaginationEllipsisProps>;
}

export {Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious};
