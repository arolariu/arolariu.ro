import {fireEvent, render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
  NumberFieldScrubArea,
} from "./number-field";

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

  it("renders default increment symbol when no children provided", () => {
    // Arrange
    renderNumberField();

    // Assert
    const incrementButton = screen.getByRole("button", {name: "Increase"});
    expect(incrementButton).toHaveTextContent("+");
  });

  it("renders default decrement symbol when no children provided", () => {
    // Arrange
    renderNumberField();

    // Assert
    const decrementButton = screen.getByRole("button", {name: "Decrease"});
    expect(decrementButton).toHaveTextContent("−");
  });

  it("renders custom decrement children", () => {
    // Arrange
    render(
      <NumberField
        aria-label='Quantity'
        defaultValue={5}>
        <NumberFieldGroup>
          <NumberFieldDecrement>Decrement</NumberFieldDecrement>
          <NumberFieldInput />
          <NumberFieldIncrement />
        </NumberFieldGroup>
      </NumberField>,
    );

    // Assert
    expect(screen.getByRole("button", {name: "Decrease"})).toHaveTextContent("Decrement");
  });

  it("renders NumberFieldScrubArea with default scrub handle", () => {
    // Arrange
    render(
      <NumberField
        aria-label='Quantity'
        defaultValue={10}>
        <NumberFieldGroup>
          <NumberFieldScrubArea data-testid='scrub-area' />
          <NumberFieldInput />
        </NumberFieldGroup>
      </NumberField>,
    );

    // Assert
    const scrubArea = screen.getByTestId("scrub-area");
    expect(scrubArea).toBeInTheDocument();
    expect(scrubArea).toHaveTextContent("⋮⋮");
  });

  it("renders NumberFieldScrubArea with custom children", () => {
    // Arrange
    render(
      <NumberField
        aria-label='Quantity'
        defaultValue={10}>
        <NumberFieldGroup>
          <NumberFieldScrubArea data-testid='scrub-area'>
            <span>Custom Scrub</span>
          </NumberFieldScrubArea>
          <NumberFieldInput />
        </NumberFieldGroup>
      </NumberField>,
    );

    // Assert
    const scrubArea = screen.getByTestId("scrub-area");
    expect(scrubArea).toHaveTextContent("Custom Scrub");
  });
});
