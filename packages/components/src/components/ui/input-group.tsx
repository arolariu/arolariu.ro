"use client";

import * as React from "react";

import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {cn} from "@/lib/utilities";
import styles from "./input-group.module.css";

type InputGroupAddonAlign = "inline-start" | "inline-end" | "block-start" | "block-end";
type InputGroupButtonSize = "xs" | "sm" | "icon-xs" | "icon-sm";

interface InputGroupAddonProps extends React.ComponentPropsWithoutRef<"div"> {
  align?: InputGroupAddonAlign;
}

interface InputGroupButtonProps extends Omit<React.ComponentPropsWithoutRef<typeof Button>, "size"> {
  size?: InputGroupButtonSize;
}

function getAddonAlignClass(align: InputGroupAddonAlign): string {
  switch (align) {
    case "block-end": {
      return styles.blockEnd;
    }
    case "block-start": {
      return styles.blockStart;
    }
    case "inline-end": {
      return styles.inlineEnd;
    }
    default: {
      return styles.inlineStart;
    }
  }
}

function getButtonSizeClass(size: InputGroupButtonSize): string {
  switch (size) {
    case "icon-sm": {
      return styles.buttonIconSm;
    }
    case "icon-xs": {
      return styles.buttonIconXs;
    }
    case "sm": {
      return styles.buttonSm;
    }
    default: {
      return styles.buttonXs;
    }
  }
}

const InputGroup = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<"div">>(
  ({className, ...props}: Readonly<React.ComponentPropsWithoutRef<"div">>, ref): React.JSX.Element => (
    <div
      ref={ref}
      role='group'
      data-slot='input-group'
      className={cn(styles.group, className)}
      {...props}
    />
  ),
);
InputGroup.displayName = "InputGroup";

const InputGroupAddon = React.forwardRef<HTMLDivElement, InputGroupAddonProps>(
  ({className, align = "inline-start", onClick, ...props}: Readonly<InputGroupAddonProps>, ref): React.JSX.Element => (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- clicking the addon focuses the related control.
    <div
      ref={ref}
      role='group'
      data-slot='input-group-addon'
      data-align={align}
      className={cn(styles.addon, getAddonAlignClass(align), className)}
      onClick={(event): void => {
        if ((event.target as HTMLElement).closest("button")) {
          onClick?.(event);
          return;
        }

        onClick?.(event);

        if (event.defaultPrevented) {
          return;
        }

        event.currentTarget.parentElement?.querySelector<HTMLInputElement | HTMLTextAreaElement>("input, textarea")?.focus();
      }}
      {...props}
    />
  ),
);
InputGroupAddon.displayName = "InputGroupAddon";

const InputGroupButton = React.forwardRef<HTMLButtonElement, InputGroupButtonProps>(
  ({className, type = "button", variant = "ghost", size = "xs", ...props}: Readonly<InputGroupButtonProps>, ref): React.JSX.Element => (
    <Button
      ref={ref}
      type={type}
      data-size={size}
      variant={variant}
      className={cn(styles.button, getButtonSizeClass(size), className)}
      {...props}
    />
  ),
);
InputGroupButton.displayName = "InputGroupButton";

const InputGroupText = React.forwardRef<HTMLSpanElement, React.ComponentPropsWithoutRef<"span">>(
  ({className, ...props}: Readonly<React.ComponentPropsWithoutRef<"span">>, ref): React.JSX.Element => (
    <span
      ref={ref}
      className={cn(styles.text, className)}
      {...props}
    />
  ),
);
InputGroupText.displayName = "InputGroupText";

const InputGroupInput = React.forwardRef<HTMLInputElement, React.ComponentPropsWithoutRef<"input">>(
  ({className, ...props}: Readonly<React.ComponentPropsWithoutRef<"input">>, ref): React.JSX.Element => (
    <Input
      ref={ref}
      data-slot='input-group-control'
      className={cn(styles.input, className)}
      {...props}
    />
  ),
);
InputGroupInput.displayName = "InputGroupInput";

const InputGroupTextarea = React.forwardRef<HTMLTextAreaElement, React.ComponentPropsWithoutRef<"textarea">>(
  ({className, ...props}: Readonly<React.ComponentPropsWithoutRef<"textarea">>, ref): React.JSX.Element => (
    <Textarea
      ref={ref}
      data-slot='input-group-control'
      className={cn(styles.textarea, className)}
      {...props}
    />
  ),
);
InputGroupTextarea.displayName = "InputGroupTextarea";

export {InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText, InputGroupTextarea};
