"use client";

import {mergeProps} from "@base-ui/react/merge-props";
import * as React from "react";
import {
  Controller,
  FormProvider,
  useController,
  useFieldArray,
  useForm,
  useFormContext,
  useFormState,
  useWatch,
  type Control,
  type ControllerFieldState,
  type ControllerProps,
  type ControllerRenderProps,
  type DefaultValues,
  type FieldError,
  type FieldErrors,
  type FieldPath,
  type FieldValues,
  type FormProviderProps,
  type Path,
  type RegisterOptions,
  type Resolver,
  type SubmitHandler,
  type UseControllerReturn,
  type UseFieldArrayReturn,
  type UseFormReturn,
} from "react-hook-form";

import {cn} from "@/lib/utilities";
import {useMergedRefs} from "@/hooks/useMergedRefs";

import styles from "./form.module.css";
import type {Input} from "./input";
import {Label} from "./label";

/** Installed RHF provider props, including resolver-transformed submit values. */
export type FormProps<TFieldValues extends FieldValues = FieldValues, TContext = unknown, TTransformedValues = TFieldValues> = Readonly<
  FormProviderProps<TFieldValues, TContext, TTransformedValues>
>;

/** Installed RHF Controller props; field names and values retain their exact types. */
export type FormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformedValues = TFieldValues,
> = Readonly<ControllerProps<TFieldValues, TName, TTransformedValues>>;

/** Native item props; an explicit ID is also the item metadata's base ID. */
export type FormItemProps = Readonly<React.ComponentPropsWithRef<"div">>;

/** Native label props from the reviewed shared Label contract. */
export type FormLabelProps = Label.Props;

/** Native helper-text props; explicit IDs are registered only while mounted. */
export type FormDescriptionProps = Readonly<React.ComponentPropsWithRef<"p">>;

/** Native inline-message props; no automatic alert/live region is introduced. */
export type FormMessageProps = Readonly<React.ComponentPropsWithRef<"p">>;

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

type FormControlElementProps = Omit<React.HTMLAttributes<HTMLElement>, "className"> & {
  className?: Input.Props["className"];
  ref?: React.Ref<HTMLElement>;
};

/**
 * Native observer/ARIA props for a composed control.
 *
 * @typeParam TElement - The real control target; defaults to a native input.
 * Use `FormControl<HTMLTextAreaElement>` or `FormControl<HTMLSelectElement>`
 * for other native controls. Refs may infer a composed `HTMLElement` target.
 */
export type FormControlProps<TElement extends HTMLElement = HTMLInputElement> = Readonly<
  Omit<React.HTMLAttributes<TElement>, "children"> & {
    /** React 19 ref to the actual composed control. */
    ref?: React.Ref<TElement>;
    /**
     * Single form control element or fallback content to receive field accessibility attributes.
     * @default undefined
     */
    children: React.ReactNode;
  }
>;

function controlRef(child: React.ReactElement<FormControlElementProps> | null): React.Ref<HTMLElement> | undefined {
  return child?.props.ref;
}

function unlessCancelled<TEvent extends React.SyntheticEvent>(
  observer: ((event: TEvent) => void) | undefined,
): ((event: TEvent) => void) | undefined {
  if (!observer) return undefined;
  return (event): void => {
    if (!event.defaultPrevented) observer(event);
  };
}

type ObserverEvents = {
  [TKey in Extract<keyof React.DOMAttributes<HTMLElement>, `on${string}`>]: React.DOMAttributes<HTMLElement>[TKey];
};

