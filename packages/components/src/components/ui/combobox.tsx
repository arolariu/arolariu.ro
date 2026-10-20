"use client";

import {Combobox as ComboboxPrimitive} from "@base-ui/react/combobox";
import type {ComponentRenderFn, HTMLProps} from "@base-ui/react/types";
import {Check, ChevronDown, X} from "lucide-react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import {Button} from "./button";
import {InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput} from "./input-group";
import styles from "./combobox.module.css";

/** Installed Base UI Root props, including distinct selection and collection item generics. */
export type ComboboxProps<Value, Multiple extends boolean | undefined = false, Item = Value> = Readonly<
  ComboboxPrimitive.Root.Props<Value, Multiple, Item>
>;
/** Props for the DOM-less selected-value formatter. */
export type ComboboxValueProps = Readonly<ComboboxPrimitive.Value.Props>;
/** Props for the popup trigger, including primitive-owned render and class callbacks. */
export type ComboboxTriggerProps = Readonly<React.ComponentPropsWithRef<typeof ComboboxPrimitive.Trigger>>;
/** Props for the optional input clear control. */
export type ComboboxClearProps = Readonly<React.ComponentPropsWithRef<typeof ComboboxPrimitive.Clear>>;
/** Props for an editable input with optional trigger and clear addons. */
export type ComboboxInputProps = Readonly<
  React.ComponentPropsWithRef<typeof ComboboxPrimitive.Input> & {
    /** Show the suggestions trigger. @default true */
    showTrigger?: boolean;
    /** Show the primitive clear control when a selection exists. @default false */
    showClear?: boolean;
    /** Classes for the input group shell; `className` belongs to the primitive input. */
    groupClassName?: string;
    /** Trigger customization. Custom icon-only render callbacks must supply an accessible name. */
    triggerProps?: ComboboxTriggerProps;
    /** Clear customization. Custom icon-only render callbacks must supply an accessible name. */
    clearProps?: ComboboxClearProps;
  }
>;

/** Positioning options passed to the positioner rather than leaked onto the popup DOM. */
export type ComboboxPositioningProps = Readonly<Omit<ComboboxPrimitive.Positioner.Props, keyof ComboboxPrimitive.Popup.Props>>;
type DataAttributes = {readonly [key: `data-${string}`]: string | number | boolean | undefined};
/** Independent positioner composition/ref props. Positioning options live on Content. */
export type ComboboxPositionerProps = Readonly<
  Omit<React.ComponentPropsWithRef<typeof ComboboxPrimitive.Positioner>, keyof ComboboxPositioningProps | "children"> & DataAttributes
>;
/** Popup props plus anchor/measurement options and separate portal/positioner customization. */
export type ComboboxContentProps = Readonly<
  React.ComponentPropsWithRef<typeof ComboboxPrimitive.Popup>
    & Omit<ComboboxPositioningProps, "align" | "sideOffset"> & {
      /** How to align the popup relative to `side`; this wrapper starts it at the input's start edge. @default "start" */
      align?: ComboboxPositioningProps["align"];
      /** Distance between the anchor and the popup in px, or an offset function. @default 6 */
      sideOffset?: ComboboxPositioningProps["sideOffset"];
      /** Props for the measured positioner, including its `ref` and `className` callback. */
      positionerProps?: ComboboxPositionerProps;
      /** Props for the portal, such as `container` and `keepMounted`. */
      portalProps?: Readonly<Omit<React.ComponentPropsWithRef<typeof ComboboxPrimitive.Portal>, "children">>;
    }
