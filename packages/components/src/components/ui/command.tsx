"use client";

import {Dialog as BaseDialog} from "@base-ui/react/dialog";
import {Separator as BaseSeparator} from "@base-ui/react/separator";
import {Search} from "lucide-react";
import * as React from "react";

import {cn} from "@/lib/utilities";

import styles from "./command.module.css";

type CommandFilter = (value: string, search: string, keywords?: string[]) => number;

interface CommandProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Command palette content.
   * @default undefined
   */
  children?: React.ReactNode;
  /**
   * Accessible label announced for the command region.
   * @default undefined
   */
  label?: string;
  /**
   * Whether items should be filtered automatically as the search value changes.
   * @default true
   */
  shouldFilter?: boolean;
  /**
   * Custom scoring function used to determine whether an item matches the current search value.
   * @default undefined
   */
  filter?: CommandFilter;
  /**
   * Deprecated uncontrolled search value placeholder retained for API compatibility.
   * @default undefined
   */
  defaultValue?: string;
  /**
   * Deprecated controlled search value placeholder retained for API compatibility.
   * @default undefined
   */
  value?: string;
  /**
   * Deprecated change callback retained for API compatibility.
   * @default undefined
   */
  onValueChange?: (value: string) => void;
  /**
   * Whether keyboard navigation should wrap from the last item to the first.
   * @default false
   */
  loop?: boolean;
  /**
   * Whether pointer hover should avoid changing the active item.
   * @default false
   */
  disablePointerSelection?: boolean;
  /**
   * Deprecated Vim keybinding toggle retained for API compatibility.
   * @default undefined
   */
  vimBindings?: boolean;
}

interface CommandDialogProps extends Omit<React.ComponentPropsWithoutRef<typeof BaseDialog.Root>, "children"> {
  /**
   * Command palette content rendered inside the dialog popup.
   * @default undefined
   */
  children?: React.ReactNode;
  /**
   * Accessible dialog title announced to assistive technologies.
   * @default "Command menu"
   */
  title?: React.ReactNode;
}

interface CommandInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "type" | "value"> {
  /**
   * Controlled search value.
   * @default undefined
   */
  value?: string;
  /**
   * Native input change handler invoked before the command-specific callback.
   * @default undefined
   */
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  /**
   * Callback fired when the command search value changes.
   * @default undefined
   */
  onValueChange?: (search: string) => void;
}

interface CommandListProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Command items and groups.
   * @default undefined
   */
  children?: React.ReactNode;
  /**
   * Accessible label for the listbox container.
   * @default undefined
   */
  label?: string;
}

interface CommandGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "value"> {
  /**
   * Group contents.
   * @default undefined
   */
  children?: React.ReactNode;
  /**
   * Optional visual heading displayed above the group items.
   * @default undefined
   */
  heading?: React.ReactNode;
  /**
   * Optional stable value retained for API compatibility.
   * @default undefined
   */
  value?: string;
  /**
   * Whether the group should remain rendered even when it has no visible items.
   * @default false
   */
  forceMount?: boolean;
}

interface CommandSeparatorProps extends React.ComponentPropsWithoutRef<typeof BaseSeparator> {
  /**
   * Whether the separator should remain visible while filtering is active.
   * @default false
   */
  alwaysRender?: boolean;
}

interface CommandItemProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  /**
   * Item contents.
   * @default undefined
   */
  children?: React.ReactNode;
  /**
   * Whether the item is disabled and should be skipped by selection logic.
   * @default false
   */
  disabled?: boolean;
  /**
   * Callback invoked when the item is selected.
   * @default undefined
   */
  onSelect?: (value: string) => void;
  /**
   * Optional value used for filtering and selection callbacks.
   * @default undefined
   */
  value?: string;
  /**
   * Additional search keywords included in the filter match set.
   * @default []
   */
  keywords?: string[];
  /**
   * Whether the item should remain rendered even when filtered out.
   * @default false
   */
  forceMount?: boolean;
}

