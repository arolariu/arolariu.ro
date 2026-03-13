import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {Toolbar, ToolbarButton, ToolbarSeparator} from "./toolbar";

describe("Toolbar", () => {
  it("renders Toolbar, ToolbarButton, and ToolbarSeparator with className and forwarded refs", () => {
    // Arrange
    const toolbarRef = {current: null as HTMLDivElement | null};
    const buttonRef = {current: null as HTMLButtonElement | null};
    const separatorRef = {current: null as HTMLDivElement | null};

    // Act
    render(
      <Toolbar
        ref={toolbarRef}
        aria-label='Editor actions'
        className='toolbar-class'
        data-testid='toolbar'>
        <ToolbarButton
          ref={buttonRef}
          className='toolbar-button-class'>
          Bold
        </ToolbarButton>
        <ToolbarSeparator
          ref={separatorRef}
          className='toolbar-separator-class'
          data-testid='toolbar-separator'
        />
      </Toolbar>,
    );

    // Assert
    const toolbar = screen.getByTestId("toolbar");
    const button = screen.getByRole("button", {name: "Bold"});
    const separator = screen.getByTestId("toolbar-separator");

    expect(toolbar).toHaveClass("toolbar-class");
    expect(button).toHaveClass("toolbar-button-class");
    expect(separator).toHaveClass("toolbar-separator-class");
    expect(toolbarRef.current).toBe(toolbar);
    expect(buttonRef.current).toBe(button);
    expect(separatorRef.current).toBe(separator);
  });
});