>;
/** Props for the actual listbox, including Base UI's filtered item renderer. */
export type ComboboxListProps = Readonly<React.ComponentPropsWithRef<typeof ComboboxPrimitive.List>>;
/** Props for an option. Values are passed unchanged to Base UI. */
export type ComboboxItemProps = Readonly<React.ComponentPropsWithRef<typeof ComboboxPrimitive.Item>>;
/** Props for a labeled option group, optionally backed by filtered collection items. */
export type ComboboxGroupProps = Readonly<React.ComponentPropsWithRef<typeof ComboboxPrimitive.Group>>;
/** Props for the group label (not the root field label). */
export type ComboboxLabelProps = Readonly<React.ComponentPropsWithRef<typeof ComboboxPrimitive.GroupLabel>>;
/** Props for the DOM-less filtered collection renderer. */
export type ComboboxCollectionProps = Readonly<ComboboxPrimitive.Collection.Props>;
/** Props for the explicitly composed no-results status, whose root stays mounted while only its children toggle. */
export type ComboboxEmptyProps = Readonly<React.ComponentPropsWithRef<typeof ComboboxPrimitive.Empty>>;
/** Props for a separator between groups. */
export type ComboboxSeparatorProps = Readonly<React.ComponentPropsWithRef<typeof ComboboxPrimitive.Separator>>;
/** Props for the multiple-selection chip container and anchor. */
export type ComboboxChipsProps = Readonly<React.ComponentPropsWithRef<typeof ComboboxPrimitive.Chips>>;
/** Props for an individual selected chip with an optional primitive removal control. */
export type ComboboxChipProps = Readonly<
  React.ComponentPropsWithRef<typeof ComboboxPrimitive.Chip> & {
    /** Show a remove button for this chip. @default true */
    showRemove?: boolean;
    /** Customize removal. Custom icon-only render callbacks must supply an accessible name. */
    removeProps?: Readonly<React.ComponentPropsWithRef<typeof ComboboxPrimitive.ChipRemove>>;
  }
>;
/** Props for the editable input inside a chip container. */
export type ComboboxChipsInputProps = Readonly<React.ComponentPropsWithRef<typeof ComboboxPrimitive.Input>>;

type ComboboxRender<State> = React.ReactElement | ComponentRenderFn<HTMLProps, State> | undefined;

function getRenderElement<State>(render: ComboboxRender<State>): React.ReactElement<{children?: React.ReactNode}> | undefined {
  if (typeof render === "function") return undefined;
  // eslint-disable-next-line react-x/no-children-to-array -- Public React resolution supports opaque Flight-lazy render elements.
  const [element] = React.Children.toArray(render);
  return React.isValidElement<{children?: React.ReactNode}>(element) ? element : undefined;
}

function getChildren<State>(children: React.ReactNode, render: ComboboxRender<State>): React.ReactNode {
  return children === undefined ? getRenderElement(render)?.props.children : children;
}

function hasCustomContent(children: React.ReactNode): boolean {
  return (
    children !== null
    && children !== undefined
    && typeof children !== "boolean"
    && (typeof children !== "string" || children.trim().length > 0)
  );
}

function withChildren<State>(render: ComboboxRender<State>, children: React.ReactNode): ComboboxRender<State> {
  const element = getRenderElement(render);
  // eslint-disable-next-line react-x/no-clone-element -- Only compound children are normalized; Base UI owns state, handlers, ARIA and refs.
  return element ? React.cloneElement(element, {children}) : render;
}

/**
 * Editable combobox root: coordinates single or multiple selection, the input text, filtering and the popup.
 *
 * @remarks
 * - Client Component; a direct alias of Base UI `Combobox.Root` that keeps every installed generic (`Value`, `Multiple`,
 *   `Item`) and cancellable change details, and renders no DOM element.
 * - Pass `items` so Base UI filters them for `ComboboxList`/`ComboboxCollection` function children, drives
 *   `ComboboxEmpty` and labels the selection before the popup mounts. Object items need `itemToStringLabel` (and
 *   `itemToStringValue` for forms) unless they carry `label` and `value` fields, and are compared with `Object.is` unless
 *   you pass `isItemEqualToValue`.
 * - `value`, `inputValue` and `open` are independent controlled/uncontrolled pairs; `multiple` switches to array values
 *   shown as chips, and `name` submits the selection with a native form.
 *
 * @example
 * ```tsx
 * <Combobox items={fruits} value={fruit} onValueChange={setFruit}>
 *   <ComboboxInput aria-label='Fruit' placeholder='Choose a fruit' />
 *   <ComboboxContent>
 *     <ComboboxList>
 *       {(item: Fruit) => (
 *         <ComboboxItem key={item.value} value={item}>
 *           {item.label}
 *         </ComboboxItem>
 *       )}
 *     </ComboboxList>
 *     <ComboboxEmpty>No fruit found.</ComboboxEmpty>
 *   </ComboboxContent>
 * </Combobox>
 * ```
 */
const Combobox = ComboboxPrimitive.Root;

