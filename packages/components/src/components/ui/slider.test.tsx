import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {describe, expect, it, vi} from "vitest";

import {Slider} from "./slider";

describe("Slider", () => {
  it("renders without crashing", () => {
    // Arrange
    render(
      <Slider
        aria-label='Volume'
        defaultValue={[25]}
      />,
    );

    // Assert
    expect(screen.getByRole("group", {name: "Volume"})).toBeInTheDocument();
    expect(screen.getByRole("slider")).toBeInTheDocument();
  });

  it("forwards its ref to the slider root DOM element", () => {
    // Arrange
    const ref = React.createRef<HTMLDivElement>();
    const {container} = render(
      <Slider
        ref={ref}
        aria-label='Forwarded slider'
        defaultValue={[25]}
      />,
    );

    // Assert
    expect(ref.current).toBe(container.firstElementChild);
  });

  it("merges custom class names", () => {
    // Arrange
    render(
      <Slider
        aria-label='Styled slider'
        defaultValue={[25]}
        className='custom-slider'
      />,
    );

    // Assert
    expect(screen.getByRole("group", {name: "Styled slider"})).toHaveClass("custom-slider");
  });

  it("updates value when changed with keyboard input", async () => {
    // Arrange
    const user = userEvent.setup();
    const handleValueChange = vi.fn<(value: number[], eventDetails: unknown) => void>();

    render(
      <Slider
        aria-label='Brightness'
        defaultValue={[20]}
        min={0}
        max={100}
        step={10}
        onValueChange={handleValueChange}
      />,
    );

    const slider = screen.getByRole("slider");

    // Assert
    expect(screen.getByRole("group", {name: "Brightness"})).toBeInTheDocument();

    // Act
    slider.focus();
    await user.keyboard("{ArrowRight}");

    // Assert
    expect(slider).toHaveAttribute("aria-valuenow", "30");
    expect(handleValueChange.mock.calls.at(-1)?.[0]).toEqual([30]);
  });

  it("marks disabled sliders with data-disabled", () => {
    // Arrange
    const {container} = render(
      <Slider
        aria-label='Disabled slider'
        defaultValue={[20]}
        disabled
      />,
    );

    // Assert
    expect(container.firstElementChild).toHaveAttribute("data-disabled");
  });

  it("supports keyboard adjustments with arrow keys", async () => {
    // Arrange
    const user = userEvent.setup();

    render(
      <Slider
        aria-label='Contrast'
        defaultValue={[50]}
        min={0}
        max={100}
        step={10}
      />,
    );

    const slider = screen.getByRole("slider");

    // Assert
    expect(screen.getByRole("group", {name: "Contrast"})).toBeInTheDocument();

    // Act
    slider.focus();
    await user.keyboard("{ArrowRight}{ArrowLeft}");

    // Assert
    expect(slider).toHaveAttribute("aria-valuenow", "50");
  });

  it("exposes accessible slider semantics", () => {
    // Arrange
    render(
      <Slider
        aria-label='Accessible slider'
        value={[40]}
        min={0}
        max={100}
      />,
    );

    const slider = screen.getByRole("slider");

    // Assert
    expect(screen.getByRole("group", {name: "Accessible slider"})).toBeInTheDocument();
    expect(slider).toHaveAttribute("min", "0");
    expect(slider).toHaveAttribute("max", "100");
    expect(slider).toHaveAttribute("aria-orientation", "horizontal");
    expect(slider).toHaveAttribute("aria-valuenow", "40");
  });
});
