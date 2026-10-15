import * as React from "react";

import {Label} from "@/components/ui/label";
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
  readonly message?: string;
}

/**
 * Props for the {@link FieldSet} component.
 */
export type FieldSetProps = Readonly<React.ComponentPropsWithRef<"fieldset">>;

/**
 * Props for the {@link FieldLegend} component.
 */
export interface FieldLegendProps extends React.ComponentPropsWithRef<"legend"> {
  /** Visual treatment used for the legend content. @default "legend" */
  readonly variant?: FieldLegendVariant;
}

/**
 * Props for the {@link FieldGroup} component.
 */
export type FieldGroupProps = Readonly<React.ComponentPropsWithRef<"div">>;

/**
 * Props for the {@link Field} component.
 */
export interface FieldProps extends React.ComponentPropsWithRef<"div"> {
  /** Layout used to arrange labels and controls. @default "vertical" */
  readonly orientation?: FieldOrientation;
}

/**
 * Props for the {@link FieldContent} component.
 */
export type FieldContentProps = Readonly<React.ComponentPropsWithRef<"div">>;

/**
 * Props for the {@link FieldLabel} component.
 */
export type FieldLabelProps = Label.Props;

/**
 * Props for the {@link FieldTitle} component.
 */
export type FieldTitleProps = Readonly<React.ComponentPropsWithRef<"div">>;

/**
 * Props for the {@link FieldDescription} component.
 */
export type FieldDescriptionProps = Readonly<React.ComponentPropsWithRef<"p">>;

/**
 * Props for the {@link FieldSeparator} component.
 */
export type FieldSeparatorProps = Readonly<React.ComponentPropsWithRef<"div">>;

/**
 * Props for the {@link FieldError} component.
 */
export interface FieldErrorProps extends React.ComponentPropsWithRef<"div"> {
  /** Validation errors rendered when children are not provided. @default undefined */
  readonly errors?: ReadonlyArray<FieldErrorItem | undefined>;
}