/**
 * Renders the selected value's label, or a function child's output, without adding a DOM element.
 *
 * @remarks
 * - Client Component; a direct alias of Base UI `Combobox.Value`. With root `items` the label is available before the popup
 *   mounts; `placeholder` shows while nothing is selected, and a function child receives the selection (an array with
 *   `multiple`, to be treated as read-only).
 *
 * @example
 * ```tsx
 * <ComboboxChips ref={anchor}>
 *   <ComboboxValue>
 *     {(selected: readonly Fruit[]) => selected.map((item) => <ComboboxChip key={item.value}>{item.label}</ComboboxChip>)}
 *   </ComboboxValue>
 *   <ComboboxChipsInput aria-label='Fruits' />
 * </ComboboxChips>
 * ```
 */
const ComboboxValue = ComboboxPrimitive.Value;

/**
 * Button that opens the suggestions popup, keeping caller content beside a decorative chevron.
 *
 * @remarks
 * - Client Component wrapping Base UI `Combobox.Trigger`, a native `<button>`; `render`/`className` callbacks receive its
 *   state.
 * - Without visible content it is named "Show suggestions"; pass `aria-label` to localize it. Custom icon-only `render`
 *   callbacks must supply their own `aria-label` or `aria-labelledby`.
 * - ComboboxInput already renders one (`showTrigger`); use this part on its own beside an input rendered with
 *   `showTrigger={false}` or beside ComboboxChips.
 *
 * @example
 * ```tsx
 * <Combobox items={fruits}>
 *   <ComboboxInput aria-label='Fruit' showTrigger={false} />
 *   <ComboboxTrigger aria-label='Afficher les suggestions' />
 *   <ComboboxContent>
 *     <ComboboxList>{(item: Fruit) => <ComboboxItem key={item.value} value={item}>{item.label}</ComboboxItem>}</ComboboxList>
 *   </ComboboxContent>
 * </Combobox>
 * ```
 */
const ComboboxTrigger = ({ref, className, children, render, ...props}: Readonly<ComboboxTriggerProps>): React.JSX.Element => {
  const content = (
    <>
      {getChildren(children, render)}
      <ChevronDown
        aria-hidden='true'
        data-slot='combobox-trigger-icon'
        className={styles.icon}
      />
    </>
  );
  return (
    <ComboboxPrimitive.Trigger
      data-slot='combobox-trigger'
      aria-label={typeof render !== "function" && !hasCustomContent(getChildren(children, render)) ? "Show suggestions" : undefined}
      ref={ref}
      className={(state) => cn(styles.trigger, typeof className === "function" ? className(state) : className)}
      render={withChildren(render, content)}
      {...props}>
      {content}
    </ComboboxPrimitive.Trigger>
  );
};

/** Internal clear control for ComboboxInput; named "Clear selection" unless the caller names it or supplies visible content. */
const ComboboxClear = ({ref, className, children, render, ...props}: Readonly<ComboboxClearProps>): React.JSX.Element => {
  const resolvedChildren = getChildren(children, render);
  const defaultLabel = typeof render !== "function" && !hasCustomContent(resolvedChildren) ? "Clear selection" : undefined;
  const content =
    resolvedChildren === undefined ? (
      <X
        aria-hidden='true'
        className={styles.icon}
      />
    ) : (
      resolvedChildren
    );
  return (
    <ComboboxPrimitive.Clear
      data-slot='combobox-clear'
      aria-label={defaultLabel}
      ref={ref}
      className={(state) => cn(styles.clear, typeof className === "function" ? className(state) : className)}
      render={withChildren(
        render
          ?? (!hasCustomContent(resolvedChildren) ? (
            <InputGroupButton
              variant='ghost'
              size='icon-xs'
              aria-label='Clear selection'
              {...("aria-label" in props ? {"aria-label": props["aria-label"]} : {})}
            />
          ) : (
            <InputGroupButton
              variant='ghost'
              size='xs'
            />
          )),
        content,
      )}
      {...props}>
      {content}
    </ComboboxPrimitive.Clear>
  );
};

/**
 * Editable combobox input in the shared InputGroup chrome, with optional trigger and clear buttons.
 *
 * @remarks
 * - Client Component wrapping Base UI `Combobox.Input` rendered as InputGroupInput; `className`/`render` callbacks receive
 *   `Combobox.Input` state, while `groupClassName` styles the InputGroup shell.
 * - Name the input with a `<label>`, `aria-label` or `aria-labelledby`.
 * - `showTrigger` adds a "Show suggestions" button. `showClear` adds a "Clear selection" button that Base UI mounts only
 *   while a value is selected (single) or chips exist (`multiple`); typed text alone does not mount it. Localize both
 *   names through `triggerProps`/`clearProps` (`aria-label` or visible children); both follow `disabled`.
 * - `children` are extra InputGroup adornments rendered after the input and its buttons.
 *
 * @example
 * ```tsx
 * <ComboboxInput
 *   aria-label='Country'
 *   placeholder='Search countries'
 *   showClear
 *   clearProps={{"aria-label": "Clear country"}}
 * />
 * ```
 */