interface CommandRegisteredItem {
  disabled: boolean;
  forceMount: boolean;
  groupId: string | null;
  id: string;
  keywords: string[];
  order: number;
  ref: React.RefObject<HTMLDivElement | null>;
  textValue: string;
  value?: string;
}

interface CommandContextValue {
  activeItemId: string | null;
  disablePointerSelection: boolean;
  getVisibleItemCount: () => number;
  hasVisibleItemsInGroup: (groupId: string) => boolean;
  isFiltering: boolean;
  isItemVisible: (itemId: string) => boolean;
  listId: string;
  loop: boolean;
  registerItem: (item: Omit<CommandRegisteredItem, "order">) => void;
  search: string;
  setSearch: (value: string) => void;
  selectNextItem: () => void;
  selectPreviousItem: () => void;
  selectSpecificItem: (itemId: string | null) => void;
  shouldFilter: boolean;
  triggerActiveItem: () => void;
  unregisterItem: (itemId: string) => void;
}

const CommandContext = React.createContext<CommandContextValue | null>(null);
const CommandGroupContext = React.createContext<string | null>(null);

function assignRef<TValue>(ref: React.ForwardedRef<TValue>, value: TValue): void {
  if (typeof ref === "function") {
    ref(value);
    return;
  }

  if (ref) {
    ref.current = value;
  }
}

function normalizeCommandValue(value: string): string {
  return value.trim().toLowerCase();
}

function defaultCommandFilter(value: string, search: string, keywords: string[] = []): number {
  if (search.length === 0) {
    return 1;
  }

  const normalizedSearch = normalizeCommandValue(search);
  const normalizedValue = normalizeCommandValue([value, ...keywords].join(" "));

  return normalizedValue.includes(normalizedSearch) ? 1 : 0;
}

function useCommandContext(componentName: string): CommandContextValue {
  const context = React.useContext(CommandContext);

  if (!context) {
    throw new Error(`${componentName} must be used within Command.`);
  }

  return context;
}

/**
 * Provides a lightweight, filterable command surface without depending on cmdk.
 *
 * @remarks
 * This wrapper preserves the existing compound-component API while replacing the
 * underlying implementation with a small context-driven registry. It supports
 * text filtering, arrow-key navigation, Enter-to-select, and pointer hover
 * selection for common command palette use cases.
 *
 * @example
 * ```tsx
 * <Command label='Quick actions'>
 *   <CommandInput placeholder='Search actions...' />
 *   <CommandList>
 *     <CommandItem onSelect={() => console.log("Open")}>Open</CommandItem>
 *   </CommandList>
 * </Command>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/dialog | Base UI Dialog Docs}
 */
