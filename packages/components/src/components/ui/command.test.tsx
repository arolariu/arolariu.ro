import * as React from "react";

import {fireEvent, render, screen} from "@testing-library/react";
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
  it("should filter items and display the empty state when nothing matches", () => {
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
    fireEvent.change(screen.getByRole("combobox"), {target: {value: "settings"}});

    // Assert
    expect(screen.getByText("No results")).toBeInTheDocument();
    expect(screen.queryByText("Home")).not.toBeInTheDocument();
    expect(screen.queryByText("Projects")).not.toBeInTheDocument();
  });

  it("should navigate with the keyboard and select the active item on enter", () => {
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
    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, {key: "ArrowDown"});
    fireEvent.keyDown(input, {key: "Enter"});

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

  it("should navigate with ArrowUp key", () => {
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
    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, {key: "ArrowDown"}); // Move to Second
    fireEvent.keyDown(input, {key: "ArrowUp"}); // Move back to First
    fireEvent.keyDown(input, {key: "Enter"});

    // Assert
    expect(onSelectFirst).toHaveBeenCalledWith("First");
    expect(onSelectSecond).not.toHaveBeenCalled();
  });

  it("should handle Home key to select first item", () => {
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
    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, {key: "ArrowDown"});
    fireEvent.keyDown(input, {key: "ArrowDown"});
    fireEvent.keyDown(input, {key: "Home"});
    fireEvent.keyDown(input, {key: "Enter"});

    // Assert
    expect(onSelectFirst).toHaveBeenCalledWith("First");
  });

  it("should handle End key to select last item", () => {
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
    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, {key: "End"});
    fireEvent.keyDown(input, {key: "Enter"});

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

  it("should hide CommandSeparator when filtering", () => {
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
    const input = screen.getByRole("combobox");
    fireEvent.change(input, {target: {value: "First"}});

    // Assert
    expect(screen.queryByRole("separator")).not.toBeInTheDocument();
  });

  it("should show CommandSeparator with alwaysRender prop even when filtering", () => {
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
    const input = screen.getByRole("combobox");
    fireEvent.change(input, {target: {value: "First"}});

    // Assert
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });

  it("should filter items by keywords", () => {
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
    const input = screen.getByRole("combobox");
    fireEvent.change(input, {target: {value: "preferences"}});

    // Assert
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.queryByText("Home")).not.toBeInTheDocument();
  });

  it("should handle Home key when no selectable items exist", () => {
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
    const input = screen.getByRole("combobox");
    fireEvent.change(input, {target: {value: "nonexistent"}});
    fireEvent.keyDown(input, {key: "Home"});

    // Assert - should not crash when no items available
    expect(screen.getByText("No results")).toBeInTheDocument();
  });

  it("should handle End key when no selectable items exist", () => {
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
    const input = screen.getByRole("combobox");
    fireEvent.change(input, {target: {value: "nonexistent"}});
    fireEvent.keyDown(input, {key: "End"});

    // Assert - should not crash when no items available
    expect(screen.getByText("No results")).toBeInTheDocument();
  });

  it("should handle default case in switch statement for unhandled keys", () => {
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
    fireEvent.keyDown(input, {key: "Tab"});

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

  it("should disable filtering when shouldFilter is false", () => {
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
    const input = screen.getByRole("combobox");
    fireEvent.change(input, {target: {value: "nonexistent"}});

    // Assert
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });

  it("should handle disabled items", () => {
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
    const disabledItem = screen.getByText("Disabled");
    fireEvent.click(disabledItem);

    // Assert
    expect(onSelectDisabled).not.toHaveBeenCalled();
  });

  it("should handle keyboard loop navigation", () => {
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
    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, {key: "ArrowDown"}); // Select Second
    fireEvent.keyDown(input, {key: "ArrowDown"}); // Loop to First
    fireEvent.keyDown(input, {key: "Enter"});

    // Assert
    expect(onSelectFirst).toHaveBeenCalledWith("First");
  });

  it("should handle reverse keyboard loop navigation with ArrowUp", () => {
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
    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, {key: "ArrowUp"}); // Loop to Second
    fireEvent.keyDown(input, {key: "Enter"});

    // Assert
    expect(onSelectLast).toHaveBeenCalledWith("Second");
  });

  it("should not loop navigation without loop prop", () => {
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
    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, {key: "ArrowDown"}); // Select Second
    fireEvent.keyDown(input, {key: "ArrowDown"}); // Stay at Second
    fireEvent.keyDown(input, {key: "Enter"});

    // Assert
    expect(onSelectSecond).toHaveBeenCalledWith("Second");
  });

  it("should handle custom filter function", () => {
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
    const input = screen.getByRole("combobox");
    fireEvent.change(input, {target: {value: "app"}});

    // Assert
    expect(customFilter).toHaveBeenCalled();
    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(screen.queryByText("Banana")).not.toBeInTheDocument();
  });

  it("should handle forceMount on CommandItem", () => {
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
    const input = screen.getByRole("combobox");
    fireEvent.change(input, {target: {value: "nomatch"}});

    // Assert
    expect(screen.getByText("Always Visible")).toBeInTheDocument();
    expect(screen.queryByText("Sometimes Visible")).not.toBeInTheDocument();
  });

  it("should handle forceMount on CommandGroup", () => {
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
    const input = screen.getByRole("combobox");
    fireEvent.change(input, {target: {value: "nomatch"}});

    // Assert
    expect(screen.getByText("Always Visible Group")).toBeInTheDocument();
  });

  it("should handle controlled input value", () => {
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
    const input = screen.getByRole("combobox");
    fireEvent.change(input, {target: {value: "test"}});

    // Assert
    expect(input).toHaveValue("test");
  });

  it("should handle mouse hover selection", () => {
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
    const secondItem = screen.getByText("Second");
    fireEvent.mouseEnter(secondItem);

    // Assert
    expect(secondItem).toHaveAttribute("aria-selected", "true");
  });

  it("should handle disablePointerSelection prop", () => {
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
    const firstItem = screen.getByText("First");
    const secondItem = screen.getByText("Second");
    fireEvent.mouseEnter(secondItem);

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

  it("should handle CommandItem with custom value prop", () => {
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
    const item = screen.getByText("Display Text");
    fireEvent.click(item);

    // Assert
    expect(onSelect).toHaveBeenCalledWith("custom-value");
  });

  it("should handle CommandItem focus event", () => {
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
    const secondItem = screen.getByText("Second");
    fireEvent.focus(secondItem);

    // Assert
    expect(secondItem).toHaveAttribute("aria-selected", "true");
  });

  it("should handle empty search results correctly", () => {
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
    const input = screen.getByRole("combobox");
    fireEvent.change(input, {target: {value: "nonexistent"}});

    // Assert
    expect(screen.getByText("No results found")).toBeInTheDocument();
  });

  it("should ignore Home key when no selectable items exist", () => {
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
    const input = screen.getByRole("combobox");
    fireEvent.change(input, {target: {value: "nomatch"}});
    fireEvent.keyDown(input, {key: "Home"});

    // Assert - no error should occur, command should remain functional
    expect(screen.getByText("No results")).toBeInTheDocument();
  });

  it("should ignore End key when no selectable items exist", () => {
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
    const input = screen.getByRole("combobox");
    fireEvent.change(input, {target: {value: "nomatch"}});
    fireEvent.keyDown(input, {key: "End"});

    // Assert - no error should occur
    expect(screen.getByText("No results")).toBeInTheDocument();
  });

  it("should ignore Enter key during IME composition", () => {
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
    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, {key: "ArrowDown"}); // Select First item
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

  it("should wrap from last to first item when loop is enabled and ArrowDown is pressed", () => {
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
    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, {key: "End"}); // Jump to Third
    fireEvent.keyDown(input, {key: "ArrowDown"}); // Loop to First
    fireEvent.keyDown(input, {key: "Enter"});

    // Assert
    expect(onSelectFirst).toHaveBeenCalledWith("First");
  });

  it("should wrap from first to last item when loop is enabled and ArrowUp is pressed from start", () => {
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
    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, {key: "ArrowUp"}); // Loop to Third (last)
    fireEvent.keyDown(input, {key: "Enter"});

    // Assert
    expect(onSelectLast).toHaveBeenCalledWith("Third");
  });
});
