"use client";

/* eslint-disable jsx-a11y/label-has-associated-control */

import * as React from "react";

import {Separator} from "@/components/ui/separator";
import {cn} from "@/lib/utilities";
import styles from "./field.module.css";

type FieldOrientation = "vertical" | "horizontal" | "responsive";
type FieldLegendVariant = "legend" | "label";

interface FieldLegendProps extends React.ComponentPropsWithoutRef<"legend"> {
  variant?: FieldLegendVariant;
}

interface FieldProps extends React.ComponentPropsWithoutRef<"div"> {
  orientation?: FieldOrientation;
}

interface FieldErrorProps extends React.ComponentPropsWithoutRef<"div"> {
  errors?: Array<{message?: string} | undefined>;
}

function getFieldOrientationClass(orientation: FieldOrientation): string {
  switch (orientation) {
    case "horizontal": {
      return styles.horizontal;
    }
    case "responsive": {
      return styles.responsive;
    }
    default: {
      return styles.vertical;
    }
  }
}

const FieldSet = React.forwardRef<HTMLFieldSetElement, React.ComponentPropsWithoutRef<"fieldset">>(
  ({className, ...props}: Readonly<React.ComponentPropsWithoutRef<"fieldset">>, ref): React.JSX.Element => (
    <fieldset
      ref={ref}
      data-slot='field-set'
      className={cn(styles.fieldSet, className)}
      {...props}
    />
  ),
);
FieldSet.displayName = "FieldSet";

const FieldLegend = React.forwardRef<HTMLLegendElement, FieldLegendProps>(
  ({className, variant = "legend", ...props}: Readonly<FieldLegendProps>, ref): React.JSX.Element => (
    <legend
      ref={ref}
      data-slot='field-legend'
      data-variant={variant}
      className={cn(styles.legend, variant === "label" ? styles.legendLabel : styles.legendDefault, className)}
      {...props}
    />
  ),
);
FieldLegend.displayName = "FieldLegend";

const FieldGroup = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<"div">>(
  ({className, ...props}: Readonly<React.ComponentPropsWithoutRef<"div">>, ref): React.JSX.Element => (
    <div
      ref={ref}
      data-slot='field-group'
      className={cn(styles.group, className)}
      {...props}
    />
  ),
);
FieldGroup.displayName = "FieldGroup";

const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  ({className, orientation = "vertical", ...props}: Readonly<FieldProps>, ref): React.JSX.Element => (
    <div
      ref={ref}
      role='group'
      data-slot='field'
      data-orientation={orientation}
      className={cn(styles.field, getFieldOrientationClass(orientation), className)}
      {...props}
    />
  ),
);
Field.displayName = "Field";

const FieldContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<"div">>(
  ({className, ...props}: Readonly<React.ComponentPropsWithoutRef<"div">>, ref): React.JSX.Element => (
    <div
      ref={ref}
      data-slot='field-content'
      className={cn(styles.content, className)}
      {...props}
    />
  ),
);
FieldContent.displayName = "FieldContent";

const FieldLabel = React.forwardRef<HTMLLabelElement, React.ComponentPropsWithoutRef<"label">>(
  ({className, ...props}: Readonly<React.ComponentPropsWithoutRef<"label">>, ref): React.JSX.Element => {
    return (
      <label
        ref={ref}
        data-slot='field-label'
        className={cn(styles.label, className)}
        {...props}
      />
    );
  },
);
FieldLabel.displayName = "FieldLabel";

const FieldTitle = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<"div">>(
  ({className, ...props}: Readonly<React.ComponentPropsWithoutRef<"div">>, ref): React.JSX.Element => (
    <div
      ref={ref}
      data-slot='field-label'
      className={cn(styles.title, className)}
      {...props}
    />
  ),
);
FieldTitle.displayName = "FieldTitle";

const FieldDescription = React.forwardRef<HTMLParagraphElement, React.ComponentPropsWithoutRef<"p">>(
  ({className, ...props}: Readonly<React.ComponentPropsWithoutRef<"p">>, ref): React.JSX.Element => (
    <p
      ref={ref}
      data-slot='field-description'
      className={cn(styles.description, className)}
      {...props}
    />
  ),
);
FieldDescription.displayName = "FieldDescription";

const FieldSeparator = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<"div">>(
  ({children, className, ...props}: Readonly<React.ComponentPropsWithoutRef<"div">>, ref): React.JSX.Element => (
    <div
      ref={ref}
      data-slot='field-separator'
      data-content={children ? "true" : undefined}
      className={cn(styles.separator, className)}
      {...props}>
      <Separator className={styles.separatorLine} />
      {children ? <span className={styles.separatorContent}>{children}</span> : null}
    </div>
  ),
);
FieldSeparator.displayName = "FieldSeparator";

const FieldError = React.forwardRef<HTMLDivElement, FieldErrorProps>(
  ({className, children, errors, ...props}: Readonly<FieldErrorProps>, ref): React.JSX.Element | null => {
    const content = React.useMemo((): React.JSX.Element | null => {
      if (children) {
        return <span>{children}</span>;
      }

      if (!errors) {
        return null;
      }

      if (errors.length === 1 && errors[0]?.message) {
        return <span>{errors[0].message}</span>;
      }

      return (
        <ul className={styles.errorList}>{errors.map((error, index) => (error?.message ? <li key={index}>{error.message}</li> : null))}</ul>
      );
    }, [children, errors]);

    if (!content) {
      return null;
    }

    return (
      <div
        ref={ref}
        role='alert'
        data-slot='field-error'
        className={cn(styles.error, className)}
        {...props}>
        {content}
      </div>
    );
  },
);
FieldError.displayName = "FieldError";

export {Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSeparator, FieldSet, FieldTitle};
