"use client";

import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./empty.module.css";

interface EmptyMediaProps extends React.ComponentPropsWithoutRef<"div"> {
  variant?: "default" | "icon";
}

const Empty = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<"div">>(
  ({className, ...props}: Readonly<React.ComponentPropsWithoutRef<"div">>, ref): React.JSX.Element => (
    <div
      ref={ref}
      data-slot='empty'
      className={cn(styles.empty, className)}
      {...props}
    />
  ),
);
Empty.displayName = "Empty";

const EmptyHeader = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<"div">>(
  ({className, ...props}: Readonly<React.ComponentPropsWithoutRef<"div">>, ref): React.JSX.Element => (
    <div
      ref={ref}
      data-slot='empty-header'
      className={cn(styles.header, className)}
      {...props}
    />
  ),
);
EmptyHeader.displayName = "EmptyHeader";

const EmptyMedia = React.forwardRef<HTMLDivElement, EmptyMediaProps>(
  ({className, variant = "default", ...props}: Readonly<EmptyMediaProps>, ref): React.JSX.Element => (
    <div
      ref={ref}
      data-slot='empty-icon'
      data-variant={variant}
      className={cn(styles.media, variant === "icon" && styles.mediaIcon, className)}
      {...props}
    />
  ),
);
EmptyMedia.displayName = "EmptyMedia";

const EmptyTitle = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<"div">>(
  ({className, ...props}: Readonly<React.ComponentPropsWithoutRef<"div">>, ref): React.JSX.Element => (
    <div
      ref={ref}
      data-slot='empty-title'
      className={cn(styles.title, className)}
      {...props}
    />
  ),
);
EmptyTitle.displayName = "EmptyTitle";

const EmptyDescription = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<"div">>(
  ({className, ...props}: Readonly<React.ComponentPropsWithoutRef<"div">>, ref): React.JSX.Element => (
    <div
      ref={ref}
      data-slot='empty-description'
      className={cn(styles.description, className)}
      {...props}
    />
  ),
);
EmptyDescription.displayName = "EmptyDescription";

const EmptyContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<"div">>(
  ({className, ...props}: Readonly<React.ComponentPropsWithoutRef<"div">>, ref): React.JSX.Element => (
    <div
      ref={ref}
      data-slot='empty-content'
      className={cn(styles.content, className)}
      {...props}
    />
  ),
);
EmptyContent.displayName = "EmptyContent";

export {Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle};
