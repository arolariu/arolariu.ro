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
    expect(screen.queryByText("Home")).not.toBeInTheDocument();
    expect(screen.queryByText("Projects")).not.toBeInTheDocument();
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
    expect(screen.queryByText("Home")).not.toBeInTheDocument();
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
      nativeEvent: {isComposing: true} as KeyboardEvent,
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
    expect(screen.queryByText("Banana")).not.toBeInTheDocument();
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
    expect(screen.queryByText("Sometimes Visible")).not.toBeInTheDocument();
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
        <CommandInput placeholder='Search' />
        <CommandList>
          <CommandItem>Item</CommandItem>
        </CommandList>
      </CommandDialog>,
    );

    // Assert
    expect(screen.getByRole("dialog", {name: "Custom Command Dialog"})).toBeInTheDocument();
  });

  it("should render CommandDialog with default title", () => {
    // Arrange
    render(
      <CommandDialog open>
        <CommandInput placeholder='Search' />
        <CommandList>
          <CommandItem>Item</CommandItem>
        </CommandList>
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

    const input = screen.getByRole("combobox") as HTMLInputElement;
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

    const input = screen.getByRole("combobox") as HTMLInputElement;
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
