"use client";

import {Check, ChevronsUpDown} from "lucide-react";
import * as React from "react";

import {useControllableState} from "@/hooks/useControllableState";
import {cn} from "@/lib/utilities";

import {Button} from "./button";
import {Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator} from "./command";
import {Popover, PopoverContent, PopoverTrigger} from "./popover";

import styles from "./combobox.module.css";

interface ComboboxContextValue {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  itemLabels: Map<string, string>;
  registerItem: (value: string, label: string) => void;
  unregisterItem: (value: string) => void;
}

const ComboboxContext = React.createContext<ComboboxContextValue | null>(null);

function useComboboxContext(componentName: string): ComboboxContextValue {
  const context = React.useContext(ComboboxContext);

  if (!context) {
    throw new Error(`${componentName} must be used within Combobox.`);
  }

  return context;
}

interface ComboboxProps {
  /**
   * The controlled selected value.
   * @default undefined
   */
  value?: string;
  /**
   * The default value when uncontrolled.
   * @default ""
   */
  defaultValue?: string;
  /**
   * Callback fired when the selected value changes.
   * @default undefined
   */
  onValueChange?: (value: string) => void;
  /**
   * Whether the popover is controlled open state.
   * @default undefined
   */
  open?: boolean;
  /**
   * Whether the popover is open by default (uncontrolled).
   * @default false
   */
  defaultOpen?: boolean;
  /**
   * Callback fired when the open state changes.
   * @default undefined
   */
  onOpenChange?: (open: boolean) => void;
  /**
   * Placeholder text shown when no value is selected.
   * @default "Select an item..."
   */
  placeholder?: string;
  /**
   * Placeholder text shown in the search input.
   * @default "Search..."
   */
  searchPlaceholder?: string;
  /**
   * Message shown when no items match the search.
   * @default "No items found."
   */
  emptyMessage?: string;
  /**
   * Whether the combobox is disabled.
   * @default false
   */
  disabled?: boolean;
  /**
   * Additional CSS classes merged with the combobox styles.
   * @default undefined
   */
  className?: string;
  /**
   * Combobox content and items.
   * @default undefined
   */
  children?: React.ReactNode;
}

interface ComboboxTriggerProps {
  /**
   * Additional CSS classes merged with the trigger styles.
   * @default undefined
   */
  className?: string;
  /**
   * Trigger content. If not provided, shows selected item label or placeholder.
   * @default undefined
   */
  children?: React.ReactNode;
}

interface ComboboxContentProps {
  /**
   * Additional CSS classes merged with the content styles.
   * @default undefined
   */
  className?: string;
  /**
   * Content children (typically ComboboxItem components).
   * @default undefined
   */
  children?: React.ReactNode;
}

interface ComboboxItemProps {
  /**
   * The value associated with this item.
   */
  value: string;
  /**
   * Additional CSS classes merged with the item styles.
   * @default undefined
   */
  className?: string;
  /**
   * Item content (label).
   * @default undefined
   */
  children?: React.ReactNode;
  /**
   * Whether the item is disabled.
   * @default false
   */
  disabled?: boolean;
  /**
   * Callback fired when the item is selected.
   * @default undefined
   */
  onSelect?: (value: string) => void;
  /**
   * Additional search keywords for filtering.
   * @default []
   */
  keywords?: string[];
}

interface ComboboxEmptyProps {
  /**
   * Additional CSS classes merged with the empty state styles.
   * @default undefined
   */
  className?: string;
  /**
   * Content shown when no items match. Defaults to context emptyMessage.
   * @default undefined
   */
  children?: React.ReactNode;
}

interface ComboboxGroupProps {
  /**
   * Group heading text.
   * @default undefined
   */
  heading?: string;
  /**
   * Additional CSS classes merged with the group styles.
   * @default undefined
   */
  className?: string;
  /**
   * Group items.
   * @default undefined
   */
  children?: React.ReactNode;
}

interface ComboboxSeparatorProps {
  /**
   * Additional CSS classes merged with the separator styles.
   * @default undefined
   */
  className?: string;
}

/**
 * A searchable select component combining Command, Popover, and Button.
 *
 * @remarks
 * - Composes Command (search), Popover (positioning), and Button (trigger)
 * - Supports both controlled and uncontrolled modes
 * - Provides keyboard navigation and filtering
 * - Built with Base UI primitives and CSS Modules
 *
 * @example Basic usage
 * ```tsx
 * <Combobox value={value} onValueChange={setValue}>
 *   <ComboboxTrigger />
 *   <ComboboxContent>
 *     <ComboboxItem value="apple">Apple</ComboboxItem>
 *     <ComboboxItem value="banana">Banana</ComboboxItem>
 *   </ComboboxContent>
 * </Combobox>
 * ```
 *
 * @example With groups
 * ```tsx
 * <Combobox>
 *   <ComboboxTrigger />
 *   <ComboboxContent>
 *     <ComboboxGroup heading="Fruits">
 *       <ComboboxItem value="apple">Apple</ComboboxItem>
 *     </ComboboxGroup>
 *     <ComboboxSeparator />
 *     <ComboboxGroup heading="Vegetables">
 *       <ComboboxItem value="carrot">Carrot</ComboboxItem>
 *     </ComboboxGroup>
 *   </ComboboxContent>
 * </Combobox>
 * ```
 */
