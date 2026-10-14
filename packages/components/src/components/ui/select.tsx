"use client";

import {Select as BaseSelect} from "@base-ui/react/select";
import type {ComponentRenderFn, HTMLProps} from "@base-ui/react/types";
import {Check, ChevronDown, ChevronUp} from "lucide-react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./select.module.css";

interface SelectTriggerProps extends React.ComponentPropsWithRef<typeof BaseSelect.Trigger> {
  /** The visual size of the trigger. @default "default" */
  size?: "sm" | "default";
}

type SelectPositioningProps = Omit<BaseSelect.Positioner.Props, keyof BaseSelect.Popup.Props>;
type SelectDataAttributes = {readonly [key: `data-${string}`]: string | number | boolean | undefined};
type SelectPositionerProps = Omit<React.ComponentPropsWithRef<typeof BaseSelect.Positioner>, keyof SelectPositioningProps | "children">
  & SelectDataAttributes;
type SelectListProps = Omit<React.ComponentPropsWithRef<typeof BaseSelect.List>, "children"> & SelectDataAttributes;

interface SelectContentProps extends React.ComponentPropsWithRef<typeof BaseSelect.Popup>, SelectPositioningProps {
  /** Props for the positioning container; positioning options are passed at the top level. */
  positionerProps?: Readonly<SelectPositionerProps>;
  /** Props for the actual listbox, including its accessible name, ref and render callback. */
  listProps?: Readonly<SelectListProps>;
}

type SelectRender<State> = React.ReactElement | ComponentRenderFn<HTMLProps, State> | undefined;

function getSelectRenderElement<State>(render: SelectRender<State>): React.ReactElement<{children?: React.ReactNode}> | undefined {
  if (typeof render === "function") return undefined;
  // eslint-disable-next-line react-x/no-children-to-array -- React's resolver unwraps the Flight-lazy render elements supported by Base UI.
  const [element] = React.Children.toArray(render);
  return React.isValidElement<{children?: React.ReactNode}>(element) ? element : undefined;
}

function getSelectChildren<State>(children: React.ReactNode, render: SelectRender<State>): React.ReactNode {
  return children === undefined ? getSelectRenderElement(render)?.props.children : children;
}

// Only normalize element children; Base UI still owns callback state, ref and handler merging.
function withSelectChildren<State>(render: SelectRender<State>, children: React.ReactNode): SelectRender<State> {
  const element = getSelectRenderElement(render);
  // eslint-disable-next-line react-x/no-clone-element -- Replace only compound children; Base UI still merges primitive state, refs and handlers.
  return element ? React.cloneElement(element, {children}) : render;
}

/**
 * Coordinates select state, keyboard navigation, and value management.
 *
 * @remarks
 * - Renders no DOM element by default and coordinates descendant select parts
 * - Built on {@link https://base-ui.com/react/components/select | Base UI Select}
 * - Supports composition through descendant `render` props
 * - Styling via CSS Modules with `--ac-*` custom properties
 * - Preserves generic single/multiple values, null clearing and cancellable change details
 *
 * @example Basic usage
 * ```tsx
 * <Select defaultValue="one">
 *   <SelectTrigger aria-label='Option'><SelectValue /></SelectTrigger>
 *   <SelectContent>
 *     <SelectItem value="one">One</SelectItem>
 *   </SelectContent>
 * </Select>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/select | Base UI Documentation}
 */
function Select<Value, Multiple extends boolean | undefined = false>(props: Readonly<Select.Props<Value, Multiple>>): React.JSX.Element {
  return <BaseSelect.Root {...props} />;
}
Select.displayName = "Select";

/**
 * Groups related select items into a shared logical section.
 *
 * @remarks
 * - Renders a `<div>` with the primitive's group semantics by default
 * - Built on {@link https://base-ui.com/react/components/select | Base UI Select}
 * - Supports composition through descendant `render` props
 * - Styling via CSS Modules with `--ac-*` custom properties through descendant components
 *
 * @example Basic usage
 * ```tsx
 * <SelectGroup>
 *   <SelectLabel>Team</SelectLabel>
 *   <SelectItem value="one">One</SelectItem>
 * </SelectGroup>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/select | Base UI Documentation}
 */
