"use client";

import {Separator as BaseSeparator} from "@base-ui/react/separator";
import {Search} from "lucide-react";
import * as React from "react";
import {createPortal} from "react-dom";

import {useMergedRefs} from "@/hooks/useMergedRefs";
import {cn} from "@/lib/utilities";
import {isNestedControl, navigationRequest, stepTarget} from "./_command-navigation";
import {orderRegisteredNodes, restoreRegisteredFocus, type RankedNode} from "./_command-order";
import {
  defaultCommandFilter,
  useCommandRegistry,
  useRenderedOrder,
  useVisualOrder,
  type RegisteredGroup,
  type RegisteredItem,
} from "./_command-state";
import {Dialog, DialogContent, DialogDescription, DialogTitle, type DialogProps} from "./dialog";
import {InputGroup, InputGroupAddon} from "./input-group";
import styles from "./command.module.css";

/**
 * Scores an option against the search: a finite positive score matches and higher scores sort first (equal scores keep
 * rendered order); `0`, negative and non-finite scores hide it. `keywords` is a per-call copy.
 */
export type CommandFilter = (value: string, search: string, keywords?: string[]) => number;

/** Command root props. The selected option value is distinct from the CommandInput search. */
export type CommandProps = Readonly<
  React.ComponentPropsWithRef<"div"> & {
    /** Localizable name of the root, and CommandList's fallback name. @default "Commands" */
    label?: string;
    /** Apply the local substring or supplied scoring filter. @default true */
    shouldFilter?: boolean;
    /** Custom option scoring; no cmdk fuzzy ranking is implied. Defaults to a case-insensitive substring match (`1`/`0`). */
    filter?: CommandFilter;
    /** Initial selected option value (not the initial search). @default "" */
    defaultValue?: string;
    /** Controlled selected option value, authoritative even while no visible option matches it; rejected proposals never change it. */
    value?: string;
    /** Selection proposal from pointer, focus or keyboard interaction; never called for the automatic uncontrolled fallback. */
    onValueChange?: (value: string) => void;
    /** Wrap arrow navigation at the endpoints. @default false */
    loop?: boolean;
    /** Prevent hover from selecting items. @default false */
    disablePointerSelection?: boolean;
    /** Enable Ctrl+n/j and Ctrl+p/k navigation. @default true */
    vimBindings?: boolean;
  }
>;

/** Modal shell only: callers provide exactly one explicit Command root. */
export type CommandDialogProps = Readonly<
  Omit<DialogProps, "children"> & {
    ref?: React.Ref<HTMLDivElement>;
    children?: React.ReactNode;
    /** Real accessible dialog title. @default "Command menu" */
    title?: React.ReactNode;
    /** Real accessible description. @default "Search for a command to run..." */
    description?: React.ReactNode;
    /** Popup classes. */
    className?: string;
    /** Append the shared Dialog close control. @default false */
    showCloseButton?: boolean;
    /** Caller-localizable name for the optional dismissal control. @default "Close" */
    closeLabel?: string;
  }
>;

/** Native input props, including name/form/disabled and the committed search value. */
export type CommandInputProps = Readonly<
  Omit<React.ComponentPropsWithRef<"input">, "type" | "value" | "defaultValue"> & {
    /** Committed controlled search. */
    value?: string;
    /** Initial uncontrolled search. @default "" */
    defaultValue?: string;
    /** Search proposal, after a non-cancelled native onChange. */
    onValueChange?: (search: string) => void;
    /**
     * Localizable accessible name applied only when no `aria-label`, `aria-labelledby`, associated `<label>`, `title` or
     * `placeholder` names the input; decided after mount, so server and client markup match. @default "Search commands"
     */
    fallbackLabel?: string;
  }
>;

/** Native listbox props. Its effective id is linked to the combobox. */
export type CommandListProps = Readonly<
  React.ComponentPropsWithRef<"div"> & {
    /** Localizable listbox name used when neither `aria-label` nor `aria-labelledby` is set. Defaults to Command's `label`. */
    label?: string;
  }
>;
/** Native polite status props; the status stays mounted outside the listbox, showing children only with no visible options. */
export type CommandEmptyProps = Readonly<React.ComponentPropsWithRef<"div">>;
/** Registered, labelled group. Hidden descendants stay mounted and searchable. */
export type CommandGroupProps = Readonly<
  React.ComponentPropsWithRef<"div"> & {
    /** Visible heading that names the group through `aria-labelledby` (heading id `${id}-heading`). */
    heading?: React.ReactNode;
    /** Optional group metadata; identity is the group's stable DOM id. */
    value?: string;
    /** Keep this group and its items visible regardless of filtering. @default false */
    forceMount?: boolean;
  }
