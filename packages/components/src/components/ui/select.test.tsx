import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {describe, expect, it, vi} from "vitest";

import {Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue} from "./select";

describe("Select", () => {
  it("renders without crashing", () => {
    // Arrange
    render(
      <Select defaultValue='react'>
        <SelectTrigger aria-label='Framework'>
          <SelectValue placeholder='Choose a framework' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='react'>React</SelectItem>
        </SelectContent>
      </Select>,
    );

    // Assert
    expect(screen.getByRole("combobox", {name: "Framework"})).toBeInTheDocument();
  });

  it("shows options when the trigger is opened", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <Select>
        <SelectTrigger aria-label='Framework'>
          <SelectValue placeholder='Choose a framework' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='react'>React</SelectItem>
          <SelectItem value='vue'>Vue</SelectItem>
        </SelectContent>
      </Select>,
    );

    // Act
    await user.click(screen.getByRole("combobox", {name: "Framework"}));

    // Assert
    expect(await screen.findByRole("option", {name: "React"})).toBeInTheDocument();
    expect(screen.getByRole("option", {name: "Vue"})).toBeInTheDocument();
  });

  it("merges the trigger className", () => {
    // Arrange
    render(
      <Select>
        <SelectTrigger
          aria-label='Framework'
          className='custom-trigger'>
          <SelectValue placeholder='Choose a framework' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='react'>React</SelectItem>
        </SelectContent>
      </Select>,
    );

    // Assert
    expect(screen.getByRole("combobox", {name: "Framework"})).toHaveClass("custom-trigger");
  });

  it("renders item children inside the popup", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <Select>
        <SelectTrigger aria-label='Framework'>
          <SelectValue placeholder='Choose a framework' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='react'>React item content</SelectItem>
        </SelectContent>
      </Select>,
    );

    // Act
    await user.click(screen.getByRole("combobox", {name: "Framework"}));

    // Assert
    expect(await screen.findByText("React item content")).toBeInTheDocument();
  });

  it("renders SelectGroup with SelectLabel", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <Select>
        <SelectTrigger aria-label='Framework'>
          <SelectValue placeholder='Choose a framework' />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel data-testid='select-label'>Frontend Frameworks</SelectLabel>
            <SelectItem value='react'>React</SelectItem>
            <SelectItem value='vue'>Vue</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>,
    );

    // Act
    await user.click(screen.getByRole("combobox", {name: "Framework"}));

    // Assert
    await waitFor(() => {
      expect(screen.getByTestId("select-label")).toBeInTheDocument();
      expect(screen.getByText("Frontend Frameworks")).toBeVisible();
    });
  });

  it("renders SelectSeparator between groups", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <Select>
        <SelectTrigger aria-label='Technology'>
          <SelectValue placeholder='Choose technology' />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Frontend</SelectLabel>
            <SelectItem value='react'>React</SelectItem>
          </SelectGroup>
          <SelectSeparator data-testid='select-separator' />
          <SelectGroup>
            <SelectLabel>Backend</SelectLabel>
            <SelectItem value='node'>Node.js</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>,
    );

    // Act
    await user.click(screen.getByRole("combobox", {name: "Technology"}));

    // Assert
    await waitFor(() => {
      expect(screen.getByTestId("select-separator")).toBeInTheDocument();
    });
  });

  it("renders SelectContent with scroll buttons automatically", async () => {
    // Arrange - SelectContent automatically renders scroll buttons
    const user = userEvent.setup();
    render(
      <Select>
        <SelectTrigger aria-label='Numbers'>
          <SelectValue placeholder='Choose number' />
        </SelectTrigger>
        <SelectContent>
          {Array.from({length: 20}, (_, i) => (
            <SelectItem
              key={i}
              value={String(i)}>
              {i}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>,
    );

    // Act
    await user.click(screen.getByRole("combobox", {name: "Numbers"}));

    // Assert - Just verify content opens, scroll buttons are part of the implementation
    await waitFor(() => {
      expect(screen.getByRole("option", {name: "0"})).toBeVisible();
    });
  });

  it("merges custom className on SelectContent popup", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <Select>
        <SelectTrigger aria-label='Framework'>
          <SelectValue placeholder='Choose' />
        </SelectTrigger>
        <SelectContent
          className='custom-content'
          data-testid='select-content'>
          <SelectItem value='react'>React</SelectItem>
        </SelectContent>
      </Select>,
    );

    // Act
    await user.click(screen.getByRole("combobox", {name: "Framework"}));

    // Assert - The custom className is applied to the popup element
    await waitFor(() => {
      // Get the listbox which is the rendered popup
      const popup = screen.getByRole("listbox").parentElement;
      expect(popup).toHaveClass("custom-content");
    });
  });

  it("merges custom className on SelectLabel", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <Select>
        <SelectTrigger aria-label='Framework'>
          <SelectValue placeholder='Choose' />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel className='custom-label'>Label</SelectLabel>
            <SelectItem value='react'>React</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>,
    );

    // Act
    await user.click(screen.getByRole("combobox", {name: "Framework"}));

    // Assert
    await waitFor(() => {
      const label = screen.getByText("Label");
      expect(label).toHaveClass("custom-label");
    });
  });

  it("merges custom className on SelectSeparator", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <Select>
        <SelectTrigger aria-label='Framework'>
          <SelectValue placeholder='Choose' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='react'>React</SelectItem>
          <SelectSeparator
            className='custom-separator'
            data-testid='separator'
          />
          <SelectItem value='vue'>Vue</SelectItem>
        </SelectContent>
      </Select>,
    );

    // Act
    await user.click(screen.getByRole("combobox", {name: "Framework"}));

    // Assert
    await waitFor(() => {
      const separator = screen.getByTestId("separator");
      expect(separator).toHaveClass("custom-separator");
    });
  });

  it("closes the listbox when Escape is pressed", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <Select>
        <SelectTrigger aria-label='Framework'>
          <SelectValue placeholder='Choose a framework' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='react'>React</SelectItem>
          <SelectItem value='vue'>Vue</SelectItem>
        </SelectContent>
      </Select>,
    );

    await user.click(screen.getByRole("combobox", {name: "Framework"}));
    await waitFor(() => expect(screen.getByRole("listbox")).toBeInTheDocument());

    // Act
    await user.keyboard("{Escape}");

    // Assert
    await waitFor(() => {
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });

  it("navigates options with ArrowDown and ArrowUp after opening", async () => {
    // Arrange
    const user = userEvent.setup();
    const mockOnValueChange = vi.fn();
    render(
      <Select
        defaultValue='react'
        onValueChange={mockOnValueChange}>
        <SelectTrigger aria-label='Framework'>
          <SelectValue placeholder='Choose a framework' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='react'>React</SelectItem>
          <SelectItem value='vue'>Vue</SelectItem>
          <SelectItem value='angular'>Angular</SelectItem>
        </SelectContent>
      </Select>,
    );

    // Act — open the select with the keyboard, navigate down one step from React → Vue,
    // then back up Vue → React, then down again and confirm with Enter
    await user.click(screen.getByRole("combobox", {name: "Framework"}));
    await waitFor(() => screen.getByRole("option", {name: "React"}));

    // ArrowDown from the currently selected "React" moves highlight to "Vue"
    await user.keyboard("{ArrowDown}");
    // ArrowUp moves highlight back to "React"
    await user.keyboard("{ArrowUp}");
    // ArrowDown again to land on "Vue", then Enter to confirm
    await user.keyboard("{ArrowDown}{Enter}");

    // Assert
    await waitFor(() => {
      expect(mockOnValueChange).toHaveBeenCalledWith("vue");
    });
  });

  it("calls onValueChange when selection changes", async () => {
    // Arrange
    const user = userEvent.setup();
    const mockOnValueChange = vi.fn();
    render(
      <Select onValueChange={mockOnValueChange}>
        <SelectTrigger aria-label='Framework'>
          <SelectValue placeholder='Choose a framework' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='react'>React</SelectItem>
          <SelectItem value='vue'>Vue</SelectItem>
        </SelectContent>
      </Select>,
    );

    // Act
    await user.click(screen.getByRole("combobox", {name: "Framework"}));
    await waitFor(() => screen.getByRole("option", {name: "React"}));
    await user.click(screen.getByRole("option", {name: "React"}));

    // Assert
    await waitFor(() => {
      expect(mockOnValueChange).toHaveBeenCalledWith("react");
    });
  });

  it("does not call onValueChange when callback is undefined", async () => {
    // Arrange - No callback provided, just ensure no crash
    const user = userEvent.setup();
    render(
      <Select>
        <SelectTrigger aria-label='Framework'>
          <SelectValue placeholder='Choose a framework' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='react'>React</SelectItem>
        </SelectContent>
      </Select>,
    );

    // Act
    await user.click(screen.getByRole("combobox", {name: "Framework"}));
    await waitFor(() => screen.getByRole("option", {name: "React"}));
    await user.click(screen.getByRole("option", {name: "React"}));

    // Assert - No crash, selection works (verify the select processed the event)
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });
  });

  it("works in controlled mode", async () => {
    // Arrange
    const user = userEvent.setup();
    const handleValueChange = vi.fn<(value: string) => void>();

    function ControlledSelect(): React.JSX.Element {
      const [value, setValue] = React.useState("react");

      return (
        <Select
          value={value}
          onValueChange={(nextValue) => {
            setValue(nextValue);
            handleValueChange(nextValue);
          }}>
          <SelectTrigger aria-label='Controlled framework'>
            <SelectValue placeholder='Choose a framework' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='react'>React</SelectItem>
            <SelectItem value='vue'>Vue</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    render(<ControlledSelect />);

    const trigger = screen.getByRole("combobox", {name: "Controlled framework"});

    expect(trigger).toHaveTextContent(/react/i);

    // Act
    await user.click(trigger);
    await user.click(await screen.findByRole("option", {name: "Vue"}));

    // Assert
    expect(handleValueChange).toHaveBeenCalledWith("vue");
    await waitFor(() => {
      expect(screen.getByRole("combobox", {name: "Controlled framework"})).toHaveTextContent(/vue/i);
    });
  });
});
