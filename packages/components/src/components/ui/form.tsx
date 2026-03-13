"use client";

/* eslint-disable react/prop-types */

import * as React from "react";
import {
  Controller,
  FormProvider,
  useFormContext,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

import {cn} from "@/lib/utilities";

import styles from "./form.module.css";

/**
 * Provides the `react-hook-form` context to nested form primitives.
 *
 * @remarks
 * - Renders the `FormProvider` component from `react-hook-form`
 * - Built on `react-hook-form`
 *
 * @example
 * ```tsx
 * <Form {...form}>
 *   <form>...</form>
 * </Form>
 * ```
 *
 * @see {@link https://react-hook-form.com/docs/formprovider | React Hook Form FormProvider Docs}
 */
const Form = Object.assign(FormProvider, {displayName: "Form"});

type FormControlElementProps = React.HTMLAttributes<HTMLElement> & {
  ref?: React.Ref<HTMLElement>;
};

interface FormControlProps extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  /**
   * Single form control element or fallback content to receive field accessibility attributes.
   * @default undefined
   */
  children: React.ReactNode;
}

function assignRef<TValue>(ref: React.Ref<TValue> | undefined, value: TValue | null): void {
  if (typeof ref === "function") {
    ref(value);
    return;
  }

  if (ref) {
    ref.current = value;
  }
}

function composeRefs<TValue>(...refs: Array<React.Ref<TValue> | undefined>): React.RefCallback<TValue> {
  return (value: TValue | null): void => {
    for (const ref of refs) {
      assignRef(ref, value);
    }
  };
}

function mergeAriaDescribedBy(...describedByValues: Array<string | undefined>): string | undefined {
  const tokens = describedByValues
    .flatMap((describedByValue) => describedByValue?.split(/\s+/u) ?? [])
    .filter((token): token is string => token.length > 0);

  return tokens.length > 0 ? [...new Set(tokens)].join(" ") : undefined;
}

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue | null>(null);

/**
 * Binds a single field name to the shared form field context.
 *
 * @remarks
 * - Renders the `Controller` component from `react-hook-form`
 * - Built on `react-hook-form` controller primitives
 *
 * @example
 * ```tsx
 * <FormField
 *   control={form.control}
 *   name='email'
 *   render={({field}) => <input {...field} />}
 * />
 * ```
 *
 * @see {@link https://react-hook-form.com/docs/usecontroller/controller | React Hook Form Controller Docs}
 */
const FormField = <TFieldValues extends FieldValues = FieldValues, TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>>({
  ...props
}: ControllerProps<TFieldValues, TName>): React.JSX.Element => {
  return (
    <FormFieldContext.Provider value={{name: props.name}}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

type UseFormFieldReturn = {
  id: string;
  name: FieldPath<FieldValues>;
  formItemId: string;
  formDescriptionId: string;
  formMessageId: string;
  invalid: boolean;
  isDirty: boolean;
  isTouched: boolean;
  isValidating: boolean;
  error?: ReturnType<ReturnType<typeof useFormContext>["getFieldState"]>["error"];
};

/**
 * Returns the resolved form field metadata for nested form primitives.
 *
 * @remarks
 * Reads the nearest {@link FormField} and {@link FormItem} contexts, then combines them
 * with `react-hook-form` field state to expose stable IDs and validation metadata.
 *
 * @example
 * ```tsx
 * const field = useFormField();
 * ```
 *
 * @see {@link https://react-hook-form.com/docs/useformcontext | React Hook Form useFormContext Docs}
 */
const useFormField = (): UseFormFieldReturn => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const {getFieldState, formState} = useFormContext();

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>");
  }

  if (!itemContext) {
    throw new Error("useFormField should be used within <FormItem>");
  }

  const fieldState = getFieldState(fieldContext.name, formState);
  const {id} = itemContext;

  return {
    error: fieldState.error,
    formDescriptionId: `${id}-form-item-description`,
    formItemId: `${id}-form-item`,
    formMessageId: `${id}-form-item-message`,
    id,
    invalid: fieldState.invalid,
    isDirty: fieldState.isDirty,
    isTouched: fieldState.isTouched,
    isValidating: fieldState.isValidating,
    name: fieldContext.name as FieldPath<FieldValues>,
  };
};

type FormItemContextValue = {
  id: string;
};

const FormItemContext = React.createContext<FormItemContextValue | null>(null);

/**
 * Wraps a label, control, description, and message into a single form item.
 *
 * @remarks
 * - Renders a `<div>` element
 * - Built on the shared form item context
 *
 * @example
 * ```tsx
 * <FormItem>
 *   <FormLabel>Email</FormLabel>
 * </FormItem>
 * ```
 *
 * @see {@link https://react-hook-form.com/docs/useformcontext | React Hook Form Docs}
 */
