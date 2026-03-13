"use client";

import {ChevronRight, MoreHorizontal} from "lucide-react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./breadcrumb.module.css";

interface BreadcrumbProps extends React.ComponentPropsWithoutRef<"nav"> {
  separator?: React.ReactNode;
}

interface BreadcrumbLinkProps extends React.ComponentPropsWithoutRef<"a"> {
  /** @deprecated Prefer Base UI's `render` prop. */

  asChild?: boolean;
}

const Breadcrumb = React.forwardRef<HTMLElement, BreadcrumbProps>(
  ({className, ...props}: Readonly<BreadcrumbProps>, ref): React.JSX.Element => (
    <nav
      ref={ref}
      aria-label='breadcrumb'
      className={cn(styles.root, className)}
      {...props}
    />
  ),
);
Breadcrumb.displayName = "Breadcrumb";

const BreadcrumbList = React.forwardRef<HTMLOListElement, React.ComponentPropsWithoutRef<"ol">>(
  ({className, ...props}: Readonly<React.ComponentPropsWithoutRef<"ol">>, ref): React.JSX.Element => (
    <ol
      ref={ref}
      className={cn(styles.list, className)}
      {...props}
    />
  ),
);
BreadcrumbList.displayName = "BreadcrumbList";

const BreadcrumbItem = React.forwardRef<HTMLLIElement, React.ComponentPropsWithoutRef<"li">>(
  ({className, ...props}: Readonly<React.ComponentPropsWithoutRef<"li">>, ref): React.JSX.Element => (
    <li
      ref={ref}
      className={cn(styles.item, className)}
      {...props}
    />
  ),
);
BreadcrumbItem.displayName = "BreadcrumbItem";

const BreadcrumbLink = React.forwardRef<HTMLAnchorElement, BreadcrumbLinkProps>(
  ({asChild, className, children, ...props}: Readonly<BreadcrumbLinkProps>, ref): React.JSX.Element => {
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
BreadcrumbLink.displayName = "BreadcrumbLink";

const BreadcrumbPage = React.forwardRef<HTMLSpanElement, React.ComponentPropsWithoutRef<"span">>(
  ({className, ...props}: Readonly<React.ComponentPropsWithoutRef<"span">>, ref): React.JSX.Element => (
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
BreadcrumbPage.displayName = "BreadcrumbPage";

const BreadcrumbSeparator = React.forwardRef<HTMLLIElement, React.ComponentPropsWithoutRef<"li">>(
  ({children, className, ...props}: Readonly<React.ComponentPropsWithoutRef<"li">>, ref): React.JSX.Element => (
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
BreadcrumbSeparator.displayName = "BreadcrumbSeparator";

const BreadcrumbEllipsis = React.forwardRef<HTMLSpanElement, React.ComponentPropsWithoutRef<"span">>(
  ({className, ...props}: Readonly<React.ComponentPropsWithoutRef<"span">>, ref): React.JSX.Element => (
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
BreadcrumbEllipsis.displayName = "BreadcrumbEllipsis";

export {Breadcrumb, BreadcrumbEllipsis, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator};