function cancellableObservers(props: React.HTMLAttributes<HTMLElement>): React.HTMLAttributes<HTMLElement> {
  // Base UI merges every DOM event child-first, but its cancellation flag is
  // distinct from preventDefault. Preserve the RHF family's native policy too.
  const observers = {
    onCopy: unlessCancelled(props.onCopy),
    onCopyCapture: unlessCancelled(props.onCopyCapture),
    onCut: unlessCancelled(props.onCut),
    onCutCapture: unlessCancelled(props.onCutCapture),
    onPaste: unlessCancelled(props.onPaste),
    onPasteCapture: unlessCancelled(props.onPasteCapture),
    onCompositionEnd: unlessCancelled(props.onCompositionEnd),
    onCompositionEndCapture: unlessCancelled(props.onCompositionEndCapture),
    onCompositionStart: unlessCancelled(props.onCompositionStart),
    onCompositionStartCapture: unlessCancelled(props.onCompositionStartCapture),
    onCompositionUpdate: unlessCancelled(props.onCompositionUpdate),
    onCompositionUpdateCapture: unlessCancelled(props.onCompositionUpdateCapture),
    onFocus: unlessCancelled(props.onFocus),
    onFocusCapture: unlessCancelled(props.onFocusCapture),
    onBlur: unlessCancelled(props.onBlur),
    onBlurCapture: unlessCancelled(props.onBlurCapture),
    onChange: unlessCancelled(props.onChange),
    onChangeCapture: unlessCancelled(props.onChangeCapture),
    onBeforeInput: unlessCancelled(props.onBeforeInput),
    onBeforeInputCapture: unlessCancelled(props.onBeforeInputCapture),
    onInput: unlessCancelled(props.onInput),
    onInputCapture: unlessCancelled(props.onInputCapture),
    onReset: unlessCancelled(props.onReset),
    onResetCapture: unlessCancelled(props.onResetCapture),
    onSubmit: unlessCancelled(props.onSubmit),
    onSubmitCapture: unlessCancelled(props.onSubmitCapture),
    onInvalid: unlessCancelled(props.onInvalid),
    onInvalidCapture: unlessCancelled(props.onInvalidCapture),
    onLoad: unlessCancelled(props.onLoad),
    onLoadCapture: unlessCancelled(props.onLoadCapture),
    onError: unlessCancelled(props.onError),
    onErrorCapture: unlessCancelled(props.onErrorCapture),
    onKeyDown: unlessCancelled(props.onKeyDown),
    onKeyDownCapture: unlessCancelled(props.onKeyDownCapture),
    // eslint-disable-next-line sonarjs/deprecation -- preserve the existing native keypress observer contract
    onKeyPress: unlessCancelled(props.onKeyPress),
    // eslint-disable-next-line sonarjs/deprecation -- preserve the existing native capture observer contract
    onKeyPressCapture: unlessCancelled(props.onKeyPressCapture),
    onKeyUp: unlessCancelled(props.onKeyUp),
    onKeyUpCapture: unlessCancelled(props.onKeyUpCapture),
    onAbort: unlessCancelled(props.onAbort),
    onAbortCapture: unlessCancelled(props.onAbortCapture),
    onCanPlay: unlessCancelled(props.onCanPlay),
    onCanPlayCapture: unlessCancelled(props.onCanPlayCapture),
    onCanPlayThrough: unlessCancelled(props.onCanPlayThrough),
    onCanPlayThroughCapture: unlessCancelled(props.onCanPlayThroughCapture),
    onDurationChange: unlessCancelled(props.onDurationChange),
    onDurationChangeCapture: unlessCancelled(props.onDurationChangeCapture),
    onEmptied: unlessCancelled(props.onEmptied),
    onEmptiedCapture: unlessCancelled(props.onEmptiedCapture),
    onEncrypted: unlessCancelled(props.onEncrypted),
    onEncryptedCapture: unlessCancelled(props.onEncryptedCapture),
    onEnded: unlessCancelled(props.onEnded),
    onEndedCapture: unlessCancelled(props.onEndedCapture),
    onLoadedData: unlessCancelled(props.onLoadedData),
    onLoadedDataCapture: unlessCancelled(props.onLoadedDataCapture),
    onLoadedMetadata: unlessCancelled(props.onLoadedMetadata),
    onLoadedMetadataCapture: unlessCancelled(props.onLoadedMetadataCapture),
    onLoadStart: unlessCancelled(props.onLoadStart),
    onLoadStartCapture: unlessCancelled(props.onLoadStartCapture),
    onPause: unlessCancelled(props.onPause),
    onPauseCapture: unlessCancelled(props.onPauseCapture),
    onPlay: unlessCancelled(props.onPlay),
    onPlayCapture: unlessCancelled(props.onPlayCapture),
    onPlaying: unlessCancelled(props.onPlaying),
    onPlayingCapture: unlessCancelled(props.onPlayingCapture),
    onProgress: unlessCancelled(props.onProgress),
    onProgressCapture: unlessCancelled(props.onProgressCapture),
    onRateChange: unlessCancelled(props.onRateChange),
    onRateChangeCapture: unlessCancelled(props.onRateChangeCapture),
    onSeeked: unlessCancelled(props.onSeeked),
    onSeekedCapture: unlessCancelled(props.onSeekedCapture),
    onSeeking: unlessCancelled(props.onSeeking),
    onSeekingCapture: unlessCancelled(props.onSeekingCapture),
    onStalled: unlessCancelled(props.onStalled),
    onStalledCapture: unlessCancelled(props.onStalledCapture),
    onSuspend: unlessCancelled(props.onSuspend),
    onSuspendCapture: unlessCancelled(props.onSuspendCapture),
    onTimeUpdate: unlessCancelled(props.onTimeUpdate),
    onTimeUpdateCapture: unlessCancelled(props.onTimeUpdateCapture),
    onVolumeChange: unlessCancelled(props.onVolumeChange),
    onVolumeChangeCapture: unlessCancelled(props.onVolumeChangeCapture),
    onWaiting: unlessCancelled(props.onWaiting),
    onWaitingCapture: unlessCancelled(props.onWaitingCapture),
    onAuxClick: unlessCancelled(props.onAuxClick),
    onAuxClickCapture: unlessCancelled(props.onAuxClickCapture),
    onClick: unlessCancelled(props.onClick),
    onClickCapture: unlessCancelled(props.onClickCapture),
    onContextMenu: unlessCancelled(props.onContextMenu),
    onContextMenuCapture: unlessCancelled(props.onContextMenuCapture),
    onDoubleClick: unlessCancelled(props.onDoubleClick),
    onDoubleClickCapture: unlessCancelled(props.onDoubleClickCapture),
    onDrag: unlessCancelled(props.onDrag),
    onDragCapture: unlessCancelled(props.onDragCapture),
    onDragEnd: unlessCancelled(props.onDragEnd),
    onDragEndCapture: unlessCancelled(props.onDragEndCapture),
    onDragEnter: unlessCancelled(props.onDragEnter),
    onDragEnterCapture: unlessCancelled(props.onDragEnterCapture),
    onDragExit: unlessCancelled(props.onDragExit),
    onDragExitCapture: unlessCancelled(props.onDragExitCapture),
    onDragLeave: unlessCancelled(props.onDragLeave),
    onDragLeaveCapture: unlessCancelled(props.onDragLeaveCapture),
    onDragOver: unlessCancelled(props.onDragOver),
    onDragOverCapture: unlessCancelled(props.onDragOverCapture),
    onDragStart: unlessCancelled(props.onDragStart),
    onDragStartCapture: unlessCancelled(props.onDragStartCapture),
    onDrop: unlessCancelled(props.onDrop),
    onDropCapture: unlessCancelled(props.onDropCapture),
    onMouseDown: unlessCancelled(props.onMouseDown),
    onMouseDownCapture: unlessCancelled(props.onMouseDownCapture),
    onMouseEnter: unlessCancelled(props.onMouseEnter),
    onMouseLeave: unlessCancelled(props.onMouseLeave),
    onMouseMove: unlessCancelled(props.onMouseMove),
    onMouseMoveCapture: unlessCancelled(props.onMouseMoveCapture),
    onMouseOut: unlessCancelled(props.onMouseOut),
    onMouseOutCapture: unlessCancelled(props.onMouseOutCapture),
    onMouseOver: unlessCancelled(props.onMouseOver),
    onMouseOverCapture: unlessCancelled(props.onMouseOverCapture),
    onMouseUp: unlessCancelled(props.onMouseUp),
    onMouseUpCapture: unlessCancelled(props.onMouseUpCapture),
    onSelect: unlessCancelled(props.onSelect),
    onSelectCapture: unlessCancelled(props.onSelectCapture),
    onTouchCancel: unlessCancelled(props.onTouchCancel),
    onTouchCancelCapture: unlessCancelled(props.onTouchCancelCapture),
    onTouchEnd: unlessCancelled(props.onTouchEnd),
    onTouchEndCapture: unlessCancelled(props.onTouchEndCapture),
    onTouchMove: unlessCancelled(props.onTouchMove),
    onTouchMoveCapture: unlessCancelled(props.onTouchMoveCapture),
    onTouchStart: unlessCancelled(props.onTouchStart),
    onTouchStartCapture: unlessCancelled(props.onTouchStartCapture),
    onPointerDown: unlessCancelled(props.onPointerDown),
    onPointerDownCapture: unlessCancelled(props.onPointerDownCapture),
    onPointerMove: unlessCancelled(props.onPointerMove),
    onPointerMoveCapture: unlessCancelled(props.onPointerMoveCapture),
    onPointerUp: unlessCancelled(props.onPointerUp),
    onPointerUpCapture: unlessCancelled(props.onPointerUpCapture),
    onPointerCancel: unlessCancelled(props.onPointerCancel),
    onPointerCancelCapture: unlessCancelled(props.onPointerCancelCapture),
    onPointerEnter: unlessCancelled(props.onPointerEnter),
    onPointerLeave: unlessCancelled(props.onPointerLeave),
    onPointerOver: unlessCancelled(props.onPointerOver),
    onPointerOverCapture: unlessCancelled(props.onPointerOverCapture),
    onPointerOut: unlessCancelled(props.onPointerOut),
    onPointerOutCapture: unlessCancelled(props.onPointerOutCapture),
    onGotPointerCapture: unlessCancelled(props.onGotPointerCapture),
    onGotPointerCaptureCapture: unlessCancelled(props.onGotPointerCaptureCapture),
    onLostPointerCapture: unlessCancelled(props.onLostPointerCapture),
    onLostPointerCaptureCapture: unlessCancelled(props.onLostPointerCaptureCapture),
    onScroll: unlessCancelled(props.onScroll),
    onScrollCapture: unlessCancelled(props.onScrollCapture),
    onScrollEnd: unlessCancelled(props.onScrollEnd),
    onScrollEndCapture: unlessCancelled(props.onScrollEndCapture),
    onWheel: unlessCancelled(props.onWheel),
    onWheelCapture: unlessCancelled(props.onWheelCapture),
    onAnimationStart: unlessCancelled(props.onAnimationStart),
    onAnimationStartCapture: unlessCancelled(props.onAnimationStartCapture),
    onAnimationEnd: unlessCancelled(props.onAnimationEnd),
    onAnimationEndCapture: unlessCancelled(props.onAnimationEndCapture),
    onAnimationIteration: unlessCancelled(props.onAnimationIteration),
    onAnimationIterationCapture: unlessCancelled(props.onAnimationIterationCapture),
    onTransitionRun: unlessCancelled(props.onTransitionRun),
    onTransitionRunCapture: unlessCancelled(props.onTransitionRunCapture),
    onTransitionStart: unlessCancelled(props.onTransitionStart),
    onTransitionStartCapture: unlessCancelled(props.onTransitionStartCapture),
    onTransitionEnd: unlessCancelled(props.onTransitionEnd),
    onTransitionEndCapture: unlessCancelled(props.onTransitionEndCapture),
    onTransitionCancel: unlessCancelled(props.onTransitionCancel),
    onTransitionCancelCapture: unlessCancelled(props.onTransitionCancelCapture),
    onToggle: unlessCancelled(props.onToggle),
    onBeforeToggle: unlessCancelled(props.onBeforeToggle),
  } satisfies ObserverEvents;
  return {...props, ...Object.fromEntries(Object.entries(observers).filter(([, observer]) => observer !== undefined))};
}