const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({className, ...props}, ref) => {
  const id = React.useId();

  return (
    <FormItemContext.Provider value={{id}}>
      <div
        ref={ref}
        className={cn(styles.item, className)}
        {...props}
      />
    </FormItemContext.Provider>
  );
});
FormItem.displayName = "FormItem";

/**
 * Renders the accessible label for the current form item.
 *
 * @remarks
 * - Renders a `<label>` element
 * - Built on the shared form field metadata hook
 *
 * @example
 * ```tsx
 * <FormLabel>Email</FormLabel>
 * ```
 *
 * @see {@link https://developer.mozilla.org/docs/Web/HTML/Element/label | HTML label element}
 */
const FormLabel = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(({className, ...props}, ref) => {
  const {error, formItemId} = useFormField();

  return (
    <label
      ref={ref}
      className={cn(error && styles.labelError, className)}
      htmlFor={formItemId}
      {...props}
    />
  );
});
FormLabel.displayName = "FormLabel";

/**
 * Provides react-hook-form field metadata to a single control element.
 *
 * @remarks
 * This replaces the former Radix Slot-based implementation by cloning the
 * direct child element and merging the accessibility attributes required by the
 * surrounding form primitives. A fallback wrapper is rendered only when the
 * child is not a valid React element.
 */
const FormControl = React.forwardRef<HTMLElement, FormControlProps>(
  ({children, ...props}: Readonly<FormControlProps>, ref): React.JSX.Element => {
    const {error, formDescriptionId, formItemId, formMessageId} = useFormField();
    const describedBy = mergeAriaDescribedBy(
      typeof props["aria-describedby"] === "string" ? props["aria-describedby"] : undefined,
      formDescriptionId,
      error ? formMessageId : undefined,
    );

    if (React.isValidElement(children)) {
      const child = children as React.ReactElement<FormControlElementProps>;
      const childDescribedBy = typeof child.props["aria-describedby"] === "string" ? child.props["aria-describedby"] : undefined;

      // eslint-disable-next-line react-x/no-clone-element -- removes Radix Slot while preserving child element semantics
      return React.cloneElement(child, {
        ...props,
        ref: composeRefs(ref, child.props.ref),
        id: formItemId,
        "aria-describedby": mergeAriaDescribedBy(childDescribedBy, describedBy),
        "aria-invalid": Boolean(error),
      });
    }

    return (
      <div
        ref={ref as React.Ref<HTMLDivElement>}
        id={formItemId}
        aria-describedby={describedBy}
        aria-invalid={Boolean(error)}
        {...props}>
        {children}
      </div>
    );
  },
);
FormControl.displayName = "FormControl";

/**
 * Renders helper text that describes the current form control.
 *
 * @remarks
 * - Renders a `<p>` element
 * - Built on the shared form field metadata hook
 *
 * @example
 * ```tsx
 * <FormDescription>We'll never share your email.</FormDescription>
 * ```
 *
 * @see {@link https://developer.mozilla.org/docs/Web/HTML/Element/p | HTML paragraph element}
 */
const FormDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({className, ...props}, ref) => {
  const {formDescriptionId} = useFormField();

  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn(styles.description, className)}
      {...props}
    />
  );
});
FormDescription.displayName = "FormDescription";

/**
 * Renders the validation message or fallback message for the current form control.
 *
 * @remarks
 * - Renders a `<p>` element when content is available
 * - Built on the shared form field metadata hook
 *
 * @example
 * ```tsx
 * <FormMessage />
 * ```
 *
 * @see {@link https://developer.mozilla.org/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-invalid | ARIA invalid state}
 */
const FormMessage = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({className, children, ...props}, ref) => {
    const {error, formMessageId} = useFormField();
    const body = error ? String(error.message ?? "") : children;

    if (!body) {
      return null;
    }

    return (
      <p
        ref={ref}
        id={formMessageId}
        className={cn(styles.message, className)}
        {...props}>
        {body}
      </p>
    );
  },
);
FormMessage.displayName = "FormMessage";
FormField.displayName = "FormField";

export {Controller, useController, useFieldArray, useForm, useFormContext, useFormState, useWatch} from "react-hook-form";
export {Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, useFormField};
export type {FormControlProps};
export type {
  Control,
  ControllerFieldState,
  ControllerProps,
  ControllerRenderProps,
  DefaultValues,
  FieldError,
  FieldErrors,
  FieldPath,
  FieldValues,
  Path,
  RegisterOptions,
  Resolver,
  SubmitHandler,
  UseControllerReturn,
  UseFieldArrayReturn,
  UseFormReturn,
} from "react-hook-form";
