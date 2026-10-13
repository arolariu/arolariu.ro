import * as React from "react";

import {act, fireEvent, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "./command";

describe("Command", () => {
  it("keeps option-origin ArrowDown/Home/End focus and Enter/Space activation coherent", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <Command>
        <CommandList>
          <CommandItem
            value='first'
            onSelect={onSelect}>
            First
          </CommandItem>
          <CommandItem
            value='disabled'
            disabled
            onSelect={onSelect}>
            Disabled
          </CommandItem>
          <CommandItem
            value='second'
            onSelect={onSelect}>
            Second
          </CommandItem>
          <CommandItem
            value='last'
            onSelect={onSelect}>
            Last
          </CommandItem>
        </CommandList>
      </Command>,
    );
    const first = screen.getByRole("option", {name: "First"});
    const second = screen.getByRole("option", {name: "Second"});
    const last = screen.getByRole("option", {name: "Last"});
    act(() => first.focus());
    await user.keyboard("{ArrowDown}");
    expect(second).toHaveFocus();
    expect(second).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{Enter}{Home}");
    expect(first).toHaveFocus();
    expect(first).toHaveAttribute("aria-selected", "true");
    await user.keyboard(" ");
    await user.keyboard("{End}");
    expect(last).toHaveFocus();
    expect(last).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{Enter}{ArrowUp}");
    expect(second).toHaveFocus();
    expect(onSelect.mock.calls.map(([value]) => value)).toEqual(["second", "first", "last"]);
  });

  it("moves option focus only when the controlled selected-value proposal commits", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const onSelect = vi.fn();
    const fixture = (value: string): React.JSX.Element => (
      <Command
        value={value}
        onValueChange={onValueChange}>
        <CommandList>
          <CommandItem
            value='first'
            onSelect={onSelect}>
            First
          </CommandItem>
          <CommandItem
            value='second'
            onSelect={onSelect}>
            Second
          </CommandItem>
        </CommandList>
      </Command>
    );
    const {rerender} = render(fixture("first"));
    const first = screen.getByRole("option", {name: "First"});
    const second = screen.getByRole("option", {name: "Second"});
    act(() => first.focus());
    await user.keyboard("{ArrowDown}");
    expect(onValueChange).toHaveBeenLastCalledWith("second");
    expect(first).toHaveFocus();
    expect(first).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenLastCalledWith("first");
    await user.keyboard("{ArrowDown}");
    rerender(fixture("first"));
    expect(first).toHaveFocus();
    rerender(fixture("second"));
    expect(second).toHaveFocus();
    expect(second).toHaveAttribute("aria-selected", "true");
    await user.keyboard(" ");
    expect(onSelect).toHaveBeenLastCalledWith("second");
  });

  it("moves actual option focus for a synchronously accepted controlled keyboard proposal", async () => {
    const user = userEvent.setup();
    function Fixture(): React.JSX.Element {
      const [value, setValue] = React.useState("first");
      return (
        <Command
          value={value}
          onValueChange={setValue}>
          <CommandList>
            <CommandItem value='first'>First</CommandItem>
            <CommandItem value='second'>Second</CommandItem>
          </CommandList>
        </Command>
      );
    }
    render(<Fixture />);
    act(() => screen.getByRole("option", {name: "First"}).focus());
    await user.keyboard("{ArrowDown}");
    const second = screen.getByRole("option", {name: "Second"});
    expect(second).toHaveFocus();
    expect(second).toHaveAttribute("aria-selected", "true");
  });

  it("does not steal native focus moved outside while a controlled keyboard proposal is pending", async () => {
    const user = userEvent.setup();
    const fixture = (value: string): React.JSX.Element => (
      <>
        <button type='button'>Outside</button>
        <Command value={value}>
          <CommandList>
            <CommandItem value='first'>First</CommandItem>
            <CommandItem value='second'>Second</CommandItem>
          </CommandList>
        </Command>
      </>
    );
    const {rerender} = render(fixture("first"));
    act(() => screen.getByRole("option", {name: "First"}).focus());
    await user.keyboard("{ArrowDown}");
    await user.click(screen.getByRole("button", {name: "Outside"}));
    rerender(fixture("second"));
    expect(screen.getByRole("button", {name: "Outside"})).toHaveFocus();
    expect(screen.getByRole("option", {name: "Second"})).toHaveAttribute("aria-selected", "true");
  });

  it("keeps the combobox focused while committed navigation changes its active descendant", async () => {
    const user = userEvent.setup();
    render(
      <Command>
        <CommandInput aria-label='Search commands' />
        <CommandList>
          <CommandItem value='first'>First</CommandItem>
          <CommandItem value='second'>Second</CommandItem>
        </CommandList>
      </Command>,
    );
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.keyboard("{ArrowDown}{Home}{End}");
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute("aria-activedescendant", screen.getByRole("option", {name: "Second"}).id);
  });

  it.each(["root", "item"] as const)("keeps actual option focus when a %s keyboard consumer cancels navigation", async (boundary) => {
    const user = userEvent.setup();
    const cancel: React.KeyboardEventHandler<HTMLDivElement> = (event) => event.preventDefault();
    render(
      <Command onKeyDown={boundary === "root" ? cancel : undefined}>
        <CommandList>
          <CommandItem
            value='first'
            onKeyDown={boundary === "item" ? cancel : undefined}>
            First
          </CommandItem>
          <CommandItem value='second'>Second</CommandItem>
        </CommandList>
      </Command>,
    );
    const first = screen.getByRole("option", {name: "First"});
    act(() => first.focus());
    await user.keyboard("{ArrowDown}");
    expect(first).toHaveFocus();
    expect(first).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", {name: "Second"})).toHaveAttribute("aria-selected", "false");
  });

  it.each(["items", "groups"] as const)("retains the focused option and committed selection when scored %s reorder", async (kind) => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const fixture = (preferSecond: boolean): React.JSX.Element => (
      <Command filter={(value) => ((value === "second") === preferSecond ? 0.9 : 0.1)}>
        <CommandInput
          defaultValue='query'
          aria-label='Search commands'
        />
        <CommandList>
          {kind === "groups" ? (
            <>
              <CommandGroup heading='A'>
                <CommandItem
                  value='first'
                  onSelect={onSelect}>
                  First
                </CommandItem>
              </CommandGroup>
              <CommandGroup heading='B'>
                <CommandItem
                  value='second'
                  onSelect={onSelect}>
                  Second
                </CommandItem>
              </CommandGroup>
            </>
          ) : (
            <>
              <CommandItem
                value='first'
                onSelect={onSelect}>
                First
              </CommandItem>
              <CommandItem
                value='second'
                onSelect={onSelect}>
                Second
              </CommandItem>
            </>
          )}
        </CommandList>
      </Command>
    );
    const {rerender} = render(fixture(false));
    const first = screen.getByRole("option", {name: "First"});
    act(() => first.focus());
    rerender(fixture(true));
    expect(screen.getAllByRole("option").map((item) => item.textContent)).toEqual(["Second", "First"]);
    expect(first.isConnected).toBe(true);
    expect(first).toHaveFocus();
    expect(first).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{Home}{Enter}");
    expect(screen.getByRole("option", {name: "Second"})).toHaveFocus();
    expect(onSelect).toHaveBeenLastCalledWith("second");
  });

  it.each(["input", "textarea"] as const)(
    "retains real nested %s focus and its native text selection when its scored group moves",
    (kind) => {
      const fixture = (preferSecond: boolean): React.JSX.Element => (
        <Command filter={(value) => ((value === "second") === preferSecond ? 0.9 : 0.1)}>
          <CommandInput
            defaultValue='query'
            aria-label='Search commands'
          />
          <CommandList>
            <CommandGroup heading='A'>
              <CommandItem
                value='first'
                aria-label='First'>
                First
                {kind === "input" ? (
                  <input
                    aria-label='Inline notes'
                    defaultValue='abcdef'
                  />
                ) : (
                  <textarea
                    aria-label='Inline notes'
                    defaultValue='abcdef'
                  />
                )}
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading='B'>
              <CommandItem value='second'>Second</CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      );
      const {rerender} = render(fixture(false));
      const notes = screen.getByRole("textbox", {name: "Inline notes"});
      if (!(notes instanceof HTMLInputElement) && !(notes instanceof HTMLTextAreaElement))
        throw new Error("Expected the real native notes control.");
      act(() => {
        notes.focus();
        notes.setSelectionRange(1, 4, "backward");
      });
      rerender(fixture(true));
      expect(screen.getAllByRole("option").map((item) => item.getAttribute("aria-label") ?? item.textContent)).toEqual(["Second", "First"]);
      expect(notes).toHaveFocus();
      expect(notes.selectionStart).toBe(1);
      expect(notes.selectionEnd).toBe(4);
      expect(notes.selectionDirection).toBe("backward");
    },
  );

  it("honors a real child focus handler handing focus outside during group-order restoration", () => {
    const outsideRef = React.createRef<HTMLButtonElement>();
    const fixture = (preferSecond: boolean): React.JSX.Element => (
      <>
        <button
          type='button'
          ref={outsideRef}>
          Outside
        </button>
        <Command filter={(value) => ((value === "second") === preferSecond ? 0.9 : 0.1)}>
          <CommandInput
            defaultValue='query'
            aria-label='Search commands'
          />
          <CommandList>
            <CommandGroup heading='A'>
              <CommandItem
                value='first'
                aria-label='First'>
                First
                <input
                  aria-label='Inline notes'
                  onFocus={(event) => {
                    if (preferSecond) {
                      event.preventDefault();
                      outsideRef.current?.focus();
                    }
                  }}
                />
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading='B'>
              <CommandItem value='second'>Second</CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </>
    );
    const {rerender} = render(fixture(false));
    act(() => screen.getByRole("textbox", {name: "Inline notes"}).focus());
    rerender(fixture(true));
    expect(screen.getByRole("button", {name: "Outside"})).toHaveFocus();
    expect(screen.getByRole("option", {name: "First"})).toHaveAttribute("aria-selected", "true");
  });

  it("allows a caller focus handoff to select a different real option during score restoration", () => {
    const secondRef = React.createRef<HTMLDivElement>();
    const fixture = (preferSecond: boolean): React.JSX.Element => (
      <Command filter={(value) => ((value === "second") === preferSecond ? 0.9 : 0.1)}>
        <CommandInput
          defaultValue='query'
          aria-label='Search commands'
        />
        <CommandList>
          <CommandGroup heading='A'>
            <CommandItem
              value='first'
              onFocus={() => {
                if (preferSecond) secondRef.current?.focus();
              }}>
              First
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading='B'>
            <CommandItem
              value='second'
              ref={secondRef}>
              Second
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    );
    const {rerender} = render(fixture(false));
    act(() => screen.getByRole("option", {name: "First"}).focus());
    rerender(fixture(true));
    const second = screen.getByRole("option", {name: "Second"});
    expect(second).toHaveFocus();
    expect(second).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", {name: "First"})).toHaveAttribute("aria-selected", "false");
  });

  it("does not emit a new selection proposal while restoring a controlled option after a group move", () => {
    const onValueChange = vi.fn();
    const fixture = (preferSecond: boolean): React.JSX.Element => (
      <Command
        value='second'
        onValueChange={onValueChange}
        filter={(value) => ((value === "second") === preferSecond ? 0.9 : 0.1)}>
        <CommandInput
          defaultValue='query'
          aria-label='Search commands'
        />
        <CommandList>
          <CommandGroup heading='A'>
            <CommandItem value='first'>First</CommandItem>
          </CommandGroup>
          <CommandGroup heading='B'>
            <CommandItem value='second'>Second</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    );
    const {rerender} = render(fixture(false));
    const first = screen.getByRole("option", {name: "First"});
    act(() => first.focus());
    onValueChange.mockClear();
    rerender(fixture(true));
    expect(first).toHaveFocus();
    expect(screen.getByRole("option", {name: "Second"})).toHaveAttribute("aria-selected", "true");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("composes Separator class callbacks with actual primitive-owned orientation state", () => {
    const className = vi.fn((state: CommandSeparator.State) => `consumer-${state.orientation}`);
    const fixture = (orientation: CommandSeparator.State["orientation"]): React.JSX.Element => (
      <Command>
        <CommandList>
          <CommandSeparator
            orientation={orientation}
            className={className}
          />
        </CommandList>
      </Command>
    );
    const {rerender} = render(fixture("vertical"));
    const separator = screen.getByRole("separator");
    expect(className).toHaveBeenCalledWith({orientation: "vertical"});
    expect(separator).toHaveClass("consumer-vertical");
    expect(separator.classList.length).toBeGreaterThan(1);
    rerender(fixture("horizontal"));
    expect(className).toHaveBeenCalledWith({orientation: "horizontal"});
    expect(separator).toHaveClass("consumer-horizontal");
    expect(separator).not.toHaveClass("consumer-vertical");
    expect(separator.classList.length).toBeGreaterThan(1);
  });

  it("does not let consumer-hidden scores boost a visible group's rank", () => {
    render(
      <Command filter={(value) => (value === "hidden" ? 1 : value === "pear" ? 0.5 : 0.1)}>
        <CommandInput
          aria-label='Search commands'
          defaultValue='query'
        />
        <CommandList>
          <CommandGroup heading='Fruit'>
            <CommandItem
              value='hidden'
              hidden>
              Hidden favorite
            </CommandItem>
            <CommandItem value='apple'>Apple</CommandItem>
          </CommandGroup>
          <CommandGroup heading='Favorites'>
            <CommandItem value='pear'>Pear</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>,
    );
    expect(screen.getAllByRole("option").map((item) => item.textContent)).toEqual(["Pear", "Apple"]);
  });

  it("keeps consumer-hidden items and groups registered but out of navigation and empty counts", () => {
    const fixture = (hidden: boolean): React.JSX.Element => (
      <Command>
        <CommandInput
          aria-label='Search commands'
          defaultValue='app'
        />
        <CommandList>
          <CommandEmpty>No results</CommandEmpty>
          <CommandGroup
            heading='Hidden fruit'
            hidden={hidden}
            forceMount>
            <CommandItem value='apple'>Apple</CommandItem>
          </CommandGroup>
          <CommandItem
            value='pear'
            hidden
            forceMount>
            Pear
          </CommandItem>
        </CommandList>
      </Command>
    );
    const {rerender} = render(fixture(true));
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox")).not.toHaveAttribute("aria-activedescendant");
    expect(screen.getByRole("status")).toHaveTextContent("No results");
    rerender(fixture(false));
    expect(screen.getByRole("option", {name: "Apple"})).toBeVisible();
    expect(screen.queryByRole("option", {name: "Pear"})).not.toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-activedescendant", screen.getByRole("option", {name: "Apple"}).id);
  });

  it("leaves nested native controls' Enter and arrow semantics to those controls", () => {
    const onSelect = vi.fn();
    render(
      <Command>
        <CommandInput aria-label='Search commands' />
        <CommandList>
          <CommandItem onSelect={onSelect}>
            Apple<button type='button'>Details</button>
          </CommandItem>
          <CommandItem>Pear</CommandItem>
        </CommandList>
        <textarea aria-label='Notes' />
      </Command>,
    );
    fireEvent.keyDown(screen.getByRole("button", {name: "Details"}), {key: "Enter"});
    fireEvent.click(screen.getByRole("button", {name: "Details"}));
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole("textbox", {name: "Notes"}), {key: "ArrowDown"});
    expect(screen.getByRole("option", {name: "Pear"})).toHaveAttribute("aria-selected", "false");
  });

  it("preserves native input name/form/disabled semantics and InputGroup addon focus", async () => {
    const user = userEvent.setup();
    const inputRef = React.createRef<HTMLInputElement>();
    const {container, rerender} = render(
      <form id='command-form'>
        <Command>
          <CommandInput
            ref={inputRef}
            name='query'
            form='command-form'
            defaultValue='app'
            aria-label='Search commands'
          />
          <CommandList id='command-results'>
            <CommandItem value='apple'>Apple</CommandItem>
          </CommandList>
        </Command>
      </form>,
    );
    const input = screen.getByRole("combobox");
    expect(inputRef.current).toBe(input);
    expect(input).toHaveAttribute("aria-controls", "command-results");
    const form = container.querySelector("form");
    if (!form) throw new Error("Expected a native form.");
    expect(new FormData(form).get("query")).toBe("app");
    const icon = container.querySelector("[data-slot='command-input-wrapper'] svg");
    if (!icon) throw new Error("Expected a decorative search icon.");
    await user.click(icon);
    expect(input).toHaveFocus();
    rerender(
      <form id='command-form'>
        <Command>
          <CommandInput
            name='query'
            disabled
            aria-label='Search commands'
          />
          <CommandList>
            <CommandItem>Apple</CommandItem>
          </CommandList>
        </Command>
      </form>,
    );
    expect(input).toBeDisabled();
    expect(new FormData(form).has("query")).toBe(false);
  });

  it("forwards native refs for every display part and clears them on unmount", () => {
    const root = React.createRef<HTMLDivElement>();
    const input = React.createRef<HTMLInputElement>();
    const list = React.createRef<HTMLDivElement>();
    const group = React.createRef<HTMLDivElement>();
    const item = React.createRef<HTMLDivElement>();
    const shortcut = React.createRef<HTMLSpanElement>();
    const separator = React.createRef<HTMLDivElement>();
    const empty = React.createRef<HTMLDivElement>();
    const {unmount} = render(
      <>
        <Command ref={root}>
          <CommandInput
            ref={input}
            aria-label='Search commands'
          />
          <CommandList ref={list}>
            <CommandGroup
              ref={group}
              heading='Actions'>
              <CommandItem ref={item}>
                Apple<CommandShortcut ref={shortcut}>A</CommandShortcut>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator ref={separator} />
          </CommandList>
        </Command>
        <Command>
          <CommandList>
            <CommandEmpty ref={empty}>No results</CommandEmpty>
          </CommandList>
        </Command>
      </>,
    );
    expect(root.current).toBe(screen.getAllByRole("toolbar")[0]);
    expect(input.current).toBe(screen.getByRole("combobox"));
    expect(list.current).toBe(screen.getAllByRole("listbox")[0]);
    expect(group.current).toBe(screen.getByRole("group", {name: "Actions"}));
    expect(item.current).toBe(screen.getByRole("option"));
    expect(shortcut.current).toBe(screen.getByText("A"));
    expect(separator.current).toBe(screen.getByRole("separator"));
    expect(empty.current).toBe(screen.getByRole("status"));
    unmount();
    for (const ref of [root, input, list, group, item, shortcut, separator, empty]) expect(ref.current).toBeNull();
  });

  it("preserves actual separator render state, refs and caller events", () => {
    const ref = React.createRef<HTMLDivElement>();
    const onClick = vi.fn();
    render(
      <Command>
        <CommandList>
          <CommandSeparator
            ref={ref}
            orientation='vertical'
            onClick={onClick}
            render={(props, state) => (
              <div
                {...props}
                data-orientation={state.orientation}
              />
            )}
          />
        </CommandList>
      </Command>,
    );
    const separator = screen.getByRole("separator");
    expect(ref.current).toBe(separator);
    expect(separator).toHaveAttribute("aria-orientation", "vertical");
    expect(separator).toHaveAttribute("data-orientation", "vertical");
    fireEvent.click(separator);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("keeps real registrations under StrictMode and separates two controller contexts", () => {
    render(
      <React.StrictMode>
        <Command>
          <CommandInput
            aria-label='First search'
            defaultValue='app'
          />
          <CommandList>
            <CommandGroup heading='First fruit'>
              <CommandItem value='apple'>Apple</CommandItem>
              <CommandItem value='banana'>Banana</CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
        <Command>
          <CommandInput
            aria-label='Second search'
            defaultValue='ban'
          />
          <CommandList>
            <CommandGroup heading='Second fruit'>
              <CommandItem value='apple'>Other apple</CommandItem>
              <CommandItem value='banana'>Other banana</CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </React.StrictMode>,
    );
    expect(screen.getByRole("combobox", {name: "First search"})).toHaveAttribute(
      "aria-activedescendant",
      screen.getByRole("option", {name: "Apple"}).id,
    );
    expect(screen.getByRole("combobox", {name: "Second search"})).toHaveAttribute(
      "aria-activedescendant",
      screen.getByRole("option", {name: "Other banana"}).id,
    );
    expect(screen.getAllByRole("option")).toHaveLength(2);
  });

  it("updates metadata and removes scored registrations without stale active descendants", () => {
    const fixture = (includePear: boolean, keyword: string): React.JSX.Element => (
      <Command>
        <CommandInput
          defaultValue='favorite'
          aria-label='Search commands'
        />
        <CommandList>
          <CommandEmpty>No results</CommandEmpty>
          <CommandGroup heading='Fruit'>
            <CommandItem
              value='apple'
              keywords={[keyword]}>
              Apple
            </CommandItem>
            {includePear && (
              <CommandItem
                value='pear'
                keywords={["favorite"]}>
                Pear
              </CommandItem>
            )}
          </CommandGroup>
        </CommandList>
      </Command>
    );
    const {rerender} = render(fixture(true, "other"));
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-activedescendant", screen.getByRole("option", {name: "Pear"}).id);
    rerender(fixture(false, "favorite"));
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-activedescendant", screen.getByRole("option", {name: "Apple"}).id);
    rerender(fixture(false, "other"));
    expect(screen.getByRole("combobox")).not.toHaveAttribute("aria-activedescendant");
    expect(screen.getByRole("status")).toHaveTextContent("No results");
  });

  it("does not call a custom filter when filtering is disabled and rejects nonfinite or negative scores", () => {
    const filter = vi.fn((value: string) => (value === "apple" ? Number.NaN : -1));
    const fixture = (shouldFilter: boolean): React.JSX.Element => (
      <Command
        shouldFilter={shouldFilter}
        filter={filter}>
        <CommandInput
          defaultValue='query'
          aria-label='Search commands'
        />
        <CommandList>
          <CommandEmpty>No results</CommandEmpty>
          <CommandItem value='apple'>Apple</CommandItem>
          <CommandItem value='pear'>Pear</CommandItem>
        </CommandList>
      </Command>
    );
    const {rerender} = render(fixture(false));
    expect(screen.getAllByRole("option")).toHaveLength(2);
    expect(filter).not.toHaveBeenCalled();
    rerender(fixture(true));
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("No results");
  });

  it("respects cancelled input keyboard handlers and IME and modified option activation", () => {
    const onSelect = vi.fn();
    render(
      <Command>
        <CommandInput
          aria-label='Search commands'
          onKeyDown={(event) => event.preventDefault()}
        />
        <CommandList>
          <CommandItem onSelect={onSelect}>Apple</CommandItem>
        </CommandList>
      </Command>,
    );
    const input = screen.getByRole("combobox");
    const item = screen.getByRole("option");
    fireEvent.keyDown(input, {key: "Enter"});
    fireEvent.keyDown(item, {key: "Enter", isComposing: true});
    fireEvent.keyDown(item, {key: "Enter", altKey: true});
    fireEvent.keyDown(item, {key: "Enter", metaKey: true});
    fireEvent.keyDown(item, {key: "Enter", ctrlKey: true});
    fireEvent.keyDown(item, {key: "Enter", shiftKey: true});
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("supports accepted controlled selected-value proposals", () => {
    function Fixture(): React.JSX.Element {
      const [value, setValue] = React.useState("apple");
      return (
        <Command
          value={value}
          onValueChange={setValue}>
          <CommandInput aria-label='Search commands' />
          <CommandList>
            <CommandItem value='apple'>Apple</CommandItem>
            <CommandItem value='pear'>Pear</CommandItem>
          </CommandList>
        </Command>
      );
    }
    render(<Fixture />);
    fireEvent.keyDown(screen.getByRole("combobox"), {key: "ArrowDown"});
    expect(screen.getByRole("option", {name: "Pear"})).toHaveAttribute("aria-selected", "true");
  });

  it("uses the root defaultValue as the selected item, not the search", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Command
        defaultValue='banana'
        onValueChange={onValueChange}>
        <CommandInput aria-label='Search commands' />
        <CommandList>
          <CommandItem value='apple'>Apple</CommandItem>
          <CommandItem value='banana'>Banana</CommandItem>
        </CommandList>
      </Command>,
    );
    const input = screen.getByRole("combobox");
    expect(input).toHaveValue("");
    expect(screen.getByRole("option", {name: "Banana"})).toHaveAttribute("aria-selected", "true");
    await user.click(input);
    await user.keyboard("{ArrowUp}");
    expect(onValueChange).toHaveBeenLastCalledWith("apple");
    expect(screen.getByRole("option", {name: "Apple"})).toHaveAttribute("aria-selected", "true");
  });

  it("keeps selection on the committed controlled value when a parent rejects navigation and clicking", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const onSelect = vi.fn();
    const fixture = (value: string): React.JSX.Element => (
      <Command
        value={value}
        onValueChange={onValueChange}>
        <CommandInput aria-label='Search commands' />
        <CommandList>
          <CommandItem value='apple'>Apple</CommandItem>
          <CommandItem
            value='banana'
            onSelect={onSelect}>
            Banana
          </CommandItem>
        </CommandList>
      </Command>
    );
    const {rerender} = render(fixture("apple"));
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.keyboard("{ArrowDown}");
    expect(onValueChange).toHaveBeenLastCalledWith("banana");
    expect(input).toHaveAttribute("aria-activedescendant", screen.getByRole("option", {name: "Apple"}).id);
    await user.click(screen.getByRole("option", {name: "Banana"}));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("option", {name: "Banana"})).toHaveAttribute("aria-selected", "false");
    rerender(fixture("banana"));
    expect(input).toHaveAttribute("aria-activedescendant", screen.getByRole("option", {name: "Banana"}).id);
    rerender(fixture("not-registered"));
    expect(input).not.toHaveAttribute("aria-activedescendant");
  });

  it("filters using committed controlled search when a parent rejects the change", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Command>
        <CommandInput
          value='app'
          onValueChange={onValueChange}
          aria-label='Search commands'
        />
        <CommandList>
          <CommandEmpty>No results</CommandEmpty>
          <CommandGroup heading='Fruit'>
            <CommandItem value='apple'>Apple</CommandItem>
            <CommandItem value='banana'>Banana</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>,
    );
    await user.type(screen.getByRole("combobox"), "z");
    expect(onValueChange).toHaveBeenLastCalledWith("appz");
    expect(screen.getByRole("combobox")).toHaveValue("app");
    expect(screen.getByRole("option", {name: "Apple"})).toBeVisible();
    expect(screen.queryByRole("option", {name: "Banana"})).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("honors an uncontrolled input defaultValue and committed external replacements", () => {
    const {rerender} = render(
      <Command>
        <CommandInput
          defaultValue='app'
          aria-label='Search commands'
        />
        <CommandList>
          <CommandItem value='apple'>Apple</CommandItem>
          <CommandItem value='banana'>Banana</CommandItem>
        </CommandList>
      </Command>,
    );
    expect(screen.getByRole("combobox")).toHaveValue("app");
    expect(screen.queryByRole("option", {name: "Banana"})).not.toBeInTheDocument();
    rerender(
      <Command>
        <CommandInput
          value='ban'
          aria-label='Search commands'
        />
        <CommandList>
          <CommandItem value='apple'>Apple</CommandItem>
          <CommandItem value='banana'>Banana</CommandItem>
        </CommandList>
      </Command>,
    );
    expect(screen.getByRole("option", {name: "Banana"})).toBeVisible();
  });

  it("sorts positive scores in DOM and keyboard order with stable ties and restores registration order", async () => {
    const user = userEvent.setup();
    render(
      <Command filter={(value) => ({first: 0.2, second: 0.9, third: 0.9, absent: 0})[value] ?? 0}>
        <CommandInput aria-label='Search commands' />
        <CommandList>
          <CommandItem value='first'>First</CommandItem>
          <CommandSeparator alwaysRender />
          <CommandItem value='second'>Second</CommandItem>
          <CommandItem value='third'>Third</CommandItem>
          <CommandItem value='absent'>Absent</CommandItem>
        </CommandList>
      </Command>,
    );
    const input = screen.getByRole("combobox");
    await user.type(input, "query");
    expect(screen.getAllByRole("option").map((item) => item.textContent)).toEqual(["Second", "Third", "First"]);
    await user.keyboard("{Home}{ArrowDown}");
    expect(input).toHaveAttribute("aria-activedescendant", screen.getByRole("option", {name: "Third"}).id);
    await user.clear(input);
    expect(screen.getAllByRole("option").map((item) => item.textContent)).toEqual(["First", "Second", "Third", "Absent"]);
  });

  it("orders groups by their best child score and labels each group by its heading", async () => {
    const user = userEvent.setup();
    render(
      <Command filter={(value) => (value === "pear" ? 1 : 0.1)}>
        <CommandInput aria-label='Search commands' />
        <CommandList label='Results'>
          <CommandGroup
            heading='Fruit'
            value='fruit'>
            <CommandItem value='apple'>Apple</CommandItem>
          </CommandGroup>
          <CommandGroup heading='Favorites'>
            <CommandItem value='pear'>Pear</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>,
    );
    await user.type(screen.getByRole("combobox"), "query");
    expect(screen.getAllByRole("option").map((item) => item.textContent)).toEqual(["Pear", "Apple"]);
    expect(screen.getByRole("group", {name: "Fruit"})).toContainElement(screen.getByRole("option", {name: "Apple"}));
    expect(screen.getByRole("listbox", {name: "Results"})).toHaveAttribute(
      "id",
      screen.getByRole("combobox").getAttribute("aria-controls"),
    );
  });

  it("inherits group forceMount for every descendant and retains hidden registrations and local state", async () => {
    const user = userEvent.setup();
    let mounts = 0;
    function PersistentLabel(): React.JSX.Element {
      React.useEffect(() => {
        mounts++;
      }, []);
      return <span>Apple</span>;
    }
    render(
      <Command>
        <CommandInput aria-label='Search commands' />
        <CommandList>
          <CommandGroup
            heading='Pinned'
            forceMount>
            <CommandItem value='pinned'>Pinned item</CommandItem>
          </CommandGroup>
          <CommandGroup heading='Fruit'>
            <CommandItem value='apple'>
              <PersistentLabel />
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>,
    );
    const input = screen.getByRole("combobox");
    await user.type(input, "zz");
    expect(screen.getByRole("option", {name: "Pinned item"})).toBeVisible();
    expect(screen.getByText("Apple")).not.toBeVisible();
    fireEvent.change(input, {target: {value: "app"}});
    expect(screen.getByRole("option", {name: "Apple"})).toBeVisible();
    expect(mounts).toBe(1);
  });

  it.each(["click", "keyDown", "focus", "mouseEnter"] as const)("runs and honors a cancelled item %s consumer before selection", (kind) => {
    const onSelect = vi.fn();
    const cancel = vi.fn((event: React.SyntheticEvent<HTMLDivElement>) => event.preventDefault());
    render(
      <Command>
        <CommandList>
          <CommandItem value='first'>First</CommandItem>
          <CommandItem
            value='second'
            onClick={cancel}
            onKeyDown={cancel}
            onFocus={cancel}
            onMouseEnter={cancel}
            onSelect={onSelect}>
            Second
          </CommandItem>
        </CommandList>
      </Command>,
    );
    const item = screen.getByRole("option", {name: "Second"});
    if (kind === "keyDown") fireEvent.keyDown(item, {key: "Enter"});
    else fireEvent[kind](item);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(item).toHaveAttribute("aria-selected", "false");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("honors cancelled input changes without mutating search or emitting proposals", () => {
    const onValueChange = vi.fn();
    render(
      <Command>
        <CommandInput
          aria-label='Search commands'
          onChange={(event) => event.preventDefault()}
          onValueChange={onValueChange}
        />
        <CommandList>
          <CommandItem>Apple</CommandItem>
        </CommandList>
      </Command>,
    );
    fireEvent.change(screen.getByRole("combobox"), {target: {value: "zz"}});
    expect(screen.getByRole("combobox")).toHaveValue("");
    expect(screen.getByRole("option", {name: "Apple"})).toBeVisible();
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("supports Ctrl+n/j and Ctrl+p/k by default but preserves unrelated modified keys", () => {
    render(
      <Command>
        <CommandInput aria-label='Search commands' />
        <CommandList>
          <CommandItem>First</CommandItem>
          <CommandItem>Second</CommandItem>
          <CommandItem>Third</CommandItem>
        </CommandList>
      </Command>,
    );
    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, {key: "n"});
    fireEvent.keyDown(input, {key: "j", metaKey: true});
    fireEvent.keyDown(input, {key: "ArrowDown", shiftKey: true});
    expect(screen.getByRole("option", {name: "First"})).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(input, {key: "n", ctrlKey: true});
    expect(screen.getByRole("option", {name: "Second"})).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(input, {key: "j", ctrlKey: true});
    expect(screen.getByRole("option", {name: "Third"})).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(input, {key: "p", ctrlKey: true});
    fireEvent.keyDown(input, {key: "k", ctrlKey: true});
    expect(screen.getByRole("option", {name: "First"})).toHaveAttribute("aria-selected", "true");
  });

  it("allows Vim bindings to be disabled and uses Meta arrows for endpoints and Alt arrows for groups", () => {
    render(
      <Command vimBindings={false}>
        <CommandInput aria-label='Search commands' />
        <CommandList>
          <CommandGroup heading='A'>
            <CommandItem>First</CommandItem>
            <CommandItem>Second</CommandItem>
          </CommandGroup>
          <CommandGroup heading='B'>
            <CommandItem>Third</CommandItem>
            <CommandItem>Fourth</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>,
    );
    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, {key: "n", ctrlKey: true});
    expect(screen.getByRole("option", {name: "First"})).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(input, {key: "ArrowDown", altKey: true});
    expect(screen.getByRole("option", {name: "Third"})).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(input, {key: "ArrowUp", altKey: true});
    expect(screen.getByRole("option", {name: "First"})).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(input, {key: "ArrowDown", metaKey: true});
    expect(screen.getByRole("option", {name: "Fourth"})).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(input, {key: "ArrowUp", metaKey: true});
    expect(screen.getByRole("option", {name: "First"})).toHaveAttribute("aria-selected", "true");
  });

  it("does not activate twice when an option receives Enter or Space and suppresses disabled handlers", () => {
    const onSelect = vi.fn();
    const disabledSelect = vi.fn();
    render(
      <Command>
        <CommandList>
          <CommandItem onSelect={onSelect}>First</CommandItem>
          <CommandItem
            disabled
            onSelect={disabledSelect}>
            Disabled
          </CommandItem>
        </CommandList>
      </Command>,
    );
    const first = screen.getByRole("option", {name: "First"});
    fireEvent.keyDown(first, {key: "Enter"});
    expect(onSelect).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(first, {key: " "});
    expect(onSelect).toHaveBeenCalledTimes(2);
    const disabled = screen.getByRole("option", {name: "Disabled"});
    fireEvent.click(disabled);
    fireEvent.focus(disabled);
    fireEvent.keyDown(disabled, {key: "Enter"});
    expect(disabledSelect).not.toHaveBeenCalled();
    expect(disabled).toHaveAttribute("aria-disabled", "true");
  });

  it("does not add a Command root inside the canonical dialog and wires real title and description", () => {
    render(
      <CommandDialog
        open
        title='Actions'
        description='Choose an action'
        showCloseButton>
        <Command label='Commands'>
          <CommandInput aria-label='Search commands' />
          <CommandList>
            <CommandItem>Apple</CommandItem>
          </CommandList>
        </Command>
      </CommandDialog>,
    );
    expect(screen.getByRole("dialog", {name: "Actions", description: "Choose an action"})).toBeInTheDocument();
    expect(screen.getAllByRole("toolbar")).toHaveLength(1);
    expect(screen.getByRole("button", {name: "Close"})).toBeInTheDocument();
  });

  it("does not show the canonical dialog close by default and forwards its popup ref", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <CommandDialog
        open
        ref={ref}>
        <Command>
          <CommandList>
            <CommandItem>Apple</CommandItem>
          </CommandList>
        </Command>
      </CommandDialog>,
    );
    expect(ref.current).toBe(screen.getByRole("dialog"));
    expect(screen.queryByRole("button", {name: "Close"})).not.toBeInTheDocument();
  });

  it("recovers a grouped item after a nonmatching query", async () => {
    const user = userEvent.setup();
    function Fixture(): React.JSX.Element {
      const [search, setSearch] = React.useState("");
      return (
        <>
          <button onClick={() => setSearch("zz")}>No matches</button>
          <button onClick={() => setSearch("app")}>Find apple</button>
          <Command>
            <CommandInput
              value={search}
              onValueChange={setSearch}
              aria-label='Search commands'
            />
            <CommandList>
              <CommandGroup heading='Fruit'>
                <CommandItem value='apple'>Apple</CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </>
      );
    }
    render(<Fixture />);
    await user.click(screen.getByRole("button", {name: "No matches"}));
    expect(screen.queryByRole("option", {name: "Apple"})).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", {name: "Find apple"}));
    expect(screen.getByRole("option", {name: "Apple"})).toBeInTheDocument();
  });

  it.each(["disabled", "removed"] as const)("keeps the fallback active after a selected item is %s and restored", async (state) => {
    // Arrange
    const user = userEvent.setup();
    const onSelectFirst = vi.fn();
    const onSelectSecond = vi.fn();
    const commands = (secondState: "enabled" | "disabled" | "removed"): React.JSX.Element => (
      <Command>
        <CommandInput placeholder='Search commands' />
        <CommandList>
          <CommandItem onSelect={onSelectFirst}>First</CommandItem>
          {secondState !== "removed" && (
            <CommandItem
              disabled={secondState === "disabled"}
              onSelect={onSelectSecond}>
              Second
            </CommandItem>
          )}
        </CommandList>
      </Command>
    );
    const {rerender} = render(commands("enabled"));
    const input = screen.getByRole("combobox");

    expect(input).toHaveAttribute("aria-activedescendant", screen.getByRole("option", {name: "First"}).id);
    await user.click(input);
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("option", {name: "Second"})).toHaveAttribute("aria-selected", "true");

    // Act
    rerender(commands(state));

    // Assert
    expect(screen.getByRole("option", {name: "First"})).toHaveAttribute("aria-selected", "true");
    expect(input).toHaveAttribute("aria-activedescendant", screen.getByRole("option", {name: "First"}).id);

    // Act
    rerender(commands("enabled"));
    await user.keyboard("{Enter}");

    // Assert
    expect(screen.getByRole("option", {name: "First"})).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", {name: "Second"})).toHaveAttribute("aria-selected", "false");
    expect(onSelectFirst).toHaveBeenCalledWith("First");
    expect(onSelectSecond).not.toHaveBeenCalled();
  });

  it("clears active selection when all items become disabled and recovers to the first enabled item", async () => {
    // Arrange
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const commands = (disabled: boolean): React.JSX.Element => (
      <Command>
        <CommandInput placeholder='Search commands' />
        <CommandList>
          <CommandItem
            disabled={disabled}
            onSelect={onSelect}>
            First
          </CommandItem>
          <CommandItem
            disabled={disabled}
            onSelect={onSelect}>
            Second
          </CommandItem>
        </CommandList>
      </Command>
    );
    const {rerender} = render(commands(false));
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.keyboard("{End}");
    expect(screen.getByRole("option", {name: "Second"})).toHaveAttribute("aria-selected", "true");

    // Act
    rerender(commands(true));
    await user.keyboard("{ArrowUp}{ArrowDown}{Home}{End}{Enter}");

    // Assert
    expect(input).not.toHaveAttribute("aria-activedescendant");
    expect(screen.getByRole("option", {name: "First"})).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("option", {name: "Second"})).toHaveAttribute("aria-selected", "false");
    expect(onSelect).not.toHaveBeenCalled();

    // Act
    rerender(commands(false));
    await user.keyboard("{Enter}");

    // Assert
    expect(input).toHaveAttribute("aria-activedescendant", screen.getByRole("option", {name: "First"}).id);
    expect(onSelect).toHaveBeenCalledWith("First");
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("preserves valid selection across controlled filtering without reviving an invalidated selection", async () => {
    // Arrange
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const commands = (search: string): React.JSX.Element => (
      <Command>
        <CommandInput
          placeholder='Search commands'
          value={search}
        />
        <CommandList>
          <CommandEmpty>No results</CommandEmpty>
          <CommandItem onSelect={onSelect}>First</CommandItem>
          <CommandItem onSelect={onSelect}>Second</CommandItem>
        </CommandList>
      </Command>
    );
    const {rerender} = render(commands(""));
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.keyboard("{End}");
    expect(screen.getByRole("option", {name: "Second"})).toHaveAttribute("aria-selected", "true");

    // Act
    rerender(commands("s"));

    // Assert
    expect(screen.getByRole("option", {name: "Second"})).toHaveAttribute("aria-selected", "true");

    // Act
    rerender(commands("First"));
    rerender(commands(""));

    // Assert
    expect(screen.getByRole("option", {name: "First"})).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", {name: "Second"})).toHaveAttribute("aria-selected", "false");

    // Act
    rerender(commands("missing"));
    await user.keyboard("{Enter}");

    // Assert
    expect(screen.getByRole("status")).toHaveTextContent("No results");
    expect(input).not.toHaveAttribute("aria-activedescendant");
    expect(onSelect).not.toHaveBeenCalled();

    // Act
    rerender(commands(""));
    await user.keyboard("{ArrowDown}{Enter}");

    // Assert
    expect(input).toHaveAttribute("aria-activedescendant", screen.getByRole("option", {name: "Second"}).id);
    expect(onSelect).toHaveBeenCalledWith("Second");
  });

  it("should filter items and display the empty state when nothing matches", async () => {
    // Arrange
    render(
      <Command>
        <CommandInput placeholder='Search commands' />
        <CommandList>
          <CommandEmpty>No results</CommandEmpty>
          <CommandGroup heading='Navigation'>
            <CommandItem>Home</CommandItem>
            <CommandItem>Projects</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>,
    );

    // Act
    const user = userEvent.setup();
    await user.type(screen.getByRole("combobox"), "settings");

    // Assert
    expect(screen.getByText("No results")).toBeInTheDocument();
    expect(screen.queryByRole("option", {name: "Home"})).not.toBeInTheDocument();
    expect(screen.queryByRole("option", {name: "Projects"})).not.toBeInTheDocument();
  });

  it("should navigate with the keyboard and select the active item on enter", async () => {
    // Arrange
    const onSelectHome = vi.fn();
    const onSelectProjects = vi.fn();

    render(
      <Command loop>
        <CommandInput placeholder='Search commands' />
        <CommandList>
          <CommandEmpty>No results</CommandEmpty>
          <CommandGroup heading='Navigation'>
            <CommandItem onSelect={onSelectHome}>Home</CommandItem>
            <CommandItem onSelect={onSelectProjects}>Projects</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>,
    );

    // Act
    const user = userEvent.setup();
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.keyboard("{ArrowDown}{Enter}");

    // Assert
    expect(onSelectHome).not.toHaveBeenCalled();
    expect(onSelectProjects).toHaveBeenCalledWith("Projects");
  });

  it("should render the dialog wrapper with shortcut and separator content", () => {
    // Arrange
    render(
      <CommandDialog
        open
        title='Command palette'>
        <Command>
          <CommandInput placeholder='Search commands' />
          <CommandList>
            <CommandGroup heading='Navigation'>
              <CommandItem>
                Home
                <CommandShortcut>H</CommandShortcut>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
          </CommandList>
        </Command>
      </CommandDialog>,
    );

    // Assert
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("H")).toBeInTheDocument();
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });

  it("should navigate with ArrowUp key", async () => {
    // Arrange
    const onSelectFirst = vi.fn();
    const onSelectSecond = vi.fn();

    render(
      <Command>
        <CommandInput placeholder='Search' />
        <CommandList>
          <CommandItem onSelect={onSelectFirst}>First</CommandItem>
          <CommandItem onSelect={onSelectSecond}>Second</CommandItem>
        </CommandList>
      </Command>,
    );

    // Act
    const user = userEvent.setup();
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.keyboard("{ArrowDown}{ArrowUp}{Enter}");

    // Assert
    expect(onSelectFirst).toHaveBeenCalledWith("First");
    expect(onSelectSecond).not.toHaveBeenCalled();
  });

  it("should handle Home key to select first item", async () => {
    // Arrange
    const onSelectFirst = vi.fn();

    render(
      <Command>
        <CommandInput placeholder='Search' />
        <CommandList>
          <CommandItem onSelect={onSelectFirst}>First</CommandItem>
          <CommandItem>Second</CommandItem>
          <CommandItem>Third</CommandItem>
        </CommandList>
      </Command>,
    );

    // Act
    const user = userEvent.setup();
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.keyboard("{ArrowDown}{ArrowDown}{Home}{Enter}");

    // Assert
    expect(onSelectFirst).toHaveBeenCalledWith("First");
  });

  it("should handle End key to select last item", async () => {
    // Arrange
    const onSelectLast = vi.fn();

    render(
      <Command>
        <CommandInput placeholder='Search' />
        <CommandList>
          <CommandItem>First</CommandItem>
          <CommandItem>Second</CommandItem>
          <CommandItem onSelect={onSelectLast}>Third</CommandItem>
        </CommandList>
      </Command>,
    );

    // Act
    const user = userEvent.setup();
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.keyboard("{End}{Enter}");

    // Assert
    expect(onSelectLast).toHaveBeenCalledWith("Third");
  });

  it("should render CommandGroup heading", () => {
    // Arrange
    render(
      <Command>
        <CommandList>
          <CommandGroup heading='Actions'>
            <CommandItem>Save</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>,
    );

    // Assert
    expect(screen.getByText("Actions")).toBeInTheDocument();
  });

  it("should hide CommandSeparator when filtering", async () => {
    // Arrange
    render(
      <Command>
        <CommandInput placeholder='Search' />
        <CommandList>
          <CommandItem>First</CommandItem>
          <CommandSeparator />
          <CommandItem>Second</CommandItem>
        </CommandList>
      </Command>,
    );

    // Act
    const user = userEvent.setup();
    const input = screen.getByRole("combobox");
    await user.type(input, "First");

    // Assert
    expect(screen.queryByRole("separator")).not.toBeInTheDocument();
  });

  it("should show CommandSeparator with alwaysRender prop even when filtering", async () => {
    // Arrange
    render(
      <Command>
        <CommandInput placeholder='Search' />
        <CommandList>
          <CommandItem>First</CommandItem>
          <CommandSeparator alwaysRender />
          <CommandItem>Second</CommandItem>
        </CommandList>
      </Command>,
    );

    // Act
    const user = userEvent.setup();
    const input = screen.getByRole("combobox");
    await user.type(input, "First");

    // Assert
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });

  it("should filter items by keywords", async () => {
    // Arrange
    render(
      <Command>
        <CommandInput placeholder='Search' />
        <CommandList>
          <CommandEmpty>No results</CommandEmpty>
          <CommandItem keywords={["config", "preferences"]}>Settings</CommandItem>
          <CommandItem>Home</CommandItem>
        </CommandList>
      </Command>,
    );

    // Act
    const user = userEvent.setup();
    const input = screen.getByRole("combobox");
    await user.type(input, "preferences");

    // Assert
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.queryByRole("option", {name: "Home"})).not.toBeInTheDocument();
  });

  it("should handle Home key when no selectable items exist", async () => {
    // Arrange
    render(
      <Command>
        <CommandInput placeholder='Search' />
        <CommandList>
          <CommandEmpty>No results</CommandEmpty>
        </CommandList>
      </Command>,
    );

    // Act
    const user = userEvent.setup();
    const input = screen.getByRole("combobox");
    await user.type(input, "nonexistent");
    await user.keyboard("{Home}");

    // Assert - should not crash when no items available
    expect(screen.getByText("No results")).toBeInTheDocument();
  });

  it("should handle End key when no selectable items exist", async () => {
    // Arrange
    render(
      <Command>
        <CommandInput placeholder='Search' />
        <CommandList>
          <CommandEmpty>No results</CommandEmpty>
        </CommandList>
      </Command>,
    );

    // Act
    const user = userEvent.setup();
    const input = screen.getByRole("combobox");
    await user.type(input, "nonexistent");
    await user.keyboard("{End}");

    // Assert - should not crash when no items available
    expect(screen.getByText("No results")).toBeInTheDocument();
  });

  it("should handle default case in switch statement for unhandled keys", async () => {
    // Arrange
    render(
      <Command>
        <CommandInput placeholder='Search' />
        <CommandList>
          <CommandItem>Item</CommandItem>
        </CommandList>
      </Command>,
    );

    // Act
    const user = userEvent.setup();
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.tab();

    // Assert - should handle unrecognized keys gracefully
    expect(screen.getByText("Item")).toBeInTheDocument();
  });

  it("should handle Enter key when input is composing", () => {
    // Arrange
    render(
      <Command>
        <CommandInput placeholder='Search' />
        <CommandList>
          <CommandItem>Item</CommandItem>
        </CommandList>
      </Command>,
    );

    // Act
    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, {
      key: "Enter",
      isComposing: true,
    });

    // Assert - should not trigger selection while composing
    expect(screen.getByText("Item")).toBeInTheDocument();
  });

  it("should disable filtering when shouldFilter is false", async () => {
    // Arrange
    render(
      <Command shouldFilter={false}>
        <CommandInput placeholder='Search' />
        <CommandList>
          <CommandItem>First</CommandItem>
          <CommandItem>Second</CommandItem>
        </CommandList>
      </Command>,
    );

    // Act
    const user = userEvent.setup();
    const input = screen.getByRole("combobox");
    await user.type(input, "nonexistent");

    // Assert
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });

  it("should handle disabled items", async () => {
    // Arrange
    const onSelectEnabled = vi.fn();
    const onSelectDisabled = vi.fn();

    render(
      <Command>
        <CommandInput placeholder='Search' />
        <CommandList>
          <CommandItem onSelect={onSelectEnabled}>Enabled</CommandItem>
          <CommandItem
            disabled
            onSelect={onSelectDisabled}>
            Disabled
          </CommandItem>
        </CommandList>
      </Command>,
    );

    // Act
    const user = userEvent.setup();
    const disabledItem = screen.getByText("Disabled");
    await user.click(disabledItem);

    // Assert
    expect(onSelectDisabled).not.toHaveBeenCalled();
  });

  it("should handle keyboard loop navigation", async () => {
    // Arrange
    const onSelectFirst = vi.fn();

    render(
      <Command loop>
        <CommandInput placeholder='Search' />
        <CommandList>
          <CommandItem onSelect={onSelectFirst}>First</CommandItem>
          <CommandItem>Second</CommandItem>
        </CommandList>
      </Command>,
    );

    // Act
    const user = userEvent.setup();
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    // Assert
    expect(onSelectFirst).toHaveBeenCalledWith("First");
  });

  it("should handle reverse keyboard loop navigation with ArrowUp", async () => {
    // Arrange
    const onSelectLast = vi.fn();

    render(
      <Command loop>
        <CommandInput placeholder='Search' />
        <CommandList>
          <CommandItem>First</CommandItem>
          <CommandItem onSelect={onSelectLast}>Second</CommandItem>
        </CommandList>
      </Command>,
    );

    // Act
    const user = userEvent.setup();
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.keyboard("{ArrowUp}{Enter}");

    // Assert
    expect(onSelectLast).toHaveBeenCalledWith("Second");
  });

  it("should not loop navigation without loop prop", async () => {
    // Arrange
    const onSelectSecond = vi.fn();

    render(
      <Command>
        <CommandInput placeholder='Search' />
        <CommandList>
          <CommandItem>First</CommandItem>
          <CommandItem onSelect={onSelectSecond}>Second</CommandItem>
        </CommandList>
      </Command>,
    );

    // Act
    const user = userEvent.setup();
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    // Assert
    expect(onSelectSecond).toHaveBeenCalledWith("Second");
  });

  it("should handle custom filter function", async () => {
    // Arrange
    const customFilter = vi.fn((value: string, search: string) => {
      return value.startsWith(search) ? 1 : 0;
    });

    render(
      <Command filter={customFilter}>
        <CommandInput placeholder='Search' />
        <CommandList>
          <CommandEmpty>No results</CommandEmpty>
          <CommandItem value='apple'>Apple</CommandItem>
          <CommandItem value='banana'>Banana</CommandItem>
        </CommandList>
      </Command>,
    );

    // Act
    const user = userEvent.setup();
    const input = screen.getByRole("combobox");
    await user.type(input, "app");

    // Assert
    expect(customFilter).toHaveBeenCalled();
    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(screen.queryByRole("option", {name: "Banana"})).not.toBeInTheDocument();
  });

  it("should handle forceMount on CommandItem", async () => {
    // Arrange
    render(
      <Command>
        <CommandInput placeholder='Search' />
        <CommandList>
          <CommandEmpty>No results</CommandEmpty>
          <CommandItem forceMount>Always Visible</CommandItem>
          <CommandItem>Sometimes Visible</CommandItem>
        </CommandList>
      </Command>,
    );

    // Act
    const user = userEvent.setup();
    const input = screen.getByRole("combobox");
    await user.type(input, "nomatch");

    // Assert
    expect(screen.getByText("Always Visible")).toBeInTheDocument();
    expect(screen.queryByRole("option", {name: "Sometimes Visible"})).not.toBeInTheDocument();
  });

  it("should handle forceMount on CommandGroup", async () => {
    // Arrange
    render(
      <Command>
        <CommandInput placeholder='Search' />
        <CommandList>
          <CommandGroup
            heading='Always Visible Group'
            forceMount>
            <CommandItem>Item</CommandItem>
          </CommandGroup>
          <CommandGroup heading='Sometimes Visible Group'>
            <CommandItem>Other Item</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>,
    );

    // Act
    const user = userEvent.setup();
    const input = screen.getByRole("combobox");
    await user.type(input, "nomatch");

    // Assert
    expect(screen.getByText("Always Visible Group")).toBeInTheDocument();
  });

  it("should handle controlled input value", async () => {
    // Arrange
    const TestComponent = () => {
      const [value, setValue] = React.useState("");

      return (
        <Command>
          <CommandInput
            placeholder='Search'
            value={value}
            onValueChange={setValue}
          />
          <CommandList>
            <CommandItem>First</CommandItem>
          </CommandList>
        </Command>
      );
    };

    render(<TestComponent />);

    // Act
    const user = userEvent.setup();
    const input = screen.getByRole("combobox");
    await user.type(input, "test");

    // Assert
    expect(input).toHaveValue("test");
  });

  it("should handle mouse hover selection", async () => {
    // Arrange
    render(
      <Command>
        <CommandInput placeholder='Search' />
        <CommandList>
          <CommandItem>First</CommandItem>
          <CommandItem>Second</CommandItem>
        </CommandList>
      </Command>,
    );

    // Act
    const user = userEvent.setup();
    const secondItem = screen.getByText("Second");
    await user.hover(secondItem);

    // Assert
    expect(secondItem).toHaveAttribute("aria-selected", "true");
  });

  it("should handle disablePointerSelection prop", async () => {
    // Arrange
    render(
      <Command disablePointerSelection>
        <CommandInput placeholder='Search' />
        <CommandList>
          <CommandItem>First</CommandItem>
          <CommandItem>Second</CommandItem>
        </CommandList>
      </Command>,
    );

    // Act
    const user = userEvent.setup();
    const firstItem = screen.getByText("First");
    const secondItem = screen.getByText("Second");
    await user.hover(secondItem);

    // Assert - First item should still be selected after hover
    expect(firstItem).toHaveAttribute("aria-selected", "true");
  });

  it("should render CommandShortcut with custom className", () => {
    // Arrange
    render(
      <Command>
        <CommandList>
          <CommandItem>
            Item
            <CommandShortcut className='custom-shortcut'>⌘K</CommandShortcut>
          </CommandItem>
        </CommandList>
      </Command>,
    );

    // Assert
    const shortcut = screen.getByText("⌘K");

    expect(shortcut).toHaveClass("custom-shortcut");
  });

  it("should handle CommandItem with custom value prop", async () => {
    // Arrange
    const onSelect = vi.fn();

    render(
      <Command>
        <CommandList>
          <CommandItem
            value='custom-value'
            onSelect={onSelect}>
            Display Text
          </CommandItem>
        </CommandList>
      </Command>,
    );

    // Act
    const user = userEvent.setup();
    const item = screen.getByText("Display Text");
    await user.click(item);

    // Assert
    expect(onSelect).toHaveBeenCalledWith("custom-value");
  });

  it("should handle CommandItem focus event", async () => {
    // Arrange
    render(
      <Command>
        <CommandList>
          <CommandItem>First</CommandItem>
          <CommandItem>Second</CommandItem>
        </CommandList>
      </Command>,
    );

    // Act
    const user = userEvent.setup();
    const secondItem = screen.getByText("Second");
    await user.tab();
    await user.tab();

    // Assert
    expect(secondItem).toHaveAttribute("aria-selected", "true");
  });

  it("should handle empty search results correctly", async () => {
    // Arrange
    render(
      <Command>
        <CommandInput placeholder='Search' />
        <CommandList>
          <CommandEmpty>No results found</CommandEmpty>
          <CommandItem>Item</CommandItem>
        </CommandList>
      </Command>,
    );

    // Act - no search yet
    // Assert
    expect(screen.queryByText("No results found")).not.toBeInTheDocument();
    expect(screen.getByText("Item")).toBeInTheDocument();

    // Act - search with no match
    const user = userEvent.setup();
    const input = screen.getByRole("combobox");
    await user.type(input, "nonexistent");

    // Assert
    expect(screen.getByText("No results found")).toBeInTheDocument();
  });

  it("should ignore Home key when no selectable items exist", async () => {
    // Arrange
    render(
      <Command>
        <CommandInput placeholder='Search' />
        <CommandList>
          <CommandEmpty>No results</CommandEmpty>
        </CommandList>
      </Command>,
    );

    // Act
    const user = userEvent.setup();
    const input = screen.getByRole("combobox");
    await user.type(input, "nomatch");
    await user.keyboard("{Home}");

    // Assert - no error should occur, command should remain functional
    expect(screen.getByText("No results")).toBeInTheDocument();
  });

  it("should ignore End key when no selectable items exist", async () => {
    // Arrange
    render(
      <Command>
        <CommandInput placeholder='Search' />
        <CommandList>
          <CommandEmpty>No results</CommandEmpty>
        </CommandList>
      </Command>,
    );

    // Act
    const user = userEvent.setup();
    const input = screen.getByRole("combobox");
    await user.type(input, "nomatch");
    await user.keyboard("{End}");

    // Assert - no error should occur
    expect(screen.getByText("No results")).toBeInTheDocument();
  });

  it("should ignore Enter key during IME composition", async () => {
    // Arrange
    const onSelect = vi.fn();

    render(
      <Command>
        <CommandInput placeholder='Search' />
        <CommandList>
          <CommandItem onSelect={onSelect}>First</CommandItem>
        </CommandList>
      </Command>,
    );

    // Act
    const user = userEvent.setup();
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.keyboard("{ArrowDown}"); // Select First item
    // Create a keydown event with isComposing flag
    const composingEvent = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingEvent, "isComposing", {
      value: true,
      writable: false,
    });
    input.dispatchEvent(composingEvent);

    // Assert - onSelect should not be called during IME composition
    // Since we can't reliably simulate isComposing in tests, we verify the normal path works
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("should render CommandDialog with custom title prop", () => {
    // Arrange
    render(
      <CommandDialog
        open
        title='Custom Command Dialog'>
        <Command>
          <CommandInput placeholder='Search' />
          <CommandList>
            <CommandItem>Item</CommandItem>
          </CommandList>
        </Command>
      </CommandDialog>,
    );

    // Assert
    expect(screen.getByRole("dialog", {name: "Custom Command Dialog"})).toBeInTheDocument();
  });

  it("should render CommandDialog with default title", () => {
    // Arrange
    render(
      <CommandDialog open>
        <Command>
          <CommandInput placeholder='Search' />
          <CommandList>
            <CommandItem>Item</CommandItem>
          </CommandList>
        </Command>
      </CommandDialog>,
    );

    // Assert
    expect(screen.getByRole("dialog", {name: "Command menu"})).toBeInTheDocument();
  });

  it("should wrap from last to first item when loop is enabled and ArrowDown is pressed", async () => {
    // Arrange
    const onSelectFirst = vi.fn();

    render(
      <Command loop>
        <CommandInput placeholder='Search' />
        <CommandList>
          <CommandItem onSelect={onSelectFirst}>First</CommandItem>
          <CommandItem>Second</CommandItem>
          <CommandItem>Third</CommandItem>
        </CommandList>
      </Command>,
    );

    // Act
    const user = userEvent.setup();
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.keyboard("{End}{ArrowDown}{Enter}");

    // Assert
    expect(onSelectFirst).toHaveBeenCalledWith("First");
  });

  it("should wrap from first to last item when loop is enabled and ArrowUp is pressed from start", async () => {
    // Arrange
    const onSelectLast = vi.fn();

    render(
      <Command loop>
        <CommandInput placeholder='Search' />
        <CommandList>
          <CommandItem>First</CommandItem>
          <CommandItem>Second</CommandItem>
          <CommandItem onSelect={onSelectLast}>Third</CommandItem>
        </CommandList>
      </Command>,
    );

    // Act
    const user = userEvent.setup();
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.keyboard("{ArrowUp}{Enter}");

    // Assert
    expect(onSelectLast).toHaveBeenCalledWith("Third");
  });

  it("should ignore ArrowDown when no selectable items exist", async () => {
    // Arrange
    render(
      <Command>
        <CommandInput placeholder='Search' />
        <CommandList>
          <CommandEmpty>No results</CommandEmpty>
        </CommandList>
      </Command>,
    );

    // Act
    const user = userEvent.setup();
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.keyboard("{ArrowDown}");

    // Assert
    expect(screen.getByText("No results")).toBeInTheDocument();
    expect(input).not.toHaveAttribute("aria-activedescendant");
  });

  it("should ignore ArrowUp when no selectable items exist", async () => {
    // Arrange
    render(
      <Command>
        <CommandInput placeholder='Search' />
        <CommandList>
          <CommandEmpty>No results</CommandEmpty>
        </CommandList>
      </Command>,
    );

    // Act
    const user = userEvent.setup();
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.keyboard("{ArrowUp}");

    // Assert
    expect(screen.getByText("No results")).toBeInTheDocument();
    expect(input).not.toHaveAttribute("aria-activedescendant");
  });

  it("should recover when ArrowDown is pressed after filtering removes the active item", async () => {
    // Arrange
    render(
      <Command>
        <CommandInput placeholder='Search' />
        <CommandList>
          <CommandItem>First</CommandItem>
          <CommandItem>Second</CommandItem>
        </CommandList>
      </Command>,
    );

    const input = screen.getByRole("combobox");
    const user = userEvent.setup();

    await user.click(input);

    // Act
    act(() => {
      fireEvent.change(input, {target: {value: "Second"}});
      fireEvent.keyDown(input, {key: "ArrowDown"});
    });

    // Assert
    expect(screen.getByText("Second")).toHaveAttribute("aria-selected", "true");
  });

  it("should recover when ArrowUp is pressed after filtering removes the active item", async () => {
    // Arrange
    render(
      <Command>
        <CommandInput placeholder='Search' />
        <CommandList>
          <CommandItem>First</CommandItem>
          <CommandItem>Second</CommandItem>
        </CommandList>
      </Command>,
    );

    const input = screen.getByRole("combobox");
    const user = userEvent.setup();

    await user.click(input);

    // Act
    act(() => {
      fireEvent.change(input, {target: {value: "Second"}});
      fireEvent.keyDown(input, {key: "ArrowUp"});
    });

    // Assert
    expect(screen.getByText("Second")).toHaveAttribute("aria-selected", "true");
  });

  it("should ignore Enter when there is no active item", async () => {
    // Arrange
    render(
      <Command>
        <CommandInput placeholder='Search' />
        <CommandList>
          <CommandEmpty>No results</CommandEmpty>
        </CommandList>
      </Command>,
    );

    // Act
    const user = userEvent.setup();
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.keyboard("{Enter}");

    // Assert
    expect(screen.getByText("No results")).toBeInTheDocument();
  });

  it("should skip built-in key handling when the custom keydown handler prevents default", async () => {
    // Arrange
    const onSelectFirst = vi.fn();
    const onSelectSecond = vi.fn();

    render(
      <Command
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
          }
        }}>
        <CommandInput placeholder='Search' />
        <CommandList>
          <CommandItem onSelect={onSelectFirst}>First</CommandItem>
          <CommandItem onSelect={onSelectSecond}>Second</CommandItem>
        </CommandList>
      </Command>,
    );

    // Act
    const user = userEvent.setup();
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.keyboard("{ArrowDown}{Enter}");

    // Assert
    expect(onSelectFirst).toHaveBeenCalledWith("First");
    expect(onSelectSecond).not.toHaveBeenCalled();
  });

  it("should forward an object ref to CommandItem", () => {
    // Arrange
    const itemRef = React.createRef<HTMLDivElement>();

    // Act
    render(
      <Command>
        <CommandInput placeholder='Search' />
        <CommandList>
          <CommandItem ref={itemRef}>First</CommandItem>
        </CommandList>
      </Command>,
    );

    // Assert
    expect(itemRef.current).toBe(screen.getByText("First"));
  });

  it("should forward a callback ref to CommandItem", () => {
    // Arrange
    const callbackRef = vi.fn();

    // Act
    render(
      <Command>
        <CommandInput placeholder='Search' />
        <CommandList>
          <CommandItem ref={callbackRef}>First</CommandItem>
        </CommandList>
      </Command>,
    );

    // Assert
    expect(callbackRef).toHaveBeenCalledWith(screen.getByText("First"));
  });
});
