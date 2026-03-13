"use client";

import * as React from "react";

import {Separator} from "@/components/ui/separator";
import {cn} from "@/lib/utilities";
import styles from "./button-group.module.css";

type ButtonGroupOrientation = "horizontal" | "vertical";

interface ButtonGroupVariantOptions {
  orientation?: ButtonGroupOrientation;
  className?: string;
}

interface ButtonGroupProps extends React.ComponentPropsWithoutRef<"div"> {
  orientation?: ButtonGroupOrientation;
}

interface ButtonGroupTextProps extends React.ComponentPropsWithoutRef<"div"> {
  /** @deprecated Prefer Base UI's `render` prop. */

  asChild?: boolean;
}

function buttonGroupVariants({orientation = "horizontal", className}: Readonly<ButtonGroupVariantOptions> = {}): string {
  return cn(styles.root, orientation === "vertical" ? styles.vertical : styles.horizontal, className);
}

const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({className, orientation = "horizontal", ...props}: Readonly<ButtonGroupProps>, ref): React.JSX.Element => (
    <div
      ref={ref}
      role='group'
      data-slot='button-group'
      data-orientation={orientation}
      className={buttonGroupVariants({orientation, className})}
      {...props}
    />
  ),
);
ButtonGroup.displayName = "ButtonGroup";

const ButtonGroupText = React.forwardRef<HTMLDivElement, ButtonGroupTextProps>(
  ({className, asChild = false, children, ...props}: Readonly<ButtonGroupTextProps>, ref): React.JSX.Element => {
    const mergedClassName = cn(styles.text, className);

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<React.ComponentPropsWithoutRef<"div"> & {ref?: React.Ref<HTMLDivElement>}>;

      // eslint-disable-next-line react-x/no-clone-element -- replaces Radix Slot while preserving asChild prop merging
      return React.cloneElement(child, {
        ...props,
        ref,
        className: cn(mergedClassName, child.props.className),
      });
    }

    return (
      <div
        ref={ref}
        className={mergedClassName}
        {...props}>
        {children}
      </div>
    );
  },
);
ButtonGroupText.displayName = "ButtonGroupText";

const ButtonGroupSeparator = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof Separator>>(
  ({className, orientation = "vertical", ...props}: Readonly<React.ComponentPropsWithoutRef<typeof Separator>>, ref): React.JSX.Element => (
    <Separator
      ref={ref}
      data-slot='button-group-separator'
      orientation={orientation}
      className={cn(styles.separator, className)}
      {...props}
    />
  ),
);
ButtonGroupSeparator.displayName = "ButtonGroupSeparator";

export {ButtonGroup, ButtonGroupSeparator, ButtonGroupText, buttonGroupVariants};