>;
/** Primitive-owned separator composition, state, orientation and refs. */
export type CommandSeparatorProps = Readonly<
  React.ComponentPropsWithRef<typeof BaseSeparator> & {
    /** Keep separators visible during filtering. @default false */
    alwaysRender?: boolean;
  }
>;
/** Native option props with cancellable consumer events and filtering metadata. */
export type CommandItemProps = Readonly<
  Omit<React.ComponentPropsWithRef<"div">, "onSelect"> & {
    /** Skip this option for navigation and activation. @default false */
    disabled?: boolean;
    /** Activation callback (distinct from the root's selected-value proposal). */
    onSelect?: (value: string) => void;
    /** Filtering/selection value, unique within its Command; defaults to the trimmed text content, CommandShortcut text included. */
    value?: string;
    /** Additional substring/custom-filter search terms. @default [] */
    keywords?: readonly string[];
    /** Keep visible irrespective of scores; inherited from the group. @default false */
    forceMount?: boolean;
  }
>;
/** Native shortcut text props with a forwarded span ref. */
export type CommandShortcutProps = Readonly<React.ComponentPropsWithRef<"span">>;

interface CommandContextValue {
  readonly activeItemId: string | null;
  readonly disablePointerSelection: boolean;
  readonly isFiltering: boolean;
  readonly isItemVisible: (itemId: string) => boolean;
  readonly isRestoringFocus: (element: HTMLElement) => boolean;
  readonly hasVisibleItemsInGroup: (groupId: string) => boolean;
  readonly label: string;
  readonly listId: string;
  readonly listRef: React.RefObject<HTMLDivElement | null>;
  readonly observeOrder: (list: HTMLElement) => () => void;
  readonly registerItem: (item: RegisteredItem) => void;
  readonly unregisterItem: (id: string) => void;
  readonly registerGroup: (group: RegisteredGroup) => void;
  readonly unregisterGroup: (id: string) => void;
  readonly search: string;
  readonly setSearch: (search: string) => void;
  readonly setListId: (id: string) => void;
  readonly selectItem: (id: string) => void;
  readonly verifyOrder: (anchor: Element | null) => void;
  readonly visibleItemCount: number;
}

const CommandContext = React.createContext<CommandContextValue | null>(null);
const CommandGroupContext = React.createContext<Readonly<{id: string; forceMount: boolean; hidden: boolean}> | null>(null);
/** CommandList's empty-status slot beside its listbox: `undefined` outside a list, `null` until the slot mounts. */
const CommandEmptySlotContext = React.createContext<HTMLElement | null | undefined>(undefined);

function useCommandContext(componentName: string): CommandContextValue {
  const context = React.useContext(CommandContext);
  if (!context) throw new Error(`${componentName} must be used within Command.`);
  return context;
}

interface NavigationFocusRequest {
  readonly origin: HTMLElement;
  readonly originId: string;
  readonly targetId: string;
}

/**
 * Searchable command menu root: a native, context-scoped controller for one search input, listbox and its options.
 *
 * @remarks
 * - Client Component; not a cmdk emulation. Renders a `role="toolbar"` div named by `label`, and every other Command part
 *   must render inside it (`CommandDialog` adds no root of its own).
 * - The root's `value`/`defaultValue`/`onValueChange` select an option; `CommandInput` owns the separate search text.
 *   Uncontrolled selection falls back to the first selectable visible option without calling `onValueChange`.
 * - Selection is by value, so give every option a unique `value` within one Command: a duplicate resolves to the first
 *   matching option in visual order, and arrow keys cannot step past it. A missing `value` defaults to the option's trimmed
 *   text (CommandShortcut text included), so set stable explicit values for translated content. Option, group and list ids
 *   default to generated `useId()` ids.
 * - Order: without a search, DOM and keyboard order follow the consumer's rendered order inside CommandList, including
 *   late mounts and keyed reorders. While filtering, matching options sort by descending score with rendered-order ties;
 *   a group ranks by its best visible descendant and keeps its subtree together. Clearing the search restores rendered
 *   order. Keep registered groups/items directly beneath CommandList or CommandGroup so they can be reordered.
 * - A keyed move that re-renders no Command part (memoized rows) is observed by CommandList: DOM placement is corrected in
 *   the observer's microtask and keyboard order in the commit it schedules, so a key handled in that brief, normally
 *   sub-frame window still uses the previous order.
 * - Keys: ArrowUp/ArrowDown step (wrapping with `loop`); Home/End and Meta+arrows reach the ends; Alt+arrows move to the
 *   next/previous group boundary in visual order (entering or leaving a nested group counts; never backwards); Enter
 *   activates; Ctrl+n/j and Ctrl+p/k step while `vimBindings` is on. Nested native controls keep their own keys, and DOM
 *   focus follows the selection only when the key press started on an option.
 *
 * @example
 * ```tsx
 * <Command label='Workspace commands'>
 *   <CommandInput aria-label='Search commands' placeholder='Type a command…' />
 *   <CommandList>
 *     <CommandEmpty>No commands found.</CommandEmpty>
 *     <CommandGroup heading='Files'>
 *       <CommandItem value='new-file' onSelect={createFile}>New file</CommandItem>
 *       <CommandItem value='open-recent' keywords={["history"]} onSelect={openRecent}>Open recent</CommandItem>
 *     </CommandGroup>
 *   </CommandList>
 * </Command>
 * ```
 */