function hasMeaningfulChildren(children: React.ReactNode): boolean {
  let content = children;
  while (React.isValidElement<{children?: React.ReactNode}>(content) && content.type === React.Fragment) {
    content = content.props.children;
  }
  if (Array.isArray(content)) return content.some((child: React.ReactNode) => hasMeaningfulChildren(child));
  return typeof content === "string"
    ? content.trim().length > 0
    : content !== null && content !== undefined && typeof content !== "boolean";
}

type MetadataKind = "control" | "label" | "description" | "message";
type MountedMetadata = Readonly<{kind: MetadataKind; id: string}>;
type FormItemContextValue = Readonly<{
  id: string;
  metadata: ReadonlyMap<string, MountedMetadata>;
  register: (kind: MetadataKind, key: string, id: string) => () => void;
}>;

const FormItemContext = React.createContext<FormItemContextValue | null>(null);

function metadataIds(item: FormItemContextValue, kind: MetadataKind): string[] {
  return [...new Set([...item.metadata.values()].filter((entry) => entry.kind === kind).map((entry) => entry.id))];
}

function useMountedMetadata(
  kind: MetadataKind,
  id: string | undefined,
  renderedContent?: React.RefObject<HTMLElement | null>,
  nativeMarkup?: React.HTMLAttributes<HTMLElement>["dangerouslySetInnerHTML"],
): void {
  const item = React.useContext(FormItemContext);
  const registrationId = React.useId();
  if (!item) throw new Error("useFormField should be used within <FormItem>");
  const {register} = item;
  const nativeHtml = nativeMarkup?.__html;
  React.useLayoutEffect(() => {
    if (id && (!renderedContent || renderedContent.current?.textContent?.trim())) return register(kind, registrationId, id);
    return undefined;
  }, [id, registrationId, kind, register, renderedContent, nativeHtml]);
}