const Command = React.forwardRef<HTMLDivElement, CommandProps>(
  (
    {
      children,
      className,
      defaultValue: _defaultValue,
      disablePointerSelection = false,
      filter,
      label,
      loop = false,
      onKeyDown,
      onValueChange: _onValueChange,
      shouldFilter = true,
      value: _value,
      vimBindings: _vimBindings,
      ...props
    },
    ref,
  ) => {
    const [activeItemId, setActiveItemId] = React.useState<string | null>(null);
    const [search, setSearch] = React.useState("");
    const itemOrderRef = React.useRef(0);
    const itemsRef = React.useRef(new Map<string, CommandRegisteredItem>());
    const [itemsVersion, setItemsVersion] = React.useState(0);
    const listId = React.useId();

    const registerItem = React.useCallback((item: Omit<CommandRegisteredItem, "order">): void => {
      const existingItem = itemsRef.current.get(item.id);
      const nextItem: CommandRegisteredItem = {
        ...item,
        order: existingItem?.order ?? itemOrderRef.current++,
      };

      const hasChanged =
        !existingItem
        || existingItem.disabled !== nextItem.disabled
        || existingItem.forceMount !== nextItem.forceMount
        || existingItem.groupId !== nextItem.groupId
        || existingItem.keywords.join("\u0000") !== nextItem.keywords.join("\u0000")
        || existingItem.ref !== nextItem.ref
        || existingItem.textValue !== nextItem.textValue
        || existingItem.value !== nextItem.value;

      if (!hasChanged) {
        return;
      }

      itemsRef.current.set(item.id, nextItem);
      setItemsVersion((currentVersion) => currentVersion + 1);
    }, []);

    const unregisterItem = React.useCallback((itemId: string): void => {
      if (!itemsRef.current.delete(itemId)) {
        return;
      }

      setItemsVersion((currentVersion) => currentVersion + 1);
    }, []);

    const items = React.useMemo(() => {
      return [...itemsRef.current.values()].toSorted((firstItem, secondItem) => firstItem.order - secondItem.order);
      // eslint-disable-next-line react-hooks/exhaustive-deps -- itemsVersion is an intentional change counter
    }, [itemsVersion]);

    const isFiltering = shouldFilter && search.trim().length > 0;

    const isItemVisible = React.useCallback(
      (itemId: string): boolean => {
        const item = itemsRef.current.get(itemId);

        if (!item) {
          return false;
        }

        if (item.forceMount || !shouldFilter || search.trim().length === 0) {
          return true;
        }

        const itemValue = item.value ?? item.textValue;
        const itemFilter = filter ?? defaultCommandFilter;

        return itemFilter(itemValue, search, item.keywords) > 0;
      },
      [filter, search, shouldFilter],
    );

    const visibleItems = React.useMemo(() => items.filter((item) => isItemVisible(item.id)), [isItemVisible, items]);

    const selectableItems = React.useMemo(() => visibleItems.filter((item) => !item.disabled), [visibleItems]);

    React.useEffect(() => {
      if (selectableItems.length === 0) {
        // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
        setActiveItemId(null);
        return;
      }

      if (!activeItemId || !selectableItems.some((item) => item.id === activeItemId)) {
        // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
        setActiveItemId(selectableItems[0].id);
      }
    }, [activeItemId, selectableItems]);

    React.useEffect(() => {
      if (!activeItemId) {
        return;
      }

      itemsRef.current.get(activeItemId)?.ref.current?.scrollIntoView({
        block: "nearest",
      });
    }, [activeItemId]);

    const selectSpecificItem = React.useCallback((itemId: string | null): void => {
      setActiveItemId(itemId);
    }, []);

    const selectNextItem = React.useCallback((): void => {
      if (selectableItems.length === 0) {
        return;
      }

      const currentIndex = selectableItems.findIndex((item) => item.id === activeItemId);

      if (currentIndex === -1) {
        setActiveItemId(selectableItems[0].id);
        return;
      }

      const nextIndex = currentIndex + 1;

      if (nextIndex >= selectableItems.length) {
        setActiveItemId(loop ? selectableItems[0].id : selectableItems[currentIndex].id);
        return;
      }

      setActiveItemId(selectableItems[nextIndex].id);
    }, [activeItemId, loop, selectableItems]);

    const selectPreviousItem = React.useCallback((): void => {
      if (selectableItems.length === 0) {
        return;
      }

      const currentIndex = selectableItems.findIndex((item) => item.id === activeItemId);

      if (currentIndex === -1) {
        setActiveItemId(selectableItems[0].id);
        return;
      }

      const previousIndex = currentIndex - 1;

      if (previousIndex < 0) {
        setActiveItemId(loop ? (selectableItems.at(-1)?.id ?? selectableItems[0].id) : selectableItems[currentIndex].id);
        return;
      }

      setActiveItemId(selectableItems[previousIndex].id);
    }, [activeItemId, loop, selectableItems]);

    const triggerActiveItem = React.useCallback((): void => {
      if (!activeItemId) {
        return;
      }

      itemsRef.current.get(activeItemId)?.ref.current?.click();
    }, [activeItemId]);

    const hasVisibleItemsInGroup = React.useCallback(
      (groupId: string): boolean => visibleItems.some((item) => item.groupId === groupId),
      [visibleItems],
    );

    const getVisibleItemCount = React.useCallback((): number => visibleItems.length, [visibleItems.length]);

    const contextValue = React.useMemo<CommandContextValue>(
      () => ({
        activeItemId,
        disablePointerSelection,
        getVisibleItemCount,
        hasVisibleItemsInGroup,
        isFiltering,
        isItemVisible,
        listId,
        loop,
        registerItem,
        search,
        setSearch,
        selectNextItem,
        selectPreviousItem,
        selectSpecificItem,
        shouldFilter,
        triggerActiveItem,
        unregisterItem,
      }),
      [
        activeItemId,
        disablePointerSelection,
        getVisibleItemCount,
        hasVisibleItemsInGroup,
        isFiltering,
        isItemVisible,
        listId,
        loop,
        registerItem,
        search,
        setSearch,
        selectNextItem,
        selectPreviousItem,
        selectSpecificItem,
        shouldFilter,
        triggerActiveItem,
        unregisterItem,
      ],
    );

    return (
      <CommandContext.Provider value={contextValue}>
        <div
          ref={ref}
          aria-label={label}
          className={cn(styles.command, className)}
          role='toolbar'
          onKeyDown={(event) => {
            onKeyDown?.(event);

            if (event.defaultPrevented) {
              return;
            }

            switch (event.key) {
              case "ArrowDown": {
                event.preventDefault();
                selectNextItem();
                break;
              }

              case "ArrowUp": {
                event.preventDefault();
                selectPreviousItem();
                break;
              }

              case "Home": {
                if (selectableItems.length === 0) {
                  return;
                }

                event.preventDefault();
                setActiveItemId(selectableItems[0].id);
                break;
              }

              case "End": {
                if (selectableItems.length === 0) {
                  return;
                }

                event.preventDefault();
                setActiveItemId(selectableItems.at(-1)?.id ?? selectableItems[0].id);
                break;
              }

              case "Enter": {
                if (event.nativeEvent.isComposing) {
                  return;
                }

                event.preventDefault();
                triggerActiveItem();
                break;
              }

              default: {
                break;
              }
            }
          }}
          {...props}>
          {children}
        </div>
      </CommandContext.Provider>
    );
  },
);
Command.displayName = "Command";