const Command = ({
  ref,
  children,
  className,
  defaultValue = "",
  disablePointerSelection = false,
  filter = defaultCommandFilter,
  label = "Commands",
  loop = false,
  onKeyDown,
  onValueChange,
  shouldFilter = true,
  value,
  vimBindings = true,
  ...props
}: Readonly<CommandProps>): React.JSX.Element => {
  const [selection, setSelection] = React.useState(defaultValue);
  const [search, setSearch] = React.useState("");
  const generatedListId = React.useId();
  const [listId, setListId] = React.useState(generatedListId);
  const navigationFocusRequestRef = React.useRef<NavigationFocusRequest | null>(null);
  const restoringFocusRef = React.useRef<HTMLElement | null>(null);
  const isRestoringFocus = React.useCallback((element: HTMLElement): boolean => {
    const restoring = restoringFocusRef.current;
    return restoring !== null && element.contains(restoring);
  }, []);
  const {registry, registerItem, unregisterItem, registerGroup, unregisterGroup} = useCommandRegistry();
  const {listRef, natural, measureOrder, verifyOrder, observeOrder, drainObservedMoves, reconcileRef} = useRenderedOrder();
  const isFiltering = shouldFilter && search.trim().length > 0;
  const {rankedItems, groupRanks, visibleItems, visibleIds} = useVisualOrder({registry, natural, filter, search, isFiltering});
  const selectableItems = React.useMemo(() => visibleItems.filter((item) => !item.disabled), [visibleItems]);
  const selectedValue = value ?? selection;
  const activeItem = selectableItems.find((item) => item.value === selectedValue) ?? (value === undefined ? selectableItems[0] : undefined);
  const activeItemId = activeItem?.id ?? null;

  // Guarded same-owner reconciliation remembers fallback without an extra effect render.
  const fallbackValue = activeItem?.value ?? "";
  if (value === undefined && registry.revision > 0 && selection !== fallbackValue) setSelection(fallbackValue);
  // Re-measure rendered order (keyed moves can bypass the registry), pin nodes to anchors, then drop the observer's records
  // of these already-handled mutations so Command's own placement never feeds back into the observer.
  const reconcileOrder = (): void => {
    measureOrder();
    const entries = new Map<string, RankedNode>();
    for (const {item, score} of rankedItems) {
      const node = item.ref.current;
      if (node) entries.set(item.id, {node, score});
    }
    for (const group of registry.groups.values()) {
      const node = group.ref.current;
      if (node) entries.set(group.id, {node, score: groupRanks.get(group.id)?.score ?? 0});
    }
    orderRegisteredNodes(entries, isFiltering, (snapshot) => {
      // Restoring this descendant is not a proposal; a caller's handoff to another option still is.
      restoringFocusRef.current = snapshot?.element ?? null;
      try {
        restoreRegisteredFocus(snapshot);
      } finally {
        restoringFocusRef.current = null;
      }
    });
    drainObservedMoves();
  };
  React.useLayoutEffect(() => {
    reconcileRef.current = reconcileOrder;
    reconcileOrder();
  });
  React.useLayoutEffect(() => {
    const request = navigationFocusRequestRef.current;
    if (!request) return;
    if (!request.origin.isConnected || request.origin.ownerDocument.activeElement !== request.origin) {
      navigationFocusRequestRef.current = null;
      return;
    }
    if (activeItemId === request.targetId) {
      navigationFocusRequestRef.current = null;
      activeItem?.ref.current?.focus({preventScroll: true});
    } else if (activeItemId !== request.originId) {
      navigationFocusRequestRef.current = null;
    }
  }, [activeItem, activeItemId]);
  React.useEffect(() => {
    activeItem?.ref.current?.scrollIntoView({block: "nearest"});
  }, [activeItem]);

  const selectItem = React.useCallback(
    (id: string): void => {
      const item = selectableItems.find((candidate) => candidate.id === id);
      if (!item || item.value === selectedValue) return;
      if (value === undefined) setSelection(item.value);
      onValueChange?.(item.value);
    },
    [onValueChange, selectableItems, selectedValue, value],
  );

  const navigateToItem = (item: RegisteredItem, owner: Document): void => {
    const focused = owner.activeElement;
    const origin = focused instanceof HTMLElement ? registry.items.get(focused.id)?.ref.current : null;
    navigationFocusRequestRef.current = origin && origin === focused ? {origin, originId: origin.id, targetId: item.id} : null;
    selectItem(item.id);
    if (navigationFocusRequestRef.current && item.id === activeItemId) {
      navigationFocusRequestRef.current = null;
      item.ref.current?.focus({preventScroll: true});
    }
  };

  const context = React.useMemo<CommandContextValue>(
    () => ({
      activeItemId,
      disablePointerSelection,
      isFiltering,
      isItemVisible: (id) => visibleIds.has(id),
      isRestoringFocus,
      hasVisibleItemsInGroup: (id) => groupRanks.has(id),
      label,
      listId,
      listRef,
      observeOrder,
      registerItem,
      unregisterItem,
      registerGroup,
      unregisterGroup,
      search,
      setSearch,
      setListId,
      selectItem,
      verifyOrder,
      visibleItemCount: visibleIds.size,
    }),
    [
      activeItemId,
      disablePointerSelection,
      isFiltering,
      isRestoringFocus,
      groupRanks,
      label,
      listId,
      listRef,
      registerGroup,
      registerItem,
      observeOrder,
      search,
      selectItem,
      unregisterGroup,
      unregisterItem,
      verifyOrder,
      visibleIds,
    ],
  );

  return (
    <CommandContext.Provider value={context}>
      <div
        ref={ref}
        data-slot='command'
        aria-label={props["aria-label"] ?? label}
        className={cn(styles.command, className)}
        role='toolbar'
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (event.defaultPrevented || isNestedControl(event.target)) return;
          const request = navigationRequest(event, vimBindings);
          if (!request) return;
          if (request.kind === "activate") {
            if (activeItem) {
              event.preventDefault();
              activeItem.ref.current?.click();
            }
            return;
          }
          const item =
            request.kind === "endpoint"
              ? request.direction > 0
                ? selectableItems.at(-1)
                : selectableItems[0]
              : stepTarget(visibleItems, activeItemId, request, loop);
          if (item) {
            event.preventDefault();
            navigateToItem(item, event.currentTarget.ownerDocument);
          }
        }}
        {...props}>
        {children}
      </div>
    </CommandContext.Provider>
  );
};
Command.displayName = "Command";