function mergeAriaDescribedBy(...describedByValues: Array<string | undefined>): string | undefined {
  const tokens = describedByValues
    .flatMap((describedByValue) => describedByValue?.split(/\s+/u) ?? [])
    .filter((token): token is string => token.length > 0);

  return tokens.length > 0 ? [...new Set(tokens)].join(" ") : undefined;
}

type FormFieldContextValue = Readonly<{name: string}>;

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
const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformedValues = TFieldValues,
>(
  props: FormFieldProps<TFieldValues, TName, TTransformedValues>,
): React.JSX.Element => {
  const {name} = props;
  const context = React.useMemo(() => ({name}), [name]);
  return (
    <FormFieldContext.Provider value={context}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

/** RHF field state and the current item's resolved/mounted accessibility IDs. */
export type UseFormFieldReturn = Readonly<
  ControllerFieldState & {
    id: string;
    name: FieldPath<FieldValues>;
    formItemId: string;
    formDescriptionId: string;
    formMessageId: string;
    descriptionIds: readonly string[];
    messageIds: readonly string[];
  }
>;

/**
 * Returns the resolved form field metadata for nested form primitives.
 *
 * @remarks
 * Reads the nearest {@link FormField} and {@link FormItem} contexts, then combines them
 * with an exact RHF field-state subscription. Description/message IDs reflect mounted
 * meaningful content; their singular forms resolve to the first mounted entry.
 * Guards diagnose missing Form, FormField, and FormItem before reading their values.
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
  const methods = useFormContext<FieldValues, unknown>();

  if (!methods) {
    throw new Error("useFormField should be used within <Form>");
  }

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>");
  }

  if (!itemContext) {
    throw new Error("useFormField should be used within <FormItem>");
  }

  const formState = useFormState({control: methods.control, name: fieldContext.name, exact: true});
  const fieldState = methods.getFieldState(fieldContext.name, formState);
  const {id} = itemContext;
  const descriptionIds = metadataIds(itemContext, "description");
  const messageIds = metadataIds(itemContext, "message");

  return {
    ...fieldState,
    descriptionIds,
    messageIds,
    formDescriptionId: descriptionIds[0] ?? `${id}-form-item-description`,
    formItemId: metadataIds(itemContext, "control")[0] ?? metadataIds(itemContext, "label")[0] ?? `${id}-form-item`,
    formMessageId: messageIds[0] ?? `${id}-form-item-message`,
    id,
    name: fieldContext.name,
  };
};

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
const FormItem = ({ref, className, id: providedId, ...props}: Readonly<FormItemProps>): React.JSX.Element => {
  const generatedId = React.useId();
  const id = providedId?.trim() || generatedId;
  const [metadata, setMetadata] = React.useState<ReadonlyMap<string, MountedMetadata>>(() => new Map());
  const register = React.useCallback((kind: MetadataKind, key: string, entryId: string): (() => void) => {
    const entry = {kind, id: entryId};
    setMetadata((previous) => new Map(previous).set(key, entry));
    return (): void => {
      setMetadata((previous) => {
        if (previous.get(key) !== entry) return previous;
        const next = new Map(previous);
        next.delete(key);
        return next;
      });
    };
  }, []);
  const context = React.useMemo(() => ({id, metadata, register}), [id, metadata, register]);

  return (
    <FormItemContext.Provider value={context}>
      <div
        id={id}
        data-slot='form-item'
        ref={ref}
        className={cn(styles.item, className)}
        {...props}
      />
    </FormItemContext.Provider>
  );
};
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
const FormLabel = ({ref, className, htmlFor, ...props}: Readonly<FormLabelProps>): React.JSX.Element => {
  const {error, formItemId} = useFormField();
  useMountedMetadata("label", htmlFor?.trim() || undefined);

  return (
    <Label
      {...props}
      ref={ref}
      data-slot='form-label'
      className={cn(error && styles.labelError, className)}
      htmlFor={formItemId}
    />
  );
};
FormLabel.displayName = "FormLabel";

type FormControlTarget = React.ComponentType<React.HTMLAttributes<HTMLElement> & {ref?: React.Ref<HTMLElement>}>;

/**
 * Provides react-hook-form field metadata to a single control element.
 *
 * @remarks
 * This replaces the former Radix Slot-based implementation by cloning the
 * direct child. Native DOM observers run child-first. A child's preventDefault
 * skips wrapper observers; a wrapper cancellation cannot undo an RHF update
 * already performed by the child. To cancel an RHF update, cancel before calling
 * field.onChange in the child's own handler. Base UI cancellation is also honored.
 *
 * Classes, native props, child content, and callback/object refs (including React
 * cleanup returns) are preserved using React 19 ref props and the shared ref hook.
 * Input render/class callbacks stay primitive-owned.
 * Wrapper ID overrides child ID; either retargets FormLabel. A label-only htmlFor
 * becomes the control ID. Generated description/message IDs are linked only while
 * meaningful content is mounted. Caller-supplied ARIA tokens remain caller-owned.
 * Blank explicit IDs fall back to generated IDs. Non-element/fragment content
 * retains the legacy div fallback; use `FormControl<HTMLDivElement>` for that target.
 */
const FormControl = <TElement extends HTMLElement = HTMLInputElement>({
  ref,
  children,
  className,
  id,
  ...props
}: Readonly<FormControlProps<TElement>>): React.JSX.Element => {
  const {invalid, descriptionIds, messageIds, formItemId} = useFormField();
  const child = React.isValidElement<FormControlElementProps>(children) && children.type !== React.Fragment ? children : null;
  const explicitId = id?.trim() || child?.props.id?.trim() || undefined;
  useMountedMetadata("control", explicitId);
  const mergedRef = useMergedRefs<HTMLElement>(ref, controlRef(child));
  const describedBy = mergeAriaDescribedBy(child?.props["aria-describedby"], props["aria-describedby"], ...descriptionIds, ...messageIds);
  const ariaInvalid = invalid ? true : (props["aria-invalid"] ?? child?.props["aria-invalid"] ?? false);
  const nativeProps: React.HTMLAttributes<HTMLElement> = props;

  if (child) {
    const {className: childClassName, ...childProps} = child.props;
    const mergedProps = mergeProps<FormControlTarget>(cancellableObservers(props), childProps);
    // eslint-disable-next-line react-x/no-clone-element -- legacy direct-child control API; explicit typed prop/event/ref composition
    return React.cloneElement(child, {
      ...mergedProps,
      className: typeof childClassName === "function" ? (state) => cn(childClassName(state), className) : cn(childClassName, className),
      ref: mergedRef,
      id: explicitId ?? formItemId,
      "aria-describedby": describedBy,
      "aria-labelledby": mergeAriaDescribedBy(child.props["aria-labelledby"], props["aria-labelledby"]),
      "aria-invalid": ariaInvalid,
    });
  }

  return (
    <div
      {...nativeProps}
      ref={mergedRef}
      className={className}
      id={explicitId ?? formItemId}
      aria-describedby={describedBy}
      aria-invalid={ariaInvalid}>
      {children}
    </div>
  );
};
FormControl.displayName = "FormControl";

/**
 * Renders helper text that describes the current form control.
 *
 * @remarks
 * - Renders a `<p>` element
 * - Built on the shared form field metadata hook
 * - Trusted native HTML content is linked only when its mounted paragraph has
 *   meaningful text; native DOM rendering, not string parsing, resolves entities
 * - Native props and caller-owned HTML trust/sanitization responsibilities remain
 *   unchanged, and empty native paragraphs remain valid mounted elements
 *
 * @example
 * ```tsx
 * <FormDescription>We'll never share your email.</FormDescription>
 * ```
 *
 * @see {@link https://developer.mozilla.org/docs/Web/HTML/Element/p | HTML paragraph element}
 */
const FormDescription = ({ref, className, id, children, ...props}: Readonly<FormDescriptionProps>): React.JSX.Element => {
  const field = useFormField();
  const uniqueId = React.useId();
  const paragraphRef = React.useRef<HTMLParagraphElement>(null);
  const mergedRef = useMergedRefs(ref, paragraphRef);
  const {dangerouslySetInnerHTML} = props;
  const descriptionId = id?.trim() || `${field.id}-${uniqueId}-form-item-description`;
  useMountedMetadata(
    "description",
    hasMeaningfulChildren(children) || dangerouslySetInnerHTML ? descriptionId : undefined,
    dangerouslySetInnerHTML ? paragraphRef : undefined,
    dangerouslySetInnerHTML,
  );

  return (
    <p
      {...props}
      ref={mergedRef}
      data-slot='form-description'
      id={descriptionId}
      className={cn(styles.description, className)}>
      {children}
    </p>
  );
};
FormDescription.displayName = "FormDescription";

/**
 * Renders the validation message or fallback message for the current form control.
 *
 * @remarks
 * - Renders a `<p>` element when content is available
 * - Trims error text and falls back to meaningful children, including numeric zero
 * - Not an alert/live region by default: callers own one form-level submission
 *   announcement/summary rather than announcing every inline error twice
 *
 * @example
 * ```tsx
 * <FormMessage />
 * ```
 *
 * @see {@link https://developer.mozilla.org/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-invalid | ARIA invalid state}
 */
const FormMessage = ({ref, className, children, id, ...props}: Readonly<FormMessageProps>): React.JSX.Element | null => {
  const field = useFormField();
  const uniqueId = React.useId();
  const messageId = id?.trim() || `${field.id}-${uniqueId}-form-item-message`;
  const body = field.error?.message?.trim() || children;
  const hasContent = hasMeaningfulChildren(body);
  useMountedMetadata("message", hasContent ? messageId : undefined);

  if (!hasContent) {
    return null;
  }

  return (
    <p
      {...props}
      ref={ref}
      data-slot='form-message'
      id={messageId}
      className={cn(styles.message, className)}>
      {body}
    </p>
  );
};
FormMessage.displayName = "FormMessage";
FormField.displayName = "FormField";

export {
  Controller,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useController,
  useFieldArray,
  useForm,
  useFormContext,
  useFormField,
  useFormState,
  useWatch,
};
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
};
