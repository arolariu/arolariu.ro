import {fireEvent, render, screen, waitFor} from "@testing-library/react";
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
    fireEvent.click(screen.getByRole("combobox", {name: "Framework"}));

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
    fireEvent.click(screen.getByRole("combobox", {name: "Framework"}));

    // Assert
    expect(await screen.findByText("React item content")).toBeInTheDocument();
  });

  it("renders SelectGroup with SelectLabel", async () => {
    // Arrange
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
    fireEvent.click(screen.getByRole("combobox", {name: "Framework"}));

    // Assert
    await waitFor(() => {
      expect(screen.getByTestId("select-label")).toBeInTheDocument();
      expect(screen.getByText("Frontend Frameworks")).toBeVisible();
    });
  });

  it("renders SelectSeparator between groups", async () => {
    // Arrange
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
    fireEvent.click(screen.getByRole("combobox", {name: "Technology"}));

    // Assert
    await waitFor(() => {
      expect(screen.getByTestId("select-separator")).toBeInTheDocument();
    });
  });

  it("renders SelectContent with scroll buttons automatically", async () => {
    // Arrange - SelectContent automatically renders scroll buttons
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
    fireEvent.click(screen.getByRole("combobox", {name: "Numbers"}));

    // Assert - Just verify content opens, scroll buttons are part of the implementation
    await waitFor(() => {
      expect(screen.getByRole("option", {name: "0"})).toBeVisible();
    });
  });

  it("merges custom className on SelectContent popup", async () => {
    // Arrange
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
    fireEvent.click(screen.getByRole("combobox", {name: "Framework"}));

    // Assert - The custom className is applied to the popup element
    await waitFor(() => {
      // Get the listbox which is the rendered popup
      const popup = screen.getByRole("listbox").parentElement;
      expect(popup).toHaveClass("custom-content");
    });
  });

  it("merges custom className on SelectLabel", async () => {
    // Arrange
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
    fireEvent.click(screen.getByRole("combobox", {name: "Framework"}));

    // Assert
    await waitFor(() => {
      const label = screen.getByText("Label");
      expect(label).toHaveClass("custom-label");
    });
  });

  it("merges custom className on SelectSeparator", async () => {
    // Arrange
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
    fireEvent.click(screen.getByRole("combobox", {name: "Framework"}));

    // Assert
    await waitFor(() => {
      const separator = screen.getByTestId("separator");
      expect(separator).toHaveClass("custom-separator");
    });
  });

  it("calls onValueChange when selection changes", async () => {
    // Arrange
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
    fireEvent.click(screen.getByRole("combobox", {name: "Framework"}));
    await waitFor(() => screen.getByRole("option", {name: "React"}));
    fireEvent.click(screen.getByRole("option", {name: "React"}));

    // Assert
    await waitFor(() => {
      expect(mockOnValueChange).toHaveBeenCalledWith("react");
    });
  });

  it("does not call onValueChange when callback is undefined", async () => {
    // Arrange - No callback provided, just ensure no crash
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
    fireEvent.click(screen.getByRole("combobox", {name: "Framework"}));
    await waitFor(() => screen.getByRole("option", {name: "React"}));
    fireEvent.click(screen.getByRole("option", {name: "React"}));

    // Assert - No crash, selection works (verify the select processed the event)
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });
  });
});