/**
 * Modal shell for a command palette: the shared Dialog with a real, visually hidden title and description.
 *
 * @remarks
 * - Client Component built on the package `Dialog`; root props (`open`, `onOpenChange`, `modal`, …) pass through and `ref`
 *   targets the popup. It adds no Command root: place exactly one `Command` inside.
 * - `title` (default "Command menu") and `description` (default "Search for a command to run...") name and describe the
 *   dialog; localize both.
 * - The modal dialog traps focus, so keep a close control inside it for touch screen-reader users: `showCloseButton`
 *   (off by default, named by `closeLabel`) or an option that closes the dialog. Escape still dismisses it.
 *
 * @example
 * ```tsx
 * <CommandDialog open={open} onOpenChange={setOpen} title='Command palette' showCloseButton closeLabel='Close palette'>
 *   <Command>
 *     <CommandInput aria-label='Search commands' placeholder='Type a command…' />
 *     <CommandList>
 *       <CommandItem value='settings' onSelect={openSettings}>Settings</CommandItem>
 *     </CommandList>
 *   </Command>
 * </CommandDialog>
 * ```
 */
const CommandDialog = ({
  ref,
  children,
  title = "Command menu",
  description = "Search for a command to run...",
  className,
  showCloseButton = false,
  closeLabel,
  ...props
}: Readonly<CommandDialogProps>): React.JSX.Element => (
  <Dialog {...props}>
    <DialogContent
      ref={ref}
      className={cn(styles.dialogPopup, className)}
      showCloseButton={showCloseButton}
      closeLabel={closeLabel}>
      <DialogTitle className={cn(styles.srOnly)}>{title}</DialogTitle>
      <DialogDescription className={cn(styles.srOnly)}>{description}</DialogDescription>
      {children}
    </DialogContent>
  </Dialog>
);
CommandDialog.displayName = "CommandDialog";

