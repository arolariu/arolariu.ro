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
});