const SelectGroup = ({ref, ...props}: Readonly<SelectGroup.Props>): React.ReactElement => (
  <BaseSelect.Group
    data-slot='select-group'
    {...props}
    ref={ref}
  />
);
SelectGroup.displayName = "SelectGroup";
/**
 * Displays the currently selected option inside the trigger.
 *
 * @remarks
 * - Renders a `<span>` with the selected label or placeholder by default
 * - Built on {@link https://base-ui.com/react/components/select | Base UI Select}
 * - Supports composition through surrounding select trigger rendering
 * - Styling via CSS Modules with `--ac-*` custom properties through descendant components
 *
 * @example Basic usage
 * ```tsx
 * <SelectValue placeholder="Select an option" />
 * ```
 *
 * @see {@link https://base-ui.com/react/components/select | Base UI Documentation}
 */
const SelectValue = (props: Readonly<SelectValue.Props>): React.ReactElement => {
  const {ref, className, ...otherProps} = props;
  return (
    <BaseSelect.Value
      data-slot='select-value'
      {...otherProps}
      ref={ref}
      className={(state) => cn(styles.value, typeof className === "function" ? className(state) : className)}
    />
  );
};
SelectValue.displayName = "SelectValue";

/**
 * Opens the select popup and displays the current selected value.
 *
 * @remarks
 * - Renders a `<button>` element by default
 * - Built on {@link https://base-ui.com/react/components/select | Base UI Select}
 * - Supports the `render` prop for element composition
 * - Styling via CSS Modules with `--ac-*` custom properties
 * - Render-element children are used when explicit children are omitted
 *
 * @example Basic usage
 * ```tsx
 * <SelectTrigger>
 *   <SelectValue />
 * </SelectTrigger>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/select | Base UI Documentation}
 */
const SelectTrigger = (props: Readonly<SelectTrigger.Props>): React.ReactElement => {
  const {ref, className, children, render, size = "default", ...otherProps} = props;
  const content = (
    <>
      {getSelectChildren(children, render)}
      <BaseSelect.Icon
        data-slot='select-trigger-icon'
        className={styles.icon}>
        <ChevronDown className={styles.iconSvg} />
      </BaseSelect.Icon>
    </>
  );

  return (
    <BaseSelect.Trigger
      data-slot='select-trigger'
      data-size={size}
      ref={ref}
      {...otherProps}
      render={withSelectChildren(render, content)}
      className={(state) => cn(styles.trigger, typeof className === "function" ? className(state) : className)}>
      {content}
    </BaseSelect.Trigger>
  );
};
SelectTrigger.displayName = "SelectTrigger";

/**
 * Scrolls the select list upward when the popup overflows its viewport.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/select | Base UI Select}
 * - Supports the `render` prop for element composition
 * - Pass `children` to override the default `ChevronUp` icon
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <SelectScrollUpButton />
 * ```
 *
 * @see {@link https://base-ui.com/react/components/select | Base UI Documentation}
 */
const SelectScrollUpButton = (props: Readonly<SelectScrollUpButton.Props>): React.ReactElement => {
  const {ref, className, children, render, ...otherProps} = props;
  const resolvedChildren = getSelectChildren(children, render);
  const content = resolvedChildren === undefined ? <ChevronUp className={styles.scrollIcon} /> : resolvedChildren;

  return (
    <BaseSelect.ScrollUpArrow
      data-slot='select-scroll-up-button'
      {...otherProps}
      ref={ref}
      render={withSelectChildren(render, content)}
      className={(state) => cn(styles.scrollButton, styles.scrollUp, typeof className === "function" ? className(state) : className)}>
      {content}
    </BaseSelect.ScrollUpArrow>
  );
};
SelectScrollUpButton.displayName = "SelectScrollUpButton";

/**
 * Scrolls the select list downward when the popup overflows its viewport.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/select | Base UI Select}
 * - Supports the `render` prop for element composition
 * - Pass `children` to override the default `ChevronDown` icon
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <SelectScrollDownButton />
 * ```
 *
 * @see {@link https://base-ui.com/react/components/select | Base UI Documentation}
 */
