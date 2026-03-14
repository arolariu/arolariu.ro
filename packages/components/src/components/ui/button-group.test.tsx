import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {ButtonGroup, ButtonGroupSeparator, ButtonGroupText} from "./button-group";

describe("ButtonGroup", () => {
  it("renders ButtonGroup components with children, custom classes, and forwarded refs", () => {
    // Arrange
    const groupRef = {current: null as HTMLDivElement | null};
    const textRef = {current: null as HTMLDivElement | null};

    // Act
    render(
      <ButtonGroup
        ref={groupRef}
        className='button-group-class'
        data-testid='button-group'>
        <button type='button'>Previous</button>
        <ButtonGroupSeparator />
        <ButtonGroupText
          ref={textRef}
          className='button-group-text-class'
          data-testid='button-group-text'>
          Navigation
        </ButtonGroupText>
      </ButtonGroup>,
    );

    // Assert
    const buttonGroup = screen.getByTestId("button-group");
    const buttonGroupText = screen.getByTestId("button-group-text");

    expect(buttonGroup).toHaveClass("button-group-class");
    expect(buttonGroupText).toHaveClass("button-group-text-class");
    expect(screen.getByRole("button", {name: "Previous"})).toBeInTheDocument();
    expect(screen.getByText("Navigation")).toBeInTheDocument();
    expect(screen.getByTestId("button-group").querySelector("[data-slot='button-group-separator']")).toBeInTheDocument();
    expect(groupRef.current).toBe(buttonGroup);
    expect(textRef.current).toBe(buttonGroupText);
  });
});
