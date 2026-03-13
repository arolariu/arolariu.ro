import {fireEvent, render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "./select";

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
});