const SelectScrollDownButton = (props: Readonly<SelectScrollDownButton.Props>): React.ReactElement => {
  const {ref, className, children, render, ...otherProps} = props;
  const resolvedChildren = getSelectChildren(children, render);
  const content = resolvedChildren === undefined ? <ChevronDown className={styles.scrollIcon} /> : resolvedChildren;

  return (
    <BaseSelect.ScrollDownArrow
      data-slot='select-scroll-down-button'
      {...otherProps}
      ref={ref}
      render={withSelectChildren(render, content)}
      className={(state) => cn(styles.scrollButton, styles.scrollDown, typeof className === "function" ? className(state) : className)}>
      {content}
    </BaseSelect.ScrollDownArrow>
  );
};
SelectScrollDownButton.displayName = "SelectScrollDownButton";

/**
 * Portals and positions the select popup with scroll affordances.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/select | Base UI Select}
 * - Supports the `render` prop for element composition
 * - Styling via CSS Modules with `--ac-*` custom properties
 * - Popup props (including `finalFocus`) stay on Popup; positioning options stay on Positioner
 * - Use `listProps` to label or customize the List, which owns the listbox role
 * - Render-element children remain inside the List; explicit children take priority
 *
 * @example Basic usage
 * ```tsx
 * <SelectContent>
 *   <SelectItem value="one">One</SelectItem>
 * </SelectContent>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/select | Base UI Documentation}
 */
const SelectContent = (props: Readonly<SelectContent.Props>): React.ReactElement => (
  <BaseSelect.Portal>
    <MountedSelectContent {...props} />
  </BaseSelect.Portal>
);

/** Normalize static render elements only after the SDK Portal actually mounts its surfaces. */
function MountedSelectContent(props: Readonly<SelectContent.Props>): React.ReactElement {
  const {
    ref,
    className,
    children,
    render,
    side = "bottom",
    sideOffset = 4,
    align = "center",
    alignOffset = 0,
    alignItemWithTrigger = true,
    anchor,
    positionMethod,
    collisionBoundary,
    collisionPadding,
    sticky,
    arrowPadding,
    disableAnchorTracking,
    collisionAvoidance,
    positionerProps,
    listProps,
    ...popupProps
  } = props;
  const listChildren = getSelectChildren(getSelectChildren(children, render), listProps?.render);
  const content = (
    <>
      <SelectScrollUpButton />
      <BaseSelect.List
        data-slot='select-list'
        {...listProps}
        render={withSelectChildren(listProps?.render, listChildren)}
        className={(state) =>
          cn(styles.list, typeof listProps?.className === "function" ? listProps.className(state) : listProps?.className)
        }>
        {listChildren}
      </BaseSelect.List>
      <SelectScrollDownButton />
    </>
  );
  const popup = (
    <BaseSelect.Popup
      data-slot='select-content'
      data-align-trigger={alignItemWithTrigger}
      {...popupProps}
      ref={ref}
      render={withSelectChildren(render, content)}
      className={(state) => cn(styles.popup, typeof className === "function" ? className(state) : className)}>
      {content}
    </BaseSelect.Popup>
  );

  return (
    <BaseSelect.Positioner
      data-slot='select-positioner'
      {...positionerProps}
      render={withSelectChildren(positionerProps?.render, popup)}
      side={side}
      sideOffset={sideOffset}
      align={align}
      alignOffset={alignOffset}
      alignItemWithTrigger={alignItemWithTrigger}
      anchor={anchor}
      positionMethod={positionMethod}
      collisionBoundary={collisionBoundary}
      collisionPadding={collisionPadding}
      sticky={sticky}
      arrowPadding={arrowPadding}
      disableAnchorTracking={disableAnchorTracking}
      collisionAvoidance={collisionAvoidance}
      className={(state) =>
        cn(
          styles.positioner,
          typeof positionerProps?.className === "function" ? positionerProps.className(state) : positionerProps?.className,
        )
      }>
      {popup}
    </BaseSelect.Positioner>
  );
}
SelectContent.displayName = "SelectContent";

/**
 * Labels a logical group of options inside the select popup.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/select | Base UI Select}
 * - Supports the `render` prop for element composition
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <SelectLabel>Team</SelectLabel>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/select | Base UI Documentation}
 */