function Combobox(props: Readonly<Combobox.Props>): React.ReactElement {
  const {
    value: controlledValue,
    defaultValue = "",
    onValueChange,
    open: controlledOpen,
    defaultOpen = false,
    onOpenChange,
    placeholder = "Select an item...",
    searchPlaceholder = "Search...",
    emptyMessage = "No items found.",
    disabled = false,
    className,
    children,
  } = props;

  const [value, setValue] = useControllableState({
    controlled: controlledValue,
    defaultValue,
    onChange: onValueChange,
  });

  const [open, setOpen] = useControllableState({
    controlled: controlledOpen,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const itemLabelsRef = React.useRef(new Map<string, string>());

  const registerItem = React.useCallback((itemValue: string, label: string) => {
    itemLabelsRef.current.set(itemValue, label);
  }, []);

  const unregisterItem = React.useCallback((itemValue: string) => {
    itemLabelsRef.current.delete(itemValue);
  }, []);

  const contextValue = React.useMemo<ComboboxContextValue>(
    () => ({
      value,
      onValueChange: setValue,
      open,
      setOpen,
      placeholder,
      searchPlaceholder,
      emptyMessage,
      disabled,
      itemLabels: itemLabelsRef.current,
      registerItem,
      unregisterItem,
    }),
    [value, setValue, open, setOpen, placeholder, searchPlaceholder, emptyMessage, disabled, registerItem, unregisterItem],
  );

  return (
    <ComboboxContext.Provider value={contextValue}>
      <Popover
        open={open}
        onOpenChange={setOpen}>
        <div className={cn(styles.combobox, className)}>{children}</div>
      </Popover>
    </ComboboxContext.Provider>
  );
}
Combobox.displayName = "Combobox";

/**
 * Button that opens and closes the combobox popover.
 *
 * @remarks
 * - Renders as a Button with trigger behavior
 * - Shows selected item label or placeholder
 * - Supports custom children or auto-display
 *
 * @example Basic usage
 * ```tsx
 * <ComboboxTrigger />
 * ```
 *
 * @example Custom content
 * ```tsx
 * <ComboboxTrigger>
 *   {selectedLabel || "Choose..."}
 * </ComboboxTrigger>
 * ```
 */
const ComboboxTrigger = React.forwardRef<HTMLButtonElement, ComboboxTrigger.Props>(
  (props: Readonly<ComboboxTrigger.Props>, ref): React.ReactElement => {
    const {className, children} = props;
    const {open, setOpen, value, placeholder, disabled, itemLabels} = useComboboxContext("ComboboxTrigger");

    // Force re-render when value changes to update the selected label
    const [, forceUpdate] = React.useReducer((x: number) => x + 1, 0);

    React.useEffect(() => {
      forceUpdate();
    }, [value]);

    const selectedLabel = itemLabels.get(value) || "";

    return (
      <PopoverTrigger asChild>
        <Button
          ref={ref}
          variant='outline'
          role='combobox'
          aria-expanded={open}
          disabled={disabled}
          className={cn(styles.trigger, className)}
          onClick={() => setOpen(!open)}>
          {children ?? (
            <>
              <span className={cn(styles.triggerValue, !selectedLabel && styles.triggerPlaceholder)}>{selectedLabel || placeholder}</span>
              <ChevronsUpDown className={styles.triggerIcon} />
            </>
          )}
        </Button>
      </PopoverTrigger>
    );
  },
);
ComboboxTrigger.displayName = "ComboboxTrigger";

/**
 * The popover content containing the searchable command list.
 *
 * @remarks
 * - Wraps Command with Popover positioning
 * - Includes search input and items list
 * - Automatically closes on item selection
 *
 * @example Basic usage
 * ```tsx
 * <ComboboxContent>
 *   <ComboboxItem value="item1">Item 1</ComboboxItem>
 * </ComboboxContent>
 * ```
 */
const ComboboxContent = React.forwardRef<HTMLDivElement, ComboboxContent.Props>(
  (props: Readonly<ComboboxContent.Props>, ref): React.ReactElement => {
    const {className, children} = props;
    const {searchPlaceholder} = useComboboxContext("ComboboxContent");

    return (
      <PopoverContent
        ref={ref}
        className={cn(styles.content, className)}
        sideOffset={4}>
        <Command className={styles.command}>
          <CommandInput
            placeholder={searchPlaceholder}
            className={styles.commandInput}
          />
          <CommandList className={styles.commandList}>
            <ComboboxEmpty />
            {children}
          </CommandList>
        </Command>
      </PopoverContent>
    );
  },
);
ComboboxContent.displayName = "ComboboxContent";

/**
 * A selectable item within the combobox.
 *
 * @remarks
 * - Uses CommandItem internally
 * - Shows check icon when selected
 * - Closes popover on selection
 *
 * @example Basic usage
 * ```tsx
 * <ComboboxItem value="apple">Apple</ComboboxItem>
 * ```
 *
 * @example With custom select handler
 * ```tsx
 * <ComboboxItem
 *   value="apple"
 *   onSelect={(value) => console.log("Selected:", value)}
 * >
 *   Apple
 * </ComboboxItem>
 * ```
 */
function ComboboxItem(props: Readonly<ComboboxItem.Props>): React.ReactElement {
  const {value: itemValue, className, children, disabled = false, onSelect, keywords = []} = props;
  const {value: selectedValue, onValueChange, setOpen, registerItem, unregisterItem} = useComboboxContext("ComboboxItem");

  const isSelected = selectedValue === itemValue;
  const label = typeof children === "string" ? children : itemValue;

  // Register this item's label when mounted
  React.useEffect(() => {
    registerItem(itemValue, label);
    return () => {
      unregisterItem(itemValue);
    };
  }, [itemValue, label, registerItem, unregisterItem]);

  const handleSelect = React.useCallback(
    (currentValue: string) => {
      const newValue = currentValue === selectedValue ? "" : currentValue;
      onValueChange(newValue);
      setOpen(false);
      onSelect?.(newValue);
    },
    [selectedValue, onValueChange, setOpen, onSelect],
  );

  return (
    <CommandItem
      value={itemValue}
      disabled={disabled}
      onSelect={handleSelect}
      keywords={keywords}
      className={cn(styles.item, isSelected && styles.itemSelected, className)}>
      <Check className={cn(styles.itemCheck, isSelected && styles.itemCheckVisible)} />
      <span className={styles.itemLabel}>{children}</span>
    </CommandItem>
  );
}
ComboboxItem.displayName = "ComboboxItem";

/**
 * Message shown when search returns no results.
 *
 * @remarks
 * - Uses CommandEmpty internally
 * - Defaults to context emptyMessage
 *
 * @example Basic usage
 * ```tsx
 * <ComboboxEmpty />
 * ```
 *
 * @example Custom message
 * ```tsx
 * <ComboboxEmpty>Nothing found</ComboboxEmpty>
 * ```
 */
function ComboboxEmpty(props: Readonly<ComboboxEmpty.Props>): React.ReactElement {
  const {className, children} = props;
  const {emptyMessage} = useComboboxContext("ComboboxEmpty");

  return <CommandEmpty className={cn(styles.empty, className)}>{children ?? emptyMessage}</CommandEmpty>;
}
ComboboxEmpty.displayName = "ComboboxEmpty";

/**
 * Groups related combobox items with an optional heading.
 *
 * @remarks
 * - Uses CommandGroup internally
 * - Supports visual grouping with headings
 *
 * @example Basic usage
 * ```tsx
 * <ComboboxGroup heading="Fruits">
 *   <ComboboxItem value="apple">Apple</ComboboxItem>
 * </ComboboxGroup>
 * ```
 */
function ComboboxGroup(props: Readonly<ComboboxGroup.Props>): React.ReactElement {
  const {heading, className, children} = props;

  return (
    <CommandGroup
      heading={heading}
      className={cn(styles.group, className)}>
      {children}
    </CommandGroup>
  );
}
ComboboxGroup.displayName = "ComboboxGroup";

/**
 * Visual separator between combobox groups.
 *
 * @remarks
 * - Uses CommandSeparator internally
 *
 * @example Basic usage
 * ```tsx
 * <ComboboxSeparator />
 * ```
 */
function ComboboxSeparator(props: Readonly<ComboboxSeparator.Props>): React.ReactElement {
  const {className} = props;

  return <CommandSeparator className={cn(styles.separator, className)} />;
}
ComboboxSeparator.displayName = "ComboboxSeparator";

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Combobox {
  export type Props = ComboboxProps;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace ComboboxTrigger {
  export type Props = ComboboxTriggerProps;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace ComboboxContent {
  export type Props = ComboboxContentProps;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace ComboboxItem {
  export type Props = ComboboxItemProps;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace ComboboxEmpty {
  export type Props = ComboboxEmptyProps;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace ComboboxGroup {
  export type Props = ComboboxGroupProps;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace ComboboxSeparator {
  export type Props = ComboboxSeparatorProps;
}

export {Combobox, ComboboxContent, ComboboxEmpty, ComboboxGroup, ComboboxItem, ComboboxSeparator, ComboboxTrigger};
