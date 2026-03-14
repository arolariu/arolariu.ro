import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {Toolbar, ToolbarButton, ToolbarGroup, ToolbarLink, ToolbarSeparator} from "./toolbar";

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

  it("renders ToolbarButton with correct classes and ref", () => {
    const buttonRef = {current: null as HTMLButtonElement | null};

    render(
      <Toolbar aria-label='Format'>
        <ToolbarButton
          ref={buttonRef}
          className='custom-button-class'>
          Bold
        </ToolbarButton>
      </Toolbar>,
    );

    const button = screen.getByRole("button", {name: "Bold"});
    expect(button).toHaveClass("custom-button-class");
    expect(buttonRef.current).toBe(button);
  });

  it("renders ToolbarLink with href and ref", () => {
    const linkRef = {current: null as HTMLAnchorElement | null};

    render(
      <Toolbar aria-label='Actions'>
        <ToolbarLink
          ref={linkRef}
          href='/docs'
          className='toolbar-link-class'>
          Documentation
        </ToolbarLink>
      </Toolbar>,
    );

    const link = screen.getByRole("link", {name: "Documentation"});
    expect(link).toHaveAttribute("href", "/docs");
    expect(link).toHaveClass("toolbar-link-class");
    expect(linkRef.current).toBe(link);
  });

  it("renders ToolbarSeparator with correct class", () => {
    const separatorRef = {current: null as HTMLDivElement | null};

    render(
      <Toolbar aria-label='Editor'>
        <ToolbarButton>Cut</ToolbarButton>
        <ToolbarSeparator
          ref={separatorRef}
          className='custom-separator'
          data-testid='separator'
        />
        <ToolbarButton>Paste</ToolbarButton>
      </Toolbar>,
    );

    const separator = screen.getByTestId("separator");
    expect(separator).toHaveClass("custom-separator");
    expect(separatorRef.current).toBe(separator);
  });

  it("renders ToolbarGroup with children", () => {
    const groupRef = {current: null as HTMLDivElement | null};

    render(
      <Toolbar aria-label='Format'>
        <ToolbarGroup
          ref={groupRef}
          className='toolbar-group-class'
          data-testid='toolbar-group'>
          <ToolbarButton>Left</ToolbarButton>
          <ToolbarButton>Center</ToolbarButton>
          <ToolbarButton>Right</ToolbarButton>
        </ToolbarGroup>
      </Toolbar>,
    );

    const group = screen.getByTestId("toolbar-group");
    expect(group).toHaveClass("toolbar-group-class");
    expect(groupRef.current).toBe(group);

    // Verify all buttons are rendered inside the group
    expect(screen.getByRole("button", {name: "Left"})).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Center"})).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Right"})).toBeInTheDocument();
  });

  it("renders complex toolbar with all components", () => {
    render(
      <Toolbar
        aria-label='Text editor'
        data-testid='complex-toolbar'>
        <ToolbarGroup>
          <ToolbarButton>Bold</ToolbarButton>
          <ToolbarButton>Italic</ToolbarButton>
        </ToolbarGroup>
        <ToolbarSeparator data-testid='separator-1' />
        <ToolbarGroup>
          <ToolbarButton>Undo</ToolbarButton>
          <ToolbarButton>Redo</ToolbarButton>
        </ToolbarGroup>
        <ToolbarSeparator data-testid='separator-2' />
        <ToolbarLink href='/help'>Help</ToolbarLink>
      </Toolbar>,
    );

    const toolbar = screen.getByTestId("complex-toolbar");
    expect(toolbar).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Bold"})).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Italic"})).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Undo"})).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Redo"})).toBeInTheDocument();
    expect(screen.getByRole("link", {name: "Help"})).toBeInTheDocument();
    expect(screen.getByTestId("separator-1")).toBeInTheDocument();
    expect(screen.getByTestId("separator-2")).toBeInTheDocument();
  });
});