const ComboboxInput = ({
  ref,
  className,
  children,
  groupClassName,
  showTrigger = true,
  showClear = false,
  triggerProps,
  clearProps,
  disabled,
  render,
  ...props
}: Readonly<ComboboxInputProps>): React.JSX.Element => (
  <InputGroup className={cn(styles.inputGroup, groupClassName)}>
    <ComboboxPrimitive.Input
      data-slot='combobox-input'
      ref={ref}
      disabled={disabled}
      render={render ?? <InputGroupInput />}
      className={(state) => cn(styles.input, typeof className === "function" ? className(state) : className)}
      {...props}
    />
    {showTrigger || showClear ? (
      <InputGroupAddon align='inline-end'>
        {showTrigger ? (
          <ComboboxTrigger
            render={
              !hasCustomContent(getChildren(triggerProps?.children, triggerProps?.render)) ? (
                <InputGroupButton
                  variant='ghost'
                  size='icon-xs'
                  aria-label='Show suggestions'
                  {...(triggerProps && "aria-label" in triggerProps ? {"aria-label": triggerProps["aria-label"]} : {})}
                />
              ) : (
                <InputGroupButton
                  variant='ghost'
                  size='xs'
                />
              )
            }
            disabled={disabled}
            {...triggerProps}
          />
        ) : null}
        {showClear ? (
          <ComboboxClear
            disabled={disabled}
            {...clearProps}
          />
        ) : null}
      </InputGroupAddon>
    ) : null}
    {children}
  </InputGroup>
);

/**
 * Portals and positions the suggestions popup without adding a list, input or empty block of its own.
 *
 * @remarks
 * - Client Component composing Base UI `Combobox.Portal`, `Combobox.Positioner` and `Combobox.Popup`. `ref`, `className`
 *   and the remaining props target the popup; `positionerProps` (its `ref` included) target the positioner and
 *   `portalProps` the portal.
 * - Placement defaults differ from Base UI's: `side="bottom"`, `sideOffset={6}`, `align="start"`, `alignOffset={0}`.
 * - `anchor` accepts an element, a ref, a virtual element or a callback; pass the `useComboboxAnchor` ref shared with
 *   ComboboxChips so the popup is positioned against, and as wide as, the whole chips container.
 * - Compose ComboboxList and ComboboxEmpty inside it.
 *
 * @example
 * ```tsx
 * <ComboboxContent align='end' sideOffset={8} portalProps={{container: dialogBody}}>
 *   <ComboboxList>
 *     {(item: Fruit) => (
 *       <ComboboxItem key={item.value} value={item}>
 *         {item.label}
 *       </ComboboxItem>
 *     )}
 *   </ComboboxList>
 *   <ComboboxEmpty>No fruit found.</ComboboxEmpty>
 * </ComboboxContent>
 * ```
 */
