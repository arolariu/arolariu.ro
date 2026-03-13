"use client";

import {Collapsible as BaseCollapsible} from "@base-ui/react/collapsible";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./collapsible.module.css";

const Collapsible = BaseCollapsible.Root;

const CollapsibleTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseCollapsible.Trigger> & {asChild?: boolean}
>(({asChild = false, children, className, ...props}, ref) => {
  const composedClassName = cn(styles.trigger, className);

  if (asChild && React.isValidElement(children)) {
    return (
      <BaseCollapsible.Trigger
        ref={ref}
        className={composedClassName}
        render={children as React.ReactElement}
        {...props}
      />
    );
  }

  return (
    <BaseCollapsible.Trigger
      ref={ref}
      className={composedClassName}
      {...props}>
      {children}
    </BaseCollapsible.Trigger>
  );
});
CollapsibleTrigger.displayName = "CollapsibleTrigger";

const CollapsibleContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseCollapsible.Panel>>(
  ({className, ...props}, ref) => (
    <BaseCollapsible.Panel
      ref={ref}
      className={cn(styles.panel, className)}
      {...props}
    />
  ),
);
CollapsibleContent.displayName = "CollapsibleContent";

export {Collapsible, CollapsibleContent, CollapsibleTrigger};