/**
 * Renders the command surface inside a modal dialog.
 *
 * @remarks
 * - Renders a Base UI dialog popup
 * - Built on Base UI Dialog primitives
 *
 * @example
 * ```tsx
 * <CommandDialog open={open} onOpenChange={setOpen}>
 *   <CommandInput placeholder='Search...' />
 * </CommandDialog>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/dialog | Base UI Dialog Docs}
 */
function CommandDialog({children, open, onOpenChange, title = "Command menu", ...props}: Readonly<CommandDialogProps>): React.JSX.Element {
  return (
    <BaseDialog.Root
      open={open}
      onOpenChange={onOpenChange}
      {...props}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className={styles.backdrop} />
        <BaseDialog.Popup className={styles.dialogPopup}>
          <BaseDialog.Title className={styles.srOnly}>{title}</BaseDialog.Title>
          <Command>{children}</Command>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
CommandDialog.displayName = "CommandDialog";

/**
 * Provides the searchable input surface for a command palette.
 *
 * @remarks
 * - Renders an `<input>` element inside a wrapper `<div>`
 * - Built on the shared command registry context
 *
 * @example
 * ```tsx
 * <CommandInput placeholder='Search...' />
 * ```
 *
 * @see {@link https://developer.mozilla.org/docs/Web/Accessibility/ARIA/Roles/combobox_role | ARIA Combobox Role}
 */
const CommandInput = React.forwardRef<HTMLInputElement, CommandInputProps>(({className, onChange, onValueChange, value, ...props}, ref) => {
  const {activeItemId, listId, search, selectSpecificItem, setSearch} = useCommandContext("CommandInput");
  const isControlled = value !== undefined;
  const inputValue = isControlled ? value : search;

  React.useEffect(() => {
    if (!isControlled) {
      return;
    }

    setSearch(value ?? "");
  }, [isControlled, setSearch, value]);

  return (
    <div className={styles.inputWrapper}>
      <Search className={styles.searchIcon} />
      <input
        ref={ref}
        aria-activedescendant={activeItemId ?? undefined}
        aria-autocomplete='list'
        aria-controls={listId}
        aria-expanded='true'
        className={cn(styles.input, className)}
        onChange={(event) => {
          onChange?.(event);

          const nextSearchValue = event.currentTarget.value;
          setSearch(nextSearchValue);
          onValueChange?.(nextSearchValue);
          selectSpecificItem(null);
        }}
        role='combobox'
        type='text'
        value={inputValue}
        {...props}
      />
    </div>
  );
});
CommandInput.displayName = "CommandInput";

/**
 * Renders the listbox container that hosts command items and groups.
 *
 * @remarks
 * - Renders a `<div>` element with `role="listbox"`
 * - Built on the shared command registry context
 *
 * @example
 * ```tsx
 * <CommandList>
 *   <CommandItem>Settings</CommandItem>
 * </CommandList>
 * ```
 *
 * @see {@link https://developer.mozilla.org/docs/Web/Accessibility/ARIA/Roles/listbox_role | ARIA Listbox Role}
 */
const CommandList = React.forwardRef<HTMLDivElement, CommandListProps>(({className, label, ...props}, ref) => {
  const {listId} = useCommandContext("CommandList");

  return (
    <div
      aria-label={label}
      ref={ref}
      className={cn(styles.list, className)}
      id={listId}
      role='listbox'
      {...props}
    />
  );
});
CommandList.displayName = "CommandList";

/**
 * Renders a fallback empty-state message when no command items are visible.
 *
 * @remarks
 * - Renders a `<div>` element with `role="status"`
 * - Built on the shared command registry context
 *
 * @example
 * ```tsx
 * <CommandEmpty>No results found.</CommandEmpty>
 * ```
 *
 * @see {@link https://developer.mozilla.org/docs/Web/Accessibility/ARIA/Roles/status_role | ARIA Status Role}
 */
const CommandEmpty = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({className, ...props}, ref) => {
  const {getVisibleItemCount} = useCommandContext("CommandEmpty");

  if (getVisibleItemCount() > 0) {
    return null;
  }

  return (
    <div
      ref={ref}
      className={cn(styles.empty, className)}
      role='status'
      {...props}
    />
  );
});
CommandEmpty.displayName = "CommandEmpty";

/**
 * Groups related command items under an optional heading.
 *
 * @remarks
 * - Renders a `<div>` element
 * - Built on the shared command registry context
 *
 * @example
 * ```tsx
 * <CommandGroup heading='Suggestions'>
 *   <CommandItem>Profile</CommandItem>
 * </CommandGroup>
 * ```
 *
 * @see {@link https://developer.mozilla.org/docs/Web/Accessibility/ARIA/Roles/group_role | ARIA Group Role}
 */
const CommandGroup = React.forwardRef<HTMLDivElement, CommandGroupProps>(
  ({children, className, forceMount = false, heading, value: _value, ...props}, ref) => {
    const groupId = React.useId();
    const {hasVisibleItemsInGroup, isFiltering} = useCommandContext("CommandGroup");

    if (!forceMount && isFiltering && !hasVisibleItemsInGroup(groupId)) {
      return null;
    }

    return (
      <CommandGroupContext.Provider value={groupId}>
        <div
          ref={ref}
          className={cn(styles.group, className)}
          data-command-group=''
          {...props}>
          {heading ? <div className={styles.groupHeading}>{heading}</div> : null}
          {children}
        </div>
      </CommandGroupContext.Provider>
    );
  },
);
CommandGroup.displayName = "CommandGroup";

/**
 * Renders a separator between command groups or item sections.
 *
 * @remarks
 * - Renders the shared separator primitive
 * - Built on Base UI Separator
 *
 * @example
 * ```tsx
 * <CommandSeparator />
 * ```
 *
 * @see {@link https://base-ui.com/react/components/separator | Base UI Separator Docs}
 */
const CommandSeparator = React.forwardRef<HTMLDivElement, CommandSeparatorProps>(
  ({alwaysRender = false, className, orientation = "horizontal", ...props}, ref) => {
    const {isFiltering} = useCommandContext("CommandSeparator");

    if (isFiltering && !alwaysRender) {
      return null;
    }

    return (
      <BaseSeparator
        ref={ref}
        className={cn(styles.separator, className)}
        orientation={orientation}
        {...props}
      />
    );
  },
);
CommandSeparator.displayName = "CommandSeparator";

/**
 * Renders a selectable command option with filtering metadata and keyboard support.
 *
 * @remarks
 * - Renders a `<div>` element with `role="option"`
 * - Built on the shared command registry context
 *
 * @example
 * ```tsx
 * <CommandItem keywords={["preferences"]}>Settings</CommandItem>
 * ```
 *
 * @see {@link https://developer.mozilla.org/docs/Web/Accessibility/ARIA/Roles/option_role | ARIA Option Role}
 */
const CommandItem = React.forwardRef<HTMLDivElement, CommandItemProps>(
  ({children, className, disabled = false, forceMount = false, keywords = [], onClick, onMouseEnter, onSelect, value, ...props}, ref) => {
    const {activeItemId, disablePointerSelection, isFiltering, isItemVisible, registerItem, selectSpecificItem, unregisterItem} =
      useCommandContext("CommandItem");
    const groupId = React.useContext(CommandGroupContext);
    const generatedId = React.useId();
    const itemRef = React.useRef<HTMLDivElement | null>(null);
    const keywordSignature = React.useMemo(() => keywords.join("\u0000"), [keywords]);

    React.useLayoutEffect(() => {
      const textValue = value ?? itemRef.current?.textContent?.trim() ?? "";

      registerItem({
        disabled,
        forceMount,
        groupId,
        id: generatedId,
        keywords,
        ref: itemRef,
        textValue,
        value,
      });
    }, [children, disabled, forceMount, generatedId, groupId, keywordSignature, keywords, registerItem, value]);

    React.useEffect(() => {
      return () => {
        unregisterItem(generatedId);
      };
    }, [generatedId, unregisterItem]);

    const isVisible = forceMount || !isFiltering || isItemVisible(generatedId);

    if (!isVisible) {
      return null;
    }

    const isSelected = activeItemId === generatedId;

    return (
      <div
        {...props}
        ref={(node) => {
          itemRef.current = node;
          assignRef(ref, node);
        }}
        aria-disabled={disabled || undefined}
        aria-selected={isSelected}
        className={cn(styles.item, className)}
        data-disabled={disabled ? "true" : undefined}
        data-selected={isSelected ? "true" : undefined}
        id={generatedId}
        onClick={(event) => {
          if (disabled) {
            event.preventDefault();
            return;
          }

          selectSpecificItem(generatedId);
          onSelect?.(value ?? itemRef.current?.textContent?.trim() ?? "");
          onClick?.(event);
        }}
        onKeyDown={(event) => {
          if (disabled) {
            event.preventDefault();
            return;
          }

          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            selectSpecificItem(generatedId);
            onSelect?.(value ?? itemRef.current?.textContent?.trim() ?? "");
          }
        }}
        onFocus={() => {
          if (disabled) {
            return;
          }

          selectSpecificItem(generatedId);
        }}
        onMouseEnter={(event) => {
          onMouseEnter?.(event);

          if (disabled || disablePointerSelection) {
            return;
          }

          selectSpecificItem(generatedId);
        }}
        role='option'
        tabIndex={disabled ? -1 : 0}>
        {children}
      </div>
    );
  },
);
CommandItem.displayName = "CommandItem";

/**
 * Renders auxiliary shortcut text aligned to the edge of a command item.
 *
 * @remarks
 * - Renders a `<span>` element
 * - Built as a lightweight presentational helper for command menus
 *
 * @example
 * ```tsx
 * <CommandShortcut>⌘K</CommandShortcut>
 * ```
 *
 * @see {@link https://developer.mozilla.org/docs/Web/HTML/Element/span | HTML span element}
 */
const CommandShortcut = ({className, ...props}: Readonly<React.HTMLAttributes<HTMLSpanElement>>): React.JSX.Element => {
  return (
    <span
      className={cn(styles.shortcut, className)}
      {...props}
    />
  );
};
CommandShortcut.displayName = "CommandShortcut";

export {Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut};
