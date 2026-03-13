"use client";

/* eslint-disable jsx-a11y/anchor-has-content */

import {ChevronLeft, ChevronRight, MoreHorizontal} from "lucide-react";
import * as React from "react";

import type {ButtonProps} from "@/components/ui/button";
import {cn} from "@/lib/utilities";
import buttonStyles from "./button.module.css";
import styles from "./pagination.module.css";

type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<ButtonProps, "size">
  & React.ComponentPropsWithoutRef<"a">;

const buttonSizeStyles: Record<NonNullable<ButtonProps["size"]>, string> = {
  default: buttonStyles.sizeDefault,
  icon: buttonStyles.sizeIcon,
  lg: buttonStyles.sizeLg,
  sm: buttonStyles.sizeSm,
};

const Pagination = React.forwardRef<HTMLElement, React.ComponentPropsWithoutRef<"nav">>(
  ({className, ...props}: Readonly<React.ComponentPropsWithoutRef<"nav">>, ref): React.JSX.Element => (
    <nav
      ref={ref}
      role='navigation'
      aria-label='pagination'
      className={cn(styles.root, className)}
      {...props}
    />
  ),
);
Pagination.displayName = "Pagination";

const PaginationContent = React.forwardRef<HTMLUListElement, React.ComponentPropsWithoutRef<"ul">>(
  ({className, ...props}: Readonly<React.ComponentPropsWithoutRef<"ul">>, ref): React.JSX.Element => (
    <ul
      ref={ref}
      className={cn(styles.content, className)}
      {...props}
    />
  ),
);
PaginationContent.displayName = "PaginationContent";

const PaginationItem = React.forwardRef<HTMLLIElement, React.ComponentPropsWithoutRef<"li">>(
  ({className, ...props}: Readonly<React.ComponentPropsWithoutRef<"li">>, ref): React.JSX.Element => (
    <li
      ref={ref}
      className={cn(styles.item, className)}
      {...props}
    />
  ),
);
PaginationItem.displayName = "PaginationItem";

const PaginationLink = React.forwardRef<HTMLAnchorElement, PaginationLinkProps>(
  ({className, isActive, size = "icon", ...props}: Readonly<PaginationLinkProps>, ref): React.JSX.Element => {
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
PaginationLink.displayName = "PaginationLink";

const PaginationPrevious = React.forwardRef<HTMLAnchorElement, React.ComponentPropsWithoutRef<typeof PaginationLink>>(
  ({className, ...props}: Readonly<React.ComponentPropsWithoutRef<typeof PaginationLink>>, ref): React.JSX.Element => (
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
PaginationPrevious.displayName = "PaginationPrevious";

const PaginationNext = React.forwardRef<HTMLAnchorElement, React.ComponentPropsWithoutRef<typeof PaginationLink>>(
  ({className, ...props}: Readonly<React.ComponentPropsWithoutRef<typeof PaginationLink>>, ref): React.JSX.Element => (
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
PaginationNext.displayName = "PaginationNext";

const PaginationEllipsis = React.forwardRef<HTMLSpanElement, React.ComponentPropsWithoutRef<"span">>(
  ({className, ...props}: Readonly<React.ComponentPropsWithoutRef<"span">>, ref): React.JSX.Element => (
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
PaginationEllipsis.displayName = "PaginationEllipsis";

export {Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious};