function getFieldOrientationClass(orientation: FieldOrientation): string | undefined {
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

function hasMeaningfulChildren(children: React.ReactNode): boolean {
  let content = children;
  while (React.isValidElement<{children?: React.ReactNode}>(content) && content.type === React.Fragment) {
    content = content.props.children;
  }
  if (Array.isArray(content)) {
    return content.some((child: React.ReactNode) => hasMeaningfulChildren(child));
  }
  return typeof content === "string"
    ? content.trim().length > 0
    : content !== null && content !== undefined && typeof content !== "boolean";
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
const FieldSet = ({ref, className, ...props}: Readonly<FieldSetProps>): React.JSX.Element => (
  <fieldset
    ref={ref}
    data-slot='field-set'
    className={cn(styles.fieldSet, className)}
    {...props}
  />
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
const FieldLegend = ({ref, className, variant = "legend", ...props}: Readonly<FieldLegendProps>): React.JSX.Element => (
  <legend
    ref={ref}
    data-slot='field-legend'
    data-variant={variant}
    className={cn(styles.legend, variant === "label" ? styles.legendLabel : styles.legendDefault, className)}
    {...props}
  />
);

/**
 * Stacks multiple field rows under a shared container.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<div>` element
 * - Styling via CSS Modules with `--ac-*` custom properties
 * - Establishes the available-width container for responsive field rows
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
const FieldGroup = ({ref, className, ...props}: Readonly<FieldGroupProps>): React.JSX.Element => (
  <div
    ref={ref}
    data-slot='field-group'
    className={cn(styles.group, className)}
    {...props}
  />
);

/**
 * Creates a styled field row for labels, descriptions, and controls.
 * Callers own IDs and ARIA relationships; this layout adds no validation context.
 * Place responsive rows in a {@link FieldGroup} to query available width.
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
const Field = ({ref, className, orientation = "vertical", ...props}: Readonly<FieldProps>): React.JSX.Element => (
  <div
    ref={ref}
    role='group'
    data-slot='field'
    data-orientation={orientation}
    className={cn(styles.field, getFieldOrientationClass(orientation), className)}
    {...props}
  />
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
const FieldContent = ({ref, className, ...props}: Readonly<FieldContentProps>): React.JSX.Element => (
  <div
    ref={ref}
    data-slot='field-content'
    className={cn(styles.content, className)}
    {...props}
  />
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
const FieldLabel = ({ref, className, ...props}: Readonly<FieldLabelProps>): React.JSX.Element => {
  return (
    <Label
      ref={ref}
      data-slot='field-label'
      className={cn(styles.label, className)}
      {...props}
    />
  );
};

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
const FieldTitle = ({ref, className, ...props}: Readonly<FieldTitleProps>): React.JSX.Element => (
  <div
    ref={ref}
    data-slot='field-label'
    className={cn(styles.title, className)}
    {...props}
  />
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
const FieldDescription = ({ref, className, ...props}: Readonly<FieldDescriptionProps>): React.JSX.Element => (
  <p
    ref={ref}
    data-slot='field-description'
    className={cn(styles.description, className)}
    {...props}
  />
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
const FieldSeparator = ({ref, children, className, ...props}: Readonly<FieldSeparatorProps>): React.JSX.Element => {
  const hasContent = hasMeaningfulChildren(children);
  return (
    <div
      ref={ref}
      data-slot='field-separator'
      data-content={hasContent ? "true" : undefined}
      className={cn(styles.separator, className)}
      {...props}>
      <Separator className={styles.separatorLine} />
      {hasContent ? (
        <span
          data-slot='field-separator-content'
          className={styles.separatorContent}>
          {children}
        </span>
      ) : null}
    </div>
  );
};

/**
 * Presents validation feedback for a field.
 *
 * @remarks
 * - Pure CSS component (no Base UI primitive)
 * - Renders a `<div>` element when content exists
 * - Trims, filters and deduplicates messages in first-occurrence order
 * - Explicit children take precedence, including numeric zero
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example
 * ```tsx
 * <FieldError errors={[{message: "Required"}]} />
 * ```
 *
 * @see {@link FieldErrorProps} for available props
 */
const FieldError = ({
  ref,
  className,
  children,
  errors,
  dangerouslySetInnerHTML,
  ...props
}: Readonly<FieldErrorProps>): React.JSX.Element | null => {
  const messages = [...new Set(errors?.map((error) => error?.message?.trim()).filter((message): message is string => Boolean(message)))];
  const hasChildren = hasMeaningfulChildren(children);
  const nativeMarkup = !hasChildren && messages.length === 0 ? dangerouslySetInnerHTML : undefined;
  if (!hasChildren && messages.length === 0 && !nativeMarkup) return null;
  const content = hasChildren ? (
    children
  ) : messages.length === 1 ? (
    messages[0]
  ) : (
    <ul className={styles.errorList}>
      {messages.map((message) => (
        <li key={message}>{message}</li>
      ))}
    </ul>
  );

  return (
    <div
      ref={ref}
      role='alert'
      data-slot='field-error'
      className={cn(styles.error, className)}
      {...(nativeMarkup ? {dangerouslySetInnerHTML: nativeMarkup} : {children: content})}
      {...props}
    />
  );
};

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

/* eslint-disable no-redeclare -- canonical component namespace typing API */
namespace FieldSet {
  export type Props = Readonly<FieldSetProps>;
}
namespace FieldLegend {
  export type Props = Readonly<FieldLegendProps>;
}
namespace FieldGroup {
  export type Props = Readonly<FieldGroupProps>;
}
namespace Field {
  export type Props = Readonly<FieldProps>;
}
namespace FieldContent {
  export type Props = Readonly<FieldContentProps>;
}
namespace FieldLabel {
  export type Props = Readonly<FieldLabelProps>;
}
namespace FieldTitle {
  export type Props = Readonly<FieldTitleProps>;
}
namespace FieldDescription {
  export type Props = Readonly<FieldDescriptionProps>;
}
namespace FieldSeparator {
  export type Props = Readonly<FieldSeparatorProps>;
}
namespace FieldError {
  export type Props = Readonly<FieldErrorProps>;
}
/* eslint-enable no-redeclare */

export {Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSeparator, FieldSet, FieldTitle};
