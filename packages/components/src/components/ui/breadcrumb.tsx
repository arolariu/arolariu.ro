"use client";

import {Slot} from "@radix-ui/react-slot";
import {ChevronRight, MoreHorizontal} from "lucide-react";
import * as React from "react";

import {cn} from "@/lib/utilities";

function Breadcrumb({...props}: Readonly<React.ComponentProps<"nav">>) {
  return (
    <nav
      aria-label='breadcrumb'
      data-slot='breadcrumb'
      {...props}
    />
  );
}

function BreadcrumbList({className, ...props}: Readonly<React.ComponentProps<"ol">>) {
  return (
    <ol
      data-slot='breadcrumb-list'
      className={cn("flex flex-wrap items-center gap-1.5 text-sm break-words text-neutral-500 sm:gap-2.5 dark:text-neutral-400", className)}
      {...props}
    />
  );
}

function BreadcrumbItem({className, ...props}: Readonly<React.ComponentProps<"li">>) {
  return (
    <li
      data-slot='breadcrumb-item'
      className={cn("inline-flex items-center gap-1.5", className)}
      {...props}
    />
  );
}

function BreadcrumbLink({
  asChild,
  className,
  ...props
}: React.ComponentProps<"a"> & {
  asChild?: boolean;
}) {
  const Comp = asChild ? Slot : "a";

  return (
    <Comp
      data-slot='breadcrumb-link'
      className={cn("transition-colors hover:text-neutral-950 dark:hover:text-neutral-50", className)}
      {...props}
    />
  );
}

function BreadcrumbPage({className, ...props}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot='breadcrumb-page'
      role='link'
      aria-disabled='true'
      aria-current='page'
      className={cn("font-normal text-neutral-950 dark:text-neutral-50", className)}
      {...props}
    />
  );
}

function BreadcrumbSeparator({children, className, ...props}: Readonly<React.ComponentProps<"li">>) {
  return (
    <li
      data-slot='breadcrumb-separator'
      role='presentation'
      aria-hidden='true'
      className={cn("[&>svg]:size-3.5", className)}
      {...props}>
      {children ?? <ChevronRight />}
    </li>
  );
}

function BreadcrumbEllipsis({className, ...props}: Readonly<React.ComponentProps<"span">>) {
  return (
    <span
      data-slot='breadcrumb-ellipsis'
      role='presentation'
      aria-hidden='true'
      className={cn("flex size-9 items-center justify-center", className)}
      {...props}>
      <MoreHorizontal className='size-4' />
      <span className='sr-only'>More</span>
    </span>
  );
}

export {Breadcrumb, BreadcrumbEllipsis, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator};