/**
 * Search field of a Command: a native text input with combobox semantics inside the shared InputGroup chrome.
 *
 * @remarks
 * - Client Component; must render inside `Command`. Focus stays here while arrow keys move the active option, exposed
 *   through `aria-activedescendant`; `aria-controls` points at CommandList's id.
 * - `value`/`defaultValue`/`onValueChange` own the search text, separately from the root's selected value. Your `onChange`
 *   runs first, and `preventDefault()` there cancels the change.
 * - Name it with a `<label>`, `aria-label`, `aria-labelledby`, `title` or `placeholder`. Only when nothing names it after
 *   mount does `fallbackLabel` (default "Search commands") apply, so server and client markup match; localize it.
 * - Native `name`, `form`, `disabled` and `id` are kept; the search icon is decorative.
 *
 * @example
 * ```tsx
 * <Command>
 *   <label htmlFor='palette-search'>Search commands</label>
 *   <CommandInput id='palette-search' placeholder='Type a command…' />
 *   <CommandList>
 *     <CommandItem value='rename'>Rename</CommandItem>
 *   </CommandList>
 * </Command>
 * ```
 */
const CommandInput = ({
  ref,
  className,
  fallbackLabel = "Search commands",
  onChange,
  onValueChange,
  value,
  defaultValue = "",
  ...props
}: Readonly<CommandInputProps>): React.JSX.Element => {
  const {activeItemId, listId, setSearch} = useCommandContext("CommandInput");
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  const inputValue = value ?? uncontrolledValue;
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const mergedRef = useMergedRefs(inputRef, ref);
  const [unnamed, setUnnamed] = React.useState(false);
  const namedByProps = [props["aria-label"], props["aria-labelledby"], props.title, props.placeholder].some((source) =>
    Boolean(source?.trim()),
  );
  React.useLayoutEffect(() => {
    setSearch(inputValue);
  }, [inputValue, setSearch]);
  // An associated <label> exists only in the DOM, so the fallback name is decided after commit, never during render.
  React.useLayoutEffect(() => {
    setUnnamed(!namedByProps && !inputRef.current?.labels?.length);
  }, [namedByProps, props.id]);
  return (
    <div
      data-slot='command-input-wrapper'
      className={styles.inputWrapper}>
      <InputGroup className={styles.inputGroup}>
        <input
          ref={mergedRef}
          data-slot='command-input'
          aria-label={unnamed && fallbackLabel ? fallbackLabel : undefined}
          aria-activedescendant={activeItemId ?? undefined}
          aria-autocomplete='list'
          aria-controls={listId}
          aria-expanded='true'
          className={cn(styles.input, className)}
          onChange={(event) => {
            onChange?.(event);
            if (event.defaultPrevented) return;
            const proposal = event.currentTarget.value;
            if (value === undefined) setUncontrolledValue(proposal);
            onValueChange?.(proposal);
          }}
          role='combobox'
          type='text'
          value={inputValue}
          {...props}
        />
        <InputGroupAddon>
          <Search
            aria-hidden='true'
            className={styles.searchIcon}
          />
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
};
CommandInput.displayName = "CommandInput";

/**
 * Listbox of a Command that holds its options and groups and hosts the slot for CommandEmpty's status.
 *
 * @remarks
 * - Client Component; render one inside `Command`. Its id (yours or a generated one) is committed back to the input's
 *   `aria-controls`. Named by `aria-label`, `aria-labelledby`, `label`, or else Command's `label`.
 * - CommandEmpty rendered inside it is portaled into a slot just before the listbox, so the listbox owns only options and
 *   groups. The active option is scrolled into view.
 * - It observes its subtree for keyed moves that re-render no Command part and re-reads their order; content, text and
 *   attribute changes inside options never trigger a re-read.
 *
 * @example
 * ```tsx
 * <CommandList label='Results'>
 *   <CommandEmpty>No results.</CommandEmpty>
 *   {results.map((result) => (
 *     <CommandItem key={result.id} value={result.id}>
 *       {result.title}
 *     </CommandItem>
 *   ))}
 * </CommandList>
 * ```
 */
const CommandList = ({ref, children, className, label, id, ...props}: Readonly<CommandListProps>): React.JSX.Element => {
  const {listId, listRef, observeOrder, setListId, label: rootLabel} = useCommandContext("CommandList");
  const mergedRef = useMergedRefs(listRef, ref);
  const generatedId = React.useId();
  const effectiveId = id ?? generatedId;
  const [emptySlot, setEmptySlot] = React.useState<HTMLDivElement | null>(null);
  React.useLayoutEffect(() => {
    setListId(effectiveId);
  }, [effectiveId, setListId]);
  React.useLayoutEffect(() => {
    const list = listRef.current;
    return list ? observeOrder(list) : undefined;
  }, [listRef, observeOrder]);
  return (
    <>
      <div
        ref={setEmptySlot}
        data-slot='command-empty-slot'
        className={styles.emptySlot}
      />
      <div
        ref={mergedRef}
        data-slot='command-list'
        aria-label={props["aria-label"] ?? (props["aria-labelledby"] ? undefined : (label ?? rootLabel))}
        className={cn(styles.list, className)}
        id={listId}
        role='listbox'
        {...props}>
        <CommandEmptySlotContext.Provider value={emptySlot}>{children}</CommandEmptySlotContext.Provider>
      </div>
    </>
  );
};
CommandList.displayName = "CommandList";

/**
 * Polite "no results" status of a Command; its children show only while no option is visible.
 *
 * @remarks
 * - Client Component; must render inside `Command`. The `role="status"` region (`aria-live="polite"`, `aria-atomic`) stays
 *   mounted while it is rendered and only its children toggle, so the message is announced as a content change. It takes
 *   no space while empty. Do not hide or conditionally render it; change its children instead.
 * - Inside CommandList it is portaled into a slot just before the listbox after mount (server HTML has no region); outside
 *   a list it renders in place from the first render.
 * - Force-mounted and disabled options count as visible; options or groups hidden with `hidden` do not.
 *
 * @example
 * ```tsx
 * <CommandList>
 *   <CommandEmpty>No matching commands.</CommandEmpty>
 *   <CommandItem value='rename'>Rename</CommandItem>
 * </CommandList>
 * ```
 */
const CommandEmpty = ({ref, children, className, ...props}: Readonly<CommandEmptyProps>): React.JSX.Element | null => {
  const {visibleItemCount} = useCommandContext("CommandEmpty");
  const slot = React.useContext(CommandEmptySlotContext);
  const status = (
    <div
      ref={ref}
      data-slot='command-empty'
      className={cn(styles.empty, className)}
      role='status'
      aria-live='polite'
      aria-atomic='true'
      {...props}>
      {visibleItemCount === 0 ? children : null}
    </div>
  );
  // Outside a list the region already sits outside the listbox; inside one it waits for the client-only slot.
  if (slot === undefined) return status;
  return slot ? createPortal(status, slot) : null;
};
CommandEmpty.displayName = "CommandEmpty";

/** Hidden, empty, never-moved position anchor that React renders first for each group/option, outside the accessibility tree. */
function CommandOrderAnchor({id}: Readonly<{id: string}>): React.JSX.Element {
  const {verifyOrder} = useCommandContext("CommandOrderAnchor");
  const anchorRef = React.useRef<HTMLSpanElement | null>(null);
  React.useLayoutEffect(() => {
    verifyOrder(anchorRef.current);
  });
  return (
    <span
      ref={anchorRef}
      hidden
      aria-hidden='true'
      className={styles.anchor}
      data-command-anchor={id}
    />
  );
}

/**
 * Labelled group of options, or of nested groups, inside a CommandList.
 *
 * @remarks
 * - Client Component; must render inside `Command`, directly beneath CommandList or another CommandGroup. Renders
 *   `role="group"` named by `heading` unless you pass `aria-labelledby`; name a headingless group with `aria-label`.
 * - While filtering, a group ranks by its best visible descendant, keeps its subtree together and is hidden when nothing
 *   in it matches; `forceMount` keeps it and its descendants visible. `hidden` removes it and its descendants from
 *   navigation and empty counts while keeping their registrations and state.
 * - `id` defaults to a generated id; `value` is optional metadata exposed as `data-value`.
 * - A hidden, empty position anchor renders right before it; consumer `:first-child`, `:nth-child` and adjacent-sibling
 *   selectors must account for it.
 *
 * @example
 * ```tsx
 * <CommandGroup heading='Recent'>
 *   <CommandItem value='q3-report'>Q3 report</CommandItem>
 *   <CommandGroup heading='Pinned'>
 *     <CommandItem value='roadmap'>Roadmap</CommandItem>
 *   </CommandGroup>
 * </CommandGroup>
 * ```
 */
const CommandGroup = ({
  ref,
  children,
  className,
  forceMount = false,
  heading,
  hidden,
  id,
  value,
  ...props
}: Readonly<CommandGroupProps>): React.JSX.Element => {
  const generatedId = React.useId();
  const groupId = id ?? generatedId;
  const headingId = `${groupId}-heading`;
  const parent = React.useContext(CommandGroupContext);
  const inheritedForceMount = forceMount || (parent?.forceMount ?? false);
  const externallyHidden = Boolean(hidden || parent?.hidden);
  const {hasVisibleItemsInGroup, isFiltering, registerGroup, unregisterGroup} = useCommandContext("CommandGroup");
  const groupRef = React.useRef<HTMLDivElement | null>(null);
  const mergedRef = useMergedRefs(groupRef, ref);
  const groupContext = React.useMemo(
    () => ({id: groupId, forceMount: inheritedForceMount, hidden: externallyHidden}),
    [externallyHidden, groupId, inheritedForceMount],
  );
  React.useLayoutEffect(() => {
    registerGroup({id: groupId, parentId: parent?.id ?? null, ref: groupRef});
    return () => {
      unregisterGroup(groupId);
    };
  }, [groupId, parent?.id, registerGroup, unregisterGroup]);
  return (
    <CommandGroupContext.Provider value={groupContext}>
      <CommandOrderAnchor id={groupId} />
      <div
        ref={mergedRef}
        id={groupId}
        role='group'
        aria-labelledby={props["aria-labelledby"] ?? (heading !== undefined && heading !== null ? headingId : undefined)}
        className={cn(styles.group, className)}
        data-slot='command-group'
        data-command-group=''
        data-value={value}
        hidden={hidden || externallyHidden || (!inheritedForceMount && isFiltering && !hasVisibleItemsInGroup(groupId))}
        {...props}>
        {heading !== undefined && heading !== null ? (
          <div
            id={headingId}
            className={styles.groupHeading}>
            {heading}
          </div>
        ) : null}
        {children}
      </div>
    </CommandGroupContext.Provider>
  );
};
CommandGroup.displayName = "CommandGroup";

/**
 * Divider between Command groups, built on Base UI Separator.
 *
 * @remarks
 * - Client Component; must render inside `Command`. Not rendered while a search filters the list, because filtered groups
 *   move, unless `alwaysRender` is set.
 * - `orientation` defaults to `"horizontal"`; `render`, refs and `className` callbacks keep Base UI Separator state.
 *
 * @example
 * ```tsx
 * <CommandList>
 *   <CommandGroup heading='Edit'>
 *     <CommandItem value='copy'>Copy</CommandItem>
 *   </CommandGroup>
 *   <CommandSeparator />
 *   <CommandGroup heading='View'>
 *     <CommandItem value='zoom-in'>Zoom in</CommandItem>
 *   </CommandGroup>
 * </CommandList>
 * ```
 */
const CommandSeparator = ({
  ref,
  alwaysRender = false,
  className,
  orientation = "horizontal",
  ...props
}: Readonly<CommandSeparatorProps>): React.JSX.Element | null => {
  const {isFiltering} = useCommandContext("CommandSeparator");
  if (isFiltering && !alwaysRender) return null;
  return (
    <BaseSeparator
      ref={ref}
      data-slot='command-separator'
      className={typeof className === "function" ? (state) => cn(styles.separator, className(state)) : cn(styles.separator, className)}
      orientation={orientation}
      {...props}
    />
  );
};
CommandSeparator.displayName = "CommandSeparator";

const EMPTY_KEYWORDS: readonly string[] = [];

/**
 * Selectable option of a Command: a native, focusable `role="option"` element.
 *
 * @remarks
 * - Client Component; must render inside `Command`, directly beneath CommandList or CommandGroup for score ordering.
 * - `value` selects and filters it and must be unique within its Command; it defaults to the trimmed text content,
 *   CommandShortcut text included. `keywords` add search terms; `id` defaults to a generated id used by
 *   `aria-activedescendant`.
 * - Click, Enter and Space select it and call `onSelect(value)` after your handlers, unless they call `preventDefault()`.
 *   Hover (unless `disablePointerSelection`) and focus propose it as the selected value. Nested buttons, links and fields
 *   keep their own keys and clicks.
 * - `disabled` keeps it visible but skips it in navigation and activation; `hidden` removes it from navigation and empty
 *   counts while keeping its registration and state; `forceMount` (also inherited from a group) keeps it visible while
 *   filtering.
 * - A hidden, empty position anchor renders right before it.
 *
 * @example
 * ```tsx
 * <CommandItem value='open-settings' keywords={["preferences"]} onSelect={openSettings}>
 *   <Settings aria-hidden='true' />
 *   Settings
 *   <CommandShortcut>⌘,</CommandShortcut>
 * </CommandItem>
 * ```
 */
const CommandItem = ({
  ref,
  children,
  className,
  disabled = false,
  forceMount = false,
  hidden,
  keywords = EMPTY_KEYWORDS,
  onClick,
  onKeyDown,
  onFocus,
  onMouseEnter,
  onSelect,
  value,
  id,
  ...props
}: Readonly<CommandItemProps>): React.JSX.Element => {
  const {activeItemId, disablePointerSelection, isFiltering, isItemVisible, isRestoringFocus, registerItem, selectItem, unregisterItem} =
    useCommandContext("CommandItem");
  const group = React.useContext(CommandGroupContext);
  const generatedId = React.useId();
  const itemId = id ?? generatedId;
  const itemRef = React.useRef<HTMLDivElement | null>(null);
  const mergedRef = useMergedRefs(itemRef, ref);
  const inheritedForceMount = forceMount || (group?.forceMount ?? false);
  const externallyHidden = Boolean(hidden || group?.hidden);
  React.useLayoutEffect(() => {
    registerItem({
      disabled,
      forceMount: inheritedForceMount,
      hidden: externallyHidden,
      groupId: group?.id ?? null,
      id: itemId,
      keywords,
      ref: itemRef,
      value: value ?? itemRef.current?.textContent?.trim() ?? "",
    });
  }, [children, disabled, externallyHidden, group?.id, inheritedForceMount, itemId, keywords, registerItem, value]);
  React.useLayoutEffect(
    () => () => {
      unregisterItem(itemId);
    },
    [itemId, unregisterItem],
  );
  const isVisible = !externallyHidden && (inheritedForceMount || !isFiltering || isItemVisible(itemId));
  const isSelected = activeItemId === itemId;
  return (
    <>
      <CommandOrderAnchor id={itemId} />
      <div
        ref={mergedRef}
        data-slot='command-item'
        aria-disabled={disabled || undefined}
        aria-selected={isSelected}
        className={cn(styles.item, className)}
        data-disabled={disabled ? "true" : undefined}
        data-selected={isSelected ? "true" : undefined}
        hidden={hidden || !isVisible}
        id={itemId}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented || isNestedControl(event.target)) return;
          if (disabled || !isVisible) {
            event.preventDefault();
            return;
          }
          selectItem(itemId);
          onSelect?.(value ?? itemRef.current?.textContent?.trim() ?? "");
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (
            event.defaultPrevented
            || isNestedControl(event.target)
            || event.nativeEvent.isComposing
            || event.ctrlKey
            || event.altKey
            || event.metaKey
            || event.shiftKey
          )
            return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (!disabled && isVisible) event.currentTarget.click();
          }
        }}
        onFocus={(event) => {
          onFocus?.(event);
          if (!event.defaultPrevented && !isRestoringFocus(event.currentTarget) && !isNestedControl(event.target) && !disabled && isVisible)
            selectItem(itemId);
        }}
        onMouseEnter={(event) => {
          onMouseEnter?.(event);
          if (!event.defaultPrevented && !disabled && isVisible && !disablePointerSelection) selectItem(itemId);
        }}
        role='option'
        tabIndex={disabled ? -1 : (props.tabIndex ?? 0)}
        {...props}>
        {children}
      </div>
    </>
  );
};
CommandItem.displayName = "CommandItem";