const SelectLabel = (props: Readonly<SelectLabel.Props>): React.ReactElement => {
  const {ref, className, ...otherProps} = props;

  return (
    <BaseSelect.GroupLabel
      data-slot='select-label'
      {...otherProps}
      ref={ref}
      className={(state) => cn(styles.label, typeof className === "function" ? className(state) : className)}
    />
  );
};
SelectLabel.displayName = "SelectLabel";

/**
 * Renders a selectable option row within the select popup.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/select | Base UI Select}
 * - Supports the `render` prop for element composition
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <SelectItem value="one">One</SelectItem>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/select | Base UI Documentation}
 */
const SelectItem = (props: Readonly<SelectItem.Props>): React.ReactElement => {
  const {ref, className, children, render, ...otherProps} = props;
  const content = (
    <>
      <BaseSelect.ItemText
        data-slot='select-item-text'
        className={styles.itemText}>
        {getSelectChildren(children, render)}
      </BaseSelect.ItemText>
      <BaseSelect.ItemIndicator
        data-slot='select-item-indicator'
        className={styles.itemIndicatorSlot}>
        <Check className={styles.itemIndicatorIcon} />
      </BaseSelect.ItemIndicator>
    </>
  );

  return (
    <BaseSelect.Item
      data-slot='select-item'
      {...otherProps}
      ref={ref}
      render={withSelectChildren(render, content)}
      className={(state) => cn(styles.item, typeof className === "function" ? className(state) : className)}>
      {content}
    </BaseSelect.Item>
  );
};
SelectItem.displayName = "SelectItem";

/**
 * Separates groups of options inside the select popup.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/select | Base UI Select}
 * - Supports the `render` prop for element composition
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <SelectSeparator />
 * ```
 *
 * @see {@link https://base-ui.com/react/components/select | Base UI Documentation}
 */
const SelectSeparator = (props: Readonly<SelectSeparator.Props>): React.ReactElement => {
  const {ref, className, ...otherProps} = props;

  return (
    <BaseSelect.Separator
      data-slot='select-separator'
      {...otherProps}
      ref={ref}
      className={(state) => cn(styles.separator, typeof className === "function" ? className(state) : className)}
    />
  );
};
SelectSeparator.displayName = "SelectSeparator";

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Select {
  export type Props<Value, Multiple extends boolean | undefined = false> = BaseSelect.Root.Props<Value, Multiple>;
  export type State = BaseSelect.Root.State;
  export type Actions = BaseSelect.Root.Actions;
  export type ChangeEventReason = BaseSelect.Root.ChangeEventReason;
  export type ChangeEventDetails = BaseSelect.Root.ChangeEventDetails;
  export type OpenChangeEventDetails = BaseSelect.Root.OpenChangeEventDetails;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace SelectTrigger {
  export type Props = SelectTriggerProps;
  export type State = BaseSelect.Trigger.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace SelectGroup {
  export type Props = React.ComponentPropsWithRef<typeof BaseSelect.Group>;
  export type State = BaseSelect.Group.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace SelectValue {
  export type Props = React.ComponentPropsWithRef<typeof BaseSelect.Value>;
  export type State = BaseSelect.Value.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace SelectScrollUpButton {
  export type Props = React.ComponentPropsWithRef<typeof BaseSelect.ScrollUpArrow>;
  export type State = BaseSelect.ScrollUpArrow.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace SelectScrollDownButton {
  export type Props = React.ComponentPropsWithRef<typeof BaseSelect.ScrollDownArrow>;
  export type State = BaseSelect.ScrollDownArrow.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace SelectContent {
  export type Props = SelectContentProps;
  export type State = BaseSelect.Popup.State;
  export type PositionerProps = NonNullable<SelectContentProps["positionerProps"]>;
  export type ListProps = NonNullable<SelectContentProps["listProps"]>;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace SelectLabel {
  export type Props = React.ComponentPropsWithRef<typeof BaseSelect.GroupLabel>;
  export type State = BaseSelect.GroupLabel.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace SelectItem {
  export type Props = React.ComponentPropsWithRef<typeof BaseSelect.Item>;
  export type State = BaseSelect.Item.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace SelectSeparator {
  export type Props = React.ComponentPropsWithRef<typeof BaseSelect.Separator>;
  export type State = BaseSelect.Separator.State;
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
