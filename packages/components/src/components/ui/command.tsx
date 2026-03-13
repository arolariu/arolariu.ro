"use client";

import {Dialog as BaseDialog} from "@base-ui/react/dialog";
import {Separator as BaseSeparator} from "@base-ui/react/separator";
import {Search} from "lucide-react";
import * as React from "react";

import {cn} from "@/lib/utilities";

import styles from "./command.module.css";

type CommandFilter = (value: string, search: string, keywords?: string[]) => number;

interface CommandProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  label?: string;
  shouldFilter?: boolean;
  filter?: CommandFilter;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  loop?: boolean;
  disablePointerSelection?: boolean;
  vimBindings?: boolean;
}

interface CommandDialogProps extends Omit<React.ComponentPropsWithoutRef<typeof BaseDialog.Root>, "children"> {
  children?: React.ReactNode;
  title?: React.ReactNode;
}

interface CommandInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "type" | "value"> {
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  onValueChange?: (search: string) => void;
}

interface CommandListProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  label?: string;
}

interface CommandGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "value"> {
  children?: React.ReactNode;
  heading?: React.ReactNode;
  value?: string;
  forceMount?: boolean;
}

interface CommandSeparatorProps extends React.ComponentPropsWithoutRef<typeof BaseSeparator> {
  alwaysRender?: boolean;
}

interface CommandItemProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  children?: React.ReactNode;
  disabled?: boolean;
  onSelect?: (value: string) => void;
  value?: string;
  keywords?: string[];
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
    const itemOrderReference = React.useRef(0);
    const itemsReference = React.useRef(new Map<string, CommandRegisteredItem>());
    const [itemsVersion, setItemsVersion] = React.useState(0);
    const listId = React.useId();

    const registerItem = React.useCallback((item: Omit<CommandRegisteredItem, "order">): void => {
      const existingItem = itemsReference.current.get(item.id);
      const nextItem: CommandRegisteredItem = {
        ...item,
        order: existingItem?.order ?? itemOrderReference.current++,
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

      itemsReference.current.set(item.id, nextItem);
      setItemsVersion((currentVersion) => currentVersion + 1);
    }, []);

    const unregisterItem = React.useCallback((itemId: string): void => {
      if (!itemsReference.current.delete(itemId)) {
        return;
      }

      setItemsVersion((currentVersion) => currentVersion + 1);
    }, []);

    const items = React.useMemo(() => {
      return [...itemsReference.current.values()].sort((firstItem, secondItem) => firstItem.order - secondItem.order);
    }, [itemsVersion]);

    const isFiltering = shouldFilter && search.trim().length > 0;

    const isItemVisible = React.useCallback(
      (itemId: string): boolean => {
        const item = itemsReference.current.get(itemId);

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
        setActiveItemId(null);
        return;
      }

      if (!activeItemId || !selectableItems.some((item) => item.id === activeItemId)) {
        setActiveItemId(selectableItems[0].id);
      }
    }, [activeItemId, selectableItems]);

    React.useEffect(() => {
      if (!activeItemId) {
        return;
      }

      itemsReference.current.get(activeItemId)?.ref.current?.scrollIntoView({
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

      itemsReference.current.get(activeItemId)?.ref.current?.click();
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
 * Renders the command palette inside a Base UI dialog popup.
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
 */
const CommandItem = React.forwardRef<HTMLDivElement, CommandItemProps>(
  ({children, className, disabled = false, forceMount = false, keywords = [], onClick, onMouseEnter, onSelect, value, ...props}, ref) => {
    const {activeItemId, disablePointerSelection, isFiltering, isItemVisible, registerItem, selectSpecificItem, unregisterItem} =
      useCommandContext("CommandItem");
    const groupId = React.useContext(CommandGroupContext);
    const generatedId = React.useId();
    const itemReference = React.useRef<HTMLDivElement | null>(null);
    const keywordSignature = React.useMemo(() => keywords.join("\u0000"), [keywords]);

    React.useLayoutEffect(() => {
      const textValue = value ?? itemReference.current?.textContent?.trim() ?? "";

      registerItem({
        disabled,
        forceMount,
        groupId,
        id: generatedId,
        keywords,
        ref: itemReference,
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
          itemReference.current = node;
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
          onSelect?.(value ?? itemReference.current?.textContent?.trim() ?? "");
          onClick?.(event);
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
