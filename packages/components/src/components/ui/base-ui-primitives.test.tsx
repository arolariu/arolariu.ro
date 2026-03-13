import {fireEvent, render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {Checkbox} from "./checkbox";
import {CheckboxGroup} from "./checkbox-group";
import {Meter, MeterIndicator, MeterLabel, MeterTrack} from "./meter";
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
  NumberFieldScrubArea,
} from "./number-field";
import {Toolbar, ToolbarButton, ToolbarGroup, ToolbarLink, ToolbarSeparator} from "./toolbar";

describe("Base UI wrapper primitives", () => {
  it("renders a compact number field with stepper controls and scrub area", () => {
    // Arrange
    render(
      <NumberField defaultValue={2}>
        <NumberFieldGroup>
          <NumberFieldDecrement aria-label='Decrease value' />
          <NumberFieldInput aria-label='Quantity' />
          <NumberFieldIncrement aria-label='Increase value' />
          <NumberFieldScrubArea aria-label='Scrub quantity' />
        </NumberFieldGroup>
      </NumberField>,
    );

    // Act
    fireEvent.click(screen.getByRole("button", {name: "Increase value"}));

    // Assert
    expect(screen.getByRole("textbox", {name: "Quantity"})).toHaveValue("3");
    expect(screen.getByRole("presentation")).toBeInTheDocument();
  });

  it("renders a meter with track, indicator, and label", () => {
    // Arrange
    render(
      <Meter value={42}>
        <MeterLabel>Completion</MeterLabel>
        <MeterTrack>
          <MeterIndicator />
        </MeterTrack>
      </Meter>,
    );

    // Assert
    expect(screen.getByRole("meter", {name: "Completion"})).toHaveAttribute("aria-valuenow", "42");
    expect(screen.getByText("Completion")).toBeInTheDocument();
  });

  it("renders a toolbar with grouped actions and navigation", () => {
    // Arrange
    render(
      <Toolbar aria-label='Formatting tools'>
        <ToolbarGroup>
          <ToolbarButton>Bold</ToolbarButton>
          <ToolbarButton>Italic</ToolbarButton>
        </ToolbarGroup>
        <ToolbarSeparator />
        <ToolbarLink href='/preview'>Preview</ToolbarLink>
      </Toolbar>,
    );

    // Assert
    expect(screen.getByRole("toolbar", {name: "Formatting tools"})).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Bold"})).toBeInTheDocument();
    expect(screen.getByRole("link", {name: "Preview"})).toHaveAttribute("href", "/preview");
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });

  it("renders a checkbox group container for related checkbox controls", () => {
    // Arrange
    render(
      <CheckboxGroup>
        <Checkbox
          value='alpha'
          aria-label='Alpha'
        />
        <Checkbox
          value='beta'
          aria-label='Beta'
        />
      </CheckboxGroup>,
    );

    // Assert
    expect(screen.getByRole("group")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", {name: "Alpha"})).toBeInTheDocument();
    expect(screen.getByRole("checkbox", {name: "Beta"})).toBeInTheDocument();
  });
});
