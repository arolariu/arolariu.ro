"use client";

import * as React from "react";

import {cn} from "@/lib/utilities";

function Card({className, ...props}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot='card'
      className={cn(
        "flex flex-col gap-6 rounded-xl border border-neutral-200 bg-white py-6 text-neutral-950 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({className, ...props}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot='card-header'
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({className, ...props}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot='card-title'
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  );
}

function CardDescription({className, ...props}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot='card-description'
      className={cn("text-sm text-neutral-500 dark:text-neutral-400", className)}
      {...props}
    />
  );
}

function CardAction({className, ...props}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot='card-action'
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  );
}

function CardContent({className, ...props}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot='card-content'
      className={cn("px-6", className)}
      {...props}
    />
  );
}

function CardFooter({className, ...props}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot='card-footer'
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  );
}

export {Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle};