const ComboboxContent = ({
  ref,
  className,
  side = "bottom",
  sideOffset = 6,
  align = "start",
  alignOffset = 0,
  anchor,
  positionMethod,
  collisionBoundary,
  collisionPadding,
  sticky,
  arrowPadding,
  disableAnchorTracking,
  collisionAvoidance,
  positionerProps,
  portalProps,
  ...props
}: Readonly<ComboboxContentProps>): React.JSX.Element => {
  const {className: positionerClassName, ...positionerNativeProps} = positionerProps ?? {};
  return (
    <ComboboxPrimitive.Portal {...portalProps}>
      <ComboboxPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        anchor={anchor}
        positionMethod={positionMethod}
        collisionBoundary={collisionBoundary}
        collisionPadding={collisionPadding}
        sticky={sticky}
        arrowPadding={arrowPadding}
        disableAnchorTracking={disableAnchorTracking}
        collisionAvoidance={collisionAvoidance}
        className={(state) =>
          cn(styles.positioner, typeof positionerClassName === "function" ? positionerClassName(state) : positionerClassName)
        }
        {...positionerNativeProps}>
        <ComboboxPrimitive.Popup
          data-slot='combobox-content'
          data-chips={Boolean(anchor)}
          ref={ref}
          className={(state) => cn(styles.content, typeof className === "function" ? className(state) : className)}
          {...props}
        />
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
};

/**
 * The suggestions listbox; a function child renders each of Base UI's filtered `items`.
 *
 * @remarks
 * - Client Component wrapping Base UI `Combobox.List`, which the input's `aria-controls` references while the popup is
 *   open; `className` callbacks receive its state (such as `empty`).
 * - For grouped data, return ComboboxGroup elements whose ComboboxCollection renders each group's items.
 *
 * @example
 * ```tsx
 * <ComboboxList>
 *   {(item: Fruit) => (
 *     <ComboboxItem key={item.value} value={item}>
 *       {item.label}
 *     </ComboboxItem>
 *   )}
 * </ComboboxList>
 * ```
 */
const ComboboxList = ({ref, className, ...props}: Readonly<ComboboxListProps>): React.JSX.Element => (
  <ComboboxPrimitive.List
    data-slot='combobox-list'
    ref={ref}
    className={(state) => cn(styles.list, typeof className === "function" ? className(state) : className)}
    {...props}
  />
);

/**
 * Selectable option with a check indicator that Base UI shows while it is selected.
 *
 * @remarks
 * - Client Component wrapping Base UI `Combobox.Item` (`role="option"`, `aria-selected` while selected). `value` reaches
 *   Base UI unchanged and is compared with the selection through `Object.is` (or the root's `isItemEqualToValue`), so pass
 *   the item objects from root `items`.
 * - Highlight (`data-highlighted`) follows the keyboard and pointer; `disabled` options can be highlighted but not
 *   selected. The check icon is decorative.
 *
 * @example
 * ```tsx
 * <ComboboxItem value={item} disabled={item.soldOut}>
 *   {item.label}
 * </ComboboxItem>
 * ```
 */
const ComboboxItem = ({ref, className, children, render, ...props}: Readonly<ComboboxItemProps>): React.JSX.Element => {
  const content = (
    <>
      {getChildren(children, render)}
      <ComboboxPrimitive.ItemIndicator
        data-slot='combobox-item-indicator'
        className={styles.indicator}>
        <Check
          aria-hidden='true'
          className={styles.icon}
        />
      </ComboboxPrimitive.ItemIndicator>
    </>
  );
  return (
    <ComboboxPrimitive.Item
      data-slot='combobox-item'
      ref={ref}
      className={(state) => cn(styles.item, typeof className === "function" ? className(state) : className)}
      render={withChildren(render, content)}
      {...props}>
      {content}
    </ComboboxPrimitive.Item>
  );
};

/**
 * Group of options named by its ComboboxLabel.
 *
 * @remarks
 * - Client Component wrapping Base UI `Combobox.Group` (`role="group"`). Pass the group's `items` so its
 *   ComboboxCollection renders only the group's filtered items; Base UI drops groups without matches from the filtered
 *   root `items` that ComboboxList's function child receives.
 *
 * @example
 * ```tsx
 * <ComboboxGroup items={group.items}>
 *   <ComboboxLabel>{group.label}</ComboboxLabel>
 *   <ComboboxCollection>
 *     {(item: Fruit) => (
 *       <ComboboxItem key={item.value} value={item}>
 *         {item.label}
 *       </ComboboxItem>
 *     )}
 *   </ComboboxCollection>
 * </ComboboxGroup>
 * ```
 */
const ComboboxGroup = ({ref, className, ...props}: Readonly<ComboboxGroupProps>): React.JSX.Element => (
  <ComboboxPrimitive.Group
    data-slot='combobox-group'
    ref={ref}
    className={(state) => cn(styles.group, typeof className === "function" ? className(state) : className)}
    {...props}
  />
);

/**
 * Visible label that names its ComboboxGroup (not the combobox input).
 *
 * @remarks
 * - Client Component wrapping Base UI `Combobox.GroupLabel`, which links itself to the enclosing group through
 *   `aria-labelledby`. Name the input separately with a `<label>` or `aria-label`.
 *
 * @example
 * ```tsx
 * <ComboboxGroup items={citrus}>
 *   <ComboboxLabel>Citrus</ComboboxLabel>
 *   <ComboboxCollection>{(item: Fruit) => <ComboboxItem key={item.value} value={item}>{item.label}</ComboboxItem>}</ComboboxCollection>
 * </ComboboxGroup>
 * ```
 */
const ComboboxLabel = ({ref, className, ...props}: Readonly<ComboboxLabelProps>): React.JSX.Element => (
  <ComboboxPrimitive.GroupLabel
    data-slot='combobox-label'
    ref={ref}
    className={(state) => cn(styles.label, typeof className === "function" ? className(state) : className)}
    {...props}
  />
);

/**
 * Renders a group's filtered items through a function child, adding no DOM element.
 *
 * @remarks
 * - Client Component; a thin wrapper of Base UI `Combobox.Collection` for grouped lists, placed inside a ComboboxGroup
 *   that received `items`. For a flat list, pass the function child to ComboboxList instead.
 *
 * @example
 * ```tsx
 * <ComboboxCollection>
 *   {(item: Fruit) => (
 *     <ComboboxItem key={item.value} value={item}>
 *       {item.label}
 *     </ComboboxItem>
 *   )}
 * </ComboboxCollection>
 * ```
 */
function ComboboxCollection(props: ComboboxCollectionProps): React.JSX.Element {
  return <ComboboxPrimitive.Collection {...props} />;
}

/**
 * Polite "no results" status whose children render only while the filtered list is empty.
 *
 * @remarks
 * - Client Component wrapping Base UI `Combobox.Empty`. Its `role="status"` root (`aria-live="polite"`, `aria-atomic`)
 *   stays mounted whenever it is rendered and only its children toggle against the root's filtered `items` (so the root
 *   needs `items`); the message is announced as a content change, and the root takes no space while empty.
 * - Keep it mounted: do not hide it with `hidden`, `display: none` or `aria-hidden`, or render it conditionally; change
 *   its children instead.
 *
 * @example
 * ```tsx
 * <ComboboxContent>
 *   <ComboboxList>{(item: Fruit) => <ComboboxItem key={item.value} value={item}>{item.label}</ComboboxItem>}</ComboboxList>
 *   <ComboboxEmpty>No fruit found.</ComboboxEmpty>
 * </ComboboxContent>
 * ```
 */
const ComboboxEmpty = ({ref, className, ...props}: Readonly<ComboboxEmptyProps>): React.JSX.Element => (
  <ComboboxPrimitive.Empty
    data-slot='combobox-empty'
    ref={ref}
    className={(state) => cn(styles.empty, typeof className === "function" ? className(state) : className)}
    {...props}
  />
);

/**
 * Divider between groups of a combobox list.
 *
 * @remarks
 * - Client Component wrapping Base UI `Combobox.Separator` (`role="separator"`); `className` callbacks receive its state.
 *   Render it between groups from ComboboxList's function child so it follows filtering.
 *
 * @example
 * ```tsx
 * <ComboboxList>
 *   {(group: FruitGroup, index: number) => (
 *     <React.Fragment key={group.value}>
 *       {index > 0 && <ComboboxSeparator />}
 *       <ComboboxGroup items={group.items}>
 *         <ComboboxLabel>{group.label}</ComboboxLabel>
 *         <ComboboxCollection>
 *           {(item: Fruit) => <ComboboxItem key={item.value} value={item}>{item.label}</ComboboxItem>}
 *         </ComboboxCollection>
 *       </ComboboxGroup>
 *     </React.Fragment>
 *   )}
 * </ComboboxList>
 * ```
 */
const ComboboxSeparator = ({ref, className, ...props}: Readonly<ComboboxSeparatorProps>): React.JSX.Element => (
  <ComboboxPrimitive.Separator
    data-slot='combobox-separator'
    ref={ref}
    className={(state) => cn(styles.separator, typeof className === "function" ? className(state) : className)}
    {...props}
  />
);

/**
 * Field-like container for the selected chips and the chips input of a `multiple` combobox.
 *
 * @remarks
 * - Client Component wrapping Base UI `Combobox.Chips`. Share a `useComboboxAnchor` ref with `ComboboxContent anchor` so
 *   the popup positions against the whole container.
 *
 * @example
 * ```tsx
 * <ComboboxChips ref={anchor}>
 *   <ComboboxValue>
 *     {(selected: readonly Fruit[]) =>
 *       selected.map((item) => (
 *         <ComboboxChip key={item.value} removeProps={{"aria-label": `Remove ${item.label}`}}>
 *           {item.label}
 *         </ComboboxChip>
 *       ))
 *     }
 *   </ComboboxValue>
 *   <ComboboxChipsInput aria-label='Fruits' />
 * </ComboboxChips>
 * ```
 */
const ComboboxChips = ({ref, className, ...props}: Readonly<ComboboxChipsProps>): React.JSX.Element => (
  <ComboboxPrimitive.Chips
    data-slot='combobox-chips'
    ref={ref}
    className={(state) => cn(styles.chips, typeof className === "function" ? className(state) : className)}
    {...props}
  />
);

/**
 * One selected value of a `multiple` combobox, with an optional remove button.
 *
 * @remarks
 * - Client Component wrapping Base UI `Combobox.Chip`. Left/Right arrows move between chips (mirrored in RTL) and
 *   Backspace/Delete removes the focused chip; Base UI owns cancellable removal and the focus move after it.
 * - `showRemove` (default `true`) adds a button named "Remove selection"; give it a specific, localized name through
 *   `removeProps` (`aria-label` or visible children). Custom icon-only `removeProps.render` callbacks must name it.
 *
 * @example
 * ```tsx
 * <ComboboxChip removeProps={{"aria-label": `Remove ${item.label}`}}>{item.label}</ComboboxChip>
 * ```
 */
const ComboboxChip = ({
  ref,
  className,
  children,
  render,
  showRemove = true,
  removeProps,
  ...props
}: Readonly<ComboboxChipProps>): React.JSX.Element => {
  const {className: removeClassName, children: removeChildren, render: removeRender, ...removeOtherProps} = removeProps ?? {};
  const resolvedRemoveChildren = getChildren(removeChildren, removeRender);
  const defaultRemoveLabel =
    typeof removeRender !== "function" && !hasCustomContent(resolvedRemoveChildren) ? "Remove selection" : undefined;
  const removeContent =
    resolvedRemoveChildren === undefined ? (
      <X
        aria-hidden='true'
        className={styles.icon}
      />
    ) : (
      resolvedRemoveChildren
    );
  const content = (
    <>
      {getChildren(children, render)}
      {showRemove ? (
        <ComboboxPrimitive.ChipRemove
          data-slot='combobox-chip-remove'
          aria-label={defaultRemoveLabel}
          className={(state) => cn(styles.chipRemove, typeof removeClassName === "function" ? removeClassName(state) : removeClassName)}
          render={withChildren(
            removeRender
              ?? (!hasCustomContent(resolvedRemoveChildren) ? (
                <Button
                  variant='ghost'
                  size='icon-xs'
                  aria-label='Remove selection'
                  {...("aria-label" in removeOtherProps ? {"aria-label": removeOtherProps["aria-label"]} : {})}
                />
              ) : (
                <Button
                  variant='ghost'
                  size='xs'
                />
              )),
            removeContent,
          )}
          {...removeOtherProps}>
          {removeContent}
        </ComboboxPrimitive.ChipRemove>
      ) : null}
    </>
  );
  return (
    <ComboboxPrimitive.Chip
      data-slot='combobox-chip'
      ref={ref}
      className={(state) => cn(styles.chip, typeof className === "function" ? className(state) : className)}
      render={withChildren(render, content)}
      {...props}>
      {content}
    </ComboboxPrimitive.Chip>
  );
};

/**
 * Editable input inside ComboboxChips, growing to fill the space after the chips.
 *
 * @remarks
 * - Client Component wrapping Base UI `Combobox.Input` without InputGroup chrome; `className` callbacks receive its state.
 *   Name it with a `<label>`, `aria-label` or `aria-labelledby`.
 *
 * @example
 * ```tsx
 * <ComboboxChips ref={anchor}>
 *   <ComboboxChipsInput aria-label='Fruits' placeholder='Add fruit' />
 * </ComboboxChips>
 * ```
 */
const ComboboxChipsInput = ({ref, className, ...props}: Readonly<ComboboxChipsInputProps>): React.JSX.Element => (
  <ComboboxPrimitive.Input
    data-slot='combobox-chip-input'
    ref={ref}
    className={(state) => cn(styles.chipsInput, typeof className === "function" ? className(state) : className)}
    {...props}
  />
);

/**
 * Creates the ref that ComboboxChips and `ComboboxContent anchor` share.
 *
 * @remarks
 * Client-only hook; a plain `useRef`, so it is stable across renders and `current` is `null` until ComboboxChips mounts.
 * Call it in the component that renders both parts, never conditionally.
 *
 * @returns A stable ref object for the chips container element.
 *
 * @example
 * ```tsx
 * function FruitTags(): React.JSX.Element {
 *   const anchor = useComboboxAnchor();
 *   return (
 *     <Combobox multiple items={fruits}>
 *       <ComboboxChips ref={anchor}>
 *         <ComboboxChipsInput aria-label='Fruits' />
 *       </ComboboxChips>
 *       <ComboboxContent anchor={anchor}>
 *         <ComboboxList>{(item: Fruit) => <ComboboxItem key={item.value} value={item}>{item.label}</ComboboxItem>}</ComboboxList>
 *       </ComboboxContent>
 *     </Combobox>
 *   );
 * }
 * ```
 */
function useComboboxAnchor(): React.RefObject<HTMLDivElement | null> {
  return React.useRef<HTMLDivElement | null>(null);
}

ComboboxTrigger.displayName = "ComboboxTrigger";
ComboboxClear.displayName = "ComboboxClear";
ComboboxInput.displayName = "ComboboxInput";
ComboboxContent.displayName = "ComboboxContent";
ComboboxList.displayName = "ComboboxList";
ComboboxItem.displayName = "ComboboxItem";
ComboboxGroup.displayName = "ComboboxGroup";
ComboboxLabel.displayName = "ComboboxLabel";
ComboboxEmpty.displayName = "ComboboxEmpty";
ComboboxSeparator.displayName = "ComboboxSeparator";
ComboboxChips.displayName = "ComboboxChips";
ComboboxChip.displayName = "ComboboxChip";
ComboboxChipsInput.displayName = "ComboboxChipsInput";

/* eslint-disable no-redeclare -- public component namespace typing API */
namespace Combobox {
  export type Props<Value, Multiple extends boolean | undefined = false, Item = Value> = ComboboxProps<Value, Multiple, Item>;
  export type State = ComboboxPrimitive.Root.State;
  export type Actions = ComboboxPrimitive.Root.Actions;
  export type ChangeEventReason = ComboboxPrimitive.Root.ChangeEventReason;
  export type ChangeEventDetails = ComboboxPrimitive.Root.ChangeEventDetails;
  export type OpenChangeEventDetails = ComboboxPrimitive.Root.OpenChangeEventDetails;
  export type HighlightEventReason = ComboboxPrimitive.Root.HighlightEventReason;
  export type HighlightEventDetails = ComboboxPrimitive.Root.HighlightEventDetails;
}
namespace ComboboxValue {
  export type Props = Readonly<ComboboxValueProps>;
  export type State = ComboboxPrimitive.Value.State;
}
namespace ComboboxTrigger {
  export type Props = Readonly<ComboboxTriggerProps>;
  export type State = ComboboxPrimitive.Trigger.State;
}
namespace ComboboxInput {
  export type Props = Readonly<ComboboxInputProps>;
  export type State = ComboboxPrimitive.Input.State;
}
namespace ComboboxContent {
  export type Props = Readonly<ComboboxContentProps>;
  export type State = ComboboxPrimitive.Popup.State;
}
namespace ComboboxList {
  export type Props = Readonly<ComboboxListProps>;
  export type State = ComboboxPrimitive.List.State;
}
namespace ComboboxItem {
  export type Props = Readonly<ComboboxItemProps>;
  export type State = ComboboxPrimitive.Item.State;
}
namespace ComboboxGroup {
  export type Props = Readonly<ComboboxGroupProps>;
  export type State = ComboboxPrimitive.Group.State;
}
namespace ComboboxLabel {
  export type Props = Readonly<ComboboxLabelProps>;
  export type State = ComboboxPrimitive.GroupLabel.State;
}
namespace ComboboxCollection {
  export type Props = Readonly<ComboboxCollectionProps>;
  export type State = ComboboxPrimitive.Collection.State;
}
namespace ComboboxEmpty {
  export type Props = Readonly<ComboboxEmptyProps>;
  export type State = ComboboxPrimitive.Empty.State;
}
namespace ComboboxSeparator {
  export type Props = Readonly<ComboboxSeparatorProps>;
  export type State = ComboboxPrimitive.Separator.State;
}
namespace ComboboxChips {
  export type Props = Readonly<ComboboxChipsProps>;
  export type State = ComboboxPrimitive.Chips.State;
}
namespace ComboboxChip {
  export type Props = Readonly<ComboboxChipProps>;
  export type State = ComboboxPrimitive.Chip.State;
}
namespace ComboboxChipsInput {
  export type Props = Readonly<ComboboxChipsInputProps>;
  export type State = ComboboxPrimitive.Input.State;
}
/* eslint-enable no-redeclare */

export {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxSeparator,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
};
