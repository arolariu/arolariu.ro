"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as React from "react";

import {cn} from "@/lib/utilities";

function Tabs({className, ...props}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot='tabs'
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

function TabsList({className, ...props}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot='tabs-list'
      className={cn(
        "inline-flex h-9 w-fit items-center justify-center rounded-lg bg-neutral-100 p-[3px] text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({className, ...props}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot='tabs-trigger'
      className={cn(
        "focus-visible:outline-ring inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-neutral-200 border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap text-neutral-950 transition-[color,box-shadow] focus-visible:border-neutral-950 focus-visible:ring-[3px] focus-visible:ring-neutral-950/50 focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:shadow-sm dark:border-neutral-800 dark:dark:text-neutral-400 dark:text-neutral-50 dark:text-neutral-500 dark:focus-visible:border-neutral-300 dark:focus-visible:ring-neutral-300/50 dark:dark:data-[state=active]:border-neutral-800 dark:data-[state=active]:border-neutral-200 dark:dark:data-[state=active]:bg-neutral-800/30 dark:data-[state=active]:bg-neutral-200/30 dark:data-[state=active]:bg-neutral-950 dark:dark:data-[state=active]:text-neutral-50 dark:data-[state=active]:text-neutral-950 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({className, ...props}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot='tabs-content'
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
}

export {Tabs, TabsContent, TabsList, TabsTrigger};
