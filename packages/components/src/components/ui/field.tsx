"use client";

/* eslint-disable jsx-a11y/label-has-associated-control */

import * as React from "react";

import {Separator} from "@/components/ui/separator";
import {cn} from "@/lib/utilities";
import styles from "./field.module.css";

/** Supported layouts for {@link Field}. */
export type FieldOrientation = "vertical" | "horizontal" | "responsive";

/** Supported legend render styles for {@link FieldLegend}. */
export type FieldLegendVariant = "legend" | "label";

/** Shape of error objects accepted by {@link FieldError}. */
export interface FieldErrorItem {
  /** Human-readable validation error message. @default undefined */
  message?: string;
}

/**
 * Props for the {@link FieldSet} component.
 */
export type FieldSetProps = React.ComponentPropsWithoutRef<"fieldset">;

/**
 * Props for the {@link FieldLegend} component.
 */
export interface FieldLegendProps extends React.ComponentPropsWithoutRef<"legend"> {
  /** Visual treatment used for the legend content. @default "legend" */
  variant?: FieldLegendVariant;
}

/**
 * Props for the {@link FieldGroup} component.
 */
export type FieldGroupProps = React.ComponentPropsWithoutRef<"div">;

/**
 * Props for the {@link Field} component.
 */
export interface FieldProps extends React.ComponentPropsWithoutRef<"div"> {
  /** Layout used to arrange labels and controls. @default "vertical" */
  orientation?: FieldOrientation;
}

/**
 * Props for the {@link FieldContent} component.
 */
export type FieldContentProps = React.ComponentPropsWithoutRef<"div">;

/**
 * Props for the {@link FieldLabel} component.
 */
export type FieldLabelProps = React.ComponentPropsWithoutRef<"label">;

/**
 * Props for the {@link FieldTitle} component.
 */
export type FieldTitleProps = React.ComponentPropsWithoutRef<"div">;

/**
 * Props for the {@link FieldDescription} component.
 */
export type FieldDescriptionProps = React.ComponentPropsWithoutRef<"p">;

/**
 * Props for the {@link FieldSeparator} component.
 */
export type FieldSeparatorProps = React.ComponentPropsWithoutRef<"div">;

/**
 * Props for the {@link FieldError} component.
 */
export interface FieldErrorProps extends React.ComponentPropsWithoutRef<"div"> {
  /** Validation errors rendered when children are not provided. @default undefined */
  errors?: Array<FieldErrorItem | undefined>;
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

/**
 * Groups related controls within a semantic fieldset.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<fieldset>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <FieldSet>
 *   <FieldLegend>Preferences</FieldLegend>
 * </FieldSet>
 * ```
 *
 * @see {@link FieldSetProps} for available props
 */
const FieldSet = React.forwardRef<HTMLFieldSetElement, FieldSetProps>(
  ({className, ...props}: Readonly<FieldSetProps>, ref): React.JSX.Element => (
    <fieldset
      ref={ref}
      data-slot='field-set'
      className={cn(styles.fieldSet, className)}
      {...props}
    />
  ),
);

/**
 * Labels a grouped set of controls within {@link FieldSet}.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<legend>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <FieldLegend variant='label'>Billing address</FieldLegend>
 * ```
 *
 * @see {@link FieldLegendProps} for available props
 */
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

/**
 * Stacks multiple field rows under a shared container.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<div>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <FieldGroup>
 *   <Field />
 * </FieldGroup>
 * ```
 *
 * @see {@link FieldGroupProps} for available props
 */
const FieldGroup = React.forwardRef<HTMLDivElement, FieldGroupProps>(
  ({className, ...props}: Readonly<FieldGroupProps>, ref): React.JSX.Element => (
    <div
      ref={ref}
      data-slot='field-group'
      className={cn(styles.group, className)}
      {...props}
    />
  ),
);

/**
 * Creates a styled field row for labels, descriptions, and controls.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<div>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <Field orientation='responsive'>...</Field>
 * ```
 *
 * @see {@link FieldProps} for available props
 */
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

/**
 * Wraps field controls and supporting content.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<div>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <FieldContent>{control}</FieldContent>
 * ```
 *
 * @see {@link FieldContentProps} for available props
 */
const FieldContent = React.forwardRef<HTMLDivElement, FieldContentProps>(
  ({className, ...props}: Readonly<FieldContentProps>, ref): React.JSX.Element => (
    <div
      ref={ref}
      data-slot='field-content'
      className={cn(styles.content, className)}
      {...props}
    />
  ),
);

/**
 * Renders the label associated with a form control.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<label>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <FieldLabel htmlFor='email'>Email</FieldLabel>
 * ```
 *
 * @see {@link FieldLabelProps} for available props
 */
const FieldLabel = React.forwardRef<HTMLLabelElement, FieldLabelProps>(
  ({className, ...props}: Readonly<FieldLabelProps>, ref): React.JSX.Element => {
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

/**
 * Displays the leading title content for a field row.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<div>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <FieldTitle>Account</FieldTitle>
 * ```
 *
 * @see {@link FieldTitleProps} for available props
 */
const FieldTitle = React.forwardRef<HTMLDivElement, FieldTitleProps>(
  ({className, ...props}: Readonly<FieldTitleProps>, ref): React.JSX.Element => (
    <div
      ref={ref}
      data-slot='field-label'
      className={cn(styles.title, className)}
      {...props}
    />
  ),
);

/**
 * Renders supplementary descriptive text for a field.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<p>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <FieldDescription>Used for account recovery.</FieldDescription>
 * ```
 *
 * @see {@link FieldDescriptionProps} for available props
 */
const FieldDescription = React.forwardRef<HTMLParagraphElement, FieldDescriptionProps>(
  ({className, ...props}: Readonly<FieldDescriptionProps>, ref): React.JSX.Element => (
    <p
      ref={ref}
      data-slot='field-description'
      className={cn(styles.description, className)}
      {...props}
    />
  ),
);

/**
 * Separates field sections with optional inline content.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<div>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <FieldSeparator>or</FieldSeparator>
 * ```
 *
 * @see {@link FieldSeparatorProps} for available props
 */
const FieldSeparator = React.forwardRef<HTMLDivElement, FieldSeparatorProps>(
  ({children, className, ...props}: Readonly<FieldSeparatorProps>, ref): React.JSX.Element => (
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

/**
 * Presents validation feedback for a field.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<div>` element when content exists
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <FieldError errors={[{message: "Required"}]} />
 * ```
 *
 * @see {@link FieldErrorProps} for available props
 */
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

FieldSet.displayName = "FieldSet";
FieldLegend.displayName = "FieldLegend";
FieldGroup.displayName = "FieldGroup";
Field.displayName = "Field";
FieldContent.displayName = "FieldContent";
FieldLabel.displayName = "FieldLabel";
FieldTitle.displayName = "FieldTitle";
FieldDescription.displayName = "FieldDescription";
FieldSeparator.displayName = "FieldSeparator";
FieldError.displayName = "FieldError";

export {Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSeparator, FieldSet, FieldTitle};