/**
 * Keyboard-shortcut hint shown at the end of a CommandItem.
 *
 * @remarks
 * - Presentational `<span>` only: it registers no key binding. Wire the shortcut yourself, and expose it with
 *   `aria-keyshortcuts` on the item when it works.
 * - Its text becomes part of the option's accessible name and of an inferred `value`, so give the item an explicit `value`.
 *
 * @example
 * ```tsx
 * <CommandItem value='save' aria-keyshortcuts='Control+S'>
 *   Save
 *   <CommandShortcut>Ctrl+S</CommandShortcut>
 * </CommandItem>
 * ```
 */
const CommandShortcut = ({ref, className, ...props}: Readonly<CommandShortcutProps>): React.JSX.Element => (
  <span
    ref={ref}
    data-slot='command-shortcut'
    className={cn(styles.shortcut, className)}
    {...props}
  />
);
CommandShortcut.displayName = "CommandShortcut";

/* eslint-disable no-redeclare, sonarjs/redundant-type-aliases -- canonical component namespace typing API */
namespace Command {
  export type Props = CommandProps;
}
namespace CommandDialog {
  export type Props = CommandDialogProps;
  export type State = Dialog.State;
}
namespace CommandInput {
  export type Props = CommandInputProps;
}
namespace CommandList {
  export type Props = CommandListProps;
}
namespace CommandEmpty {
  export type Props = CommandEmptyProps;
}
namespace CommandGroup {
  export type Props = CommandGroupProps;
}
namespace CommandSeparator {
  export type Props = CommandSeparatorProps;
  export type State = BaseSeparator.State;
}
namespace CommandItem {
  export type Props = CommandItemProps;
}
namespace CommandShortcut {
  export type Props = CommandShortcutProps;
}
/* eslint-enable no-redeclare, sonarjs/redundant-type-aliases */

export {Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut};
