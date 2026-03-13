import {fireEvent, render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {NumberField, NumberFieldDecrement, NumberFieldGroup, NumberFieldIncrement, NumberFieldInput} from "./number-field";

describe("NumberField", () => {
  function renderNumberField(className?: string): ReturnType<typeof render> {
    return render(
      <NumberField
        aria-label='Quantity'
        className={className}
        defaultValue={2}
        step={1}>
        <NumberFieldGroup>
          <NumberFieldDecrement />
          <NumberFieldInput />
          <NumberFieldIncrement />
        </NumberFieldGroup>
      </NumberField>,
    );
  }

  it("renders without crashing", () => {
    // Arrange
    renderNumberField();

    // Assert
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("increments and decrements the displayed value", () => {
    // Arrange
    renderNumberField();
    const input = screen.getByRole("textbox");

    // Act
    fireEvent.click(screen.getByRole("button", {name: "Increase"}));
    fireEvent.click(screen.getByRole("button", {name: "Decrease"}));

    // Assert
    expect(input).toHaveValue("2");
  });

  it("merges the root className", () => {
    // Arrange
    const {container} = renderNumberField("custom-number-field");

    // Assert
    expect(container.firstElementChild).toHaveClass("custom-number-field");
  });

  it("renders custom increment children", () => {
    // Arrange
    render(
      <NumberField
        aria-label='Quantity'
        defaultValue={2}>
        <NumberFieldGroup>
          <NumberFieldDecrement />
          <NumberFieldInput />
          <NumberFieldIncrement>Increase</NumberFieldIncrement>
        </NumberFieldGroup>
      </NumberField>,
    );

    // Assert
    expect(screen.getByRole("button", {name: "Increase"})).toBeInTheDocument();
  });
});
