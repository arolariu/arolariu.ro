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
    & ComboboxPositioningProps & {
      positionerProps?: ComboboxPositionerProps;
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
/** Props for the explicitly composed no-results block. */
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
 * Coordinates editable single/multiple selection and filtering.
 * The direct alias retains every installed Root generic and cancellable change contract.
 * Supply `items` metadata to display selected labels before popup items mount.
 */
const Combobox = ComboboxPrimitive.Root;

/** Displays the selected value from Root metadata without rendering an extra DOM node. */
const ComboboxValue = ComboboxPrimitive.Value;

/**
 * Opens suggestions; caller content is retained alongside the decorative chevron.
 * The built-in icon has a localizable "Show suggestions" name. Custom icon-only
 * content/render callbacks must supply their own aria-label or aria-labelledby.
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
              aria-label={props["aria-label"] ?? "Clear selection"}
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
 * Renders an editable primitive input inside the shared InputGroup chrome.
 * Input render/class callbacks receive Combobox.Input state, not InputGroup/Input state.
 * Children are optional group adornments; trigger/clear content belongs in their own props.
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
                  aria-label={triggerProps?.["aria-label"] ?? "Show suggestions"}
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
 * Portals and positions the popup without adding an implicit list, input or empty block.
 * The forwarded ref targets Popup; `positionerProps.ref` targets the measured positioner.
 * `anchor` accepts elements, refs, virtual DOMRect providers and callbacks.
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

/** Renders the real listbox; function children consume Base UI's filtered items. */
const ComboboxList = ({ref, className, ...props}: Readonly<ComboboxListProps>): React.JSX.Element => (
  <ComboboxPrimitive.List
    data-slot='combobox-list'
    ref={ref}
    className={(state) => cn(styles.list, typeof className === "function" ? className(state) : className)}
    {...props}
  />
);

/** Renders an option with a persistent primitive-owned selected state and check indicator. */
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

/** Groups options and associates them with a ComboboxLabel. */
const ComboboxGroup = ({ref, className, ...props}: Readonly<ComboboxGroupProps>): React.JSX.Element => (
  <ComboboxPrimitive.Group
    data-slot='combobox-group'
    ref={ref}
    className={(state) => cn(styles.group, typeof className === "function" ? className(state) : className)}
    {...props}
  />
);

/** Provides the accessible label for a ComboboxGroup. */
const ComboboxLabel = ({ref, className, ...props}: Readonly<ComboboxLabelProps>): React.JSX.Element => (
  <ComboboxPrimitive.GroupLabel
    data-slot='combobox-label'
    ref={ref}
    className={(state) => cn(styles.label, typeof className === "function" ? className(state) : className)}
    {...props}
  />
);

/** Renders the filtered collection inside a grouped list; adds no DOM wrapper. */
function ComboboxCollection(props: ComboboxCollectionProps): React.JSX.Element {
  return <ComboboxPrimitive.Collection {...props} />;
}

/** Renders one caller-composed empty block only when the primitive list is empty. */
const ComboboxEmpty = ({ref, className, ...props}: Readonly<ComboboxEmptyProps>): React.JSX.Element => (
  <ComboboxPrimitive.Empty
    data-slot='combobox-empty'
    ref={ref}
    className={(state) => cn(styles.empty, typeof className === "function" ? className(state) : className)}
    {...props}
  />
);

/** Separates related groups visually and semantically. */
const ComboboxSeparator = ({ref, className, ...props}: Readonly<ComboboxSeparatorProps>): React.JSX.Element => (
  <ComboboxPrimitive.Separator
    data-slot='combobox-separator'
    ref={ref}
    className={(state) => cn(styles.separator, typeof className === "function" ? className(state) : className)}
    {...props}
  />
);

/** Contains selected chips and the editable input; can serve as an explicit popup anchor. */
const ComboboxChips = ({ref, className, ...props}: Readonly<ComboboxChipsProps>): React.JSX.Element => (
  <ComboboxPrimitive.Chips
    data-slot='combobox-chips'
    ref={ref}
    className={(state) => cn(styles.chips, typeof className === "function" ? className(state) : className)}
    {...props}
  />
);

/** Displays a selected chip and delegates cancellable removal/focus management to Base UI. */
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
                  aria-label={removeOtherProps["aria-label"] ?? "Remove selection"}
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

/** Renders the flexible editable primitive input inside a multiple-selection chip container. */
const ComboboxChipsInput = ({ref, className, ...props}: Readonly<ComboboxChipsInputProps>): React.JSX.Element => (
  <ComboboxPrimitive.Input
    data-slot='combobox-chip-input'
    ref={ref}
    className={(state) => cn(styles.chipsInput, typeof className === "function" ? className(state) : className)}
    {...props}
  />
);

/** Returns a stable div ref to share between ComboboxChips and ComboboxContent.anchor. */
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
