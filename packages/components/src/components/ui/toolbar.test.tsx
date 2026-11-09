import {act, render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {composeStories} from "storybook-react-rsbuild";
import {describe, expect, it, vi} from "vitest";

import {Toolbar, ToolbarButton, ToolbarGroup, ToolbarLink, ToolbarSeparator} from "./toolbar";
import * as stories from "./toolbar.stories";

describe("Toolbar", () => {
  it("uses a named primitive popup in the More options story and restores keyboard focus on Escape", async () => {
    const user = userEvent.setup();
    const {WithDropdown} = composeStories(stories);
    render(<WithDropdown />);
    const trigger = screen.getByRole("button", {name: "More options"});
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.click(trigger);
    const popup = await screen.findByRole("dialog", {name: "More editor actions"});
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(popup).toContainElement(screen.getByRole("button", {name: "Clear formatting"}));
    await user.keyboard("{Escape}");
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
  it("supplies primitive disabled state to ToolbarButton render", () => {
    render(
      <Toolbar aria-label='Editor'>
        <ToolbarButton
          disabled
          render={(props, state) => (
            <button
              {...props}
              data-contract-disabled={String(state.disabled)}>
              Bold
            </button>
          )}
        />
      </Toolbar>,
    );

    expect(screen.getByRole("button", {name: "Bold"})).toHaveAttribute("data-contract-disabled", "true");
  });

  it.each(["root", "button", "group", "separator", "link"])("supplies owning state and className callbacks to %s", (part) => {
    render(
      <Toolbar
        aria-label='Stateful editor'
        orientation='vertical'
        className={(state) => `root-${state.orientation}`}
        render={(props, state) => (
          <div
            {...props}
            data-testid='root'
            data-orientation-contract={state.orientation}
          />
        )}>
        <ToolbarGroup
          className={(state) => `group-${state.orientation}`}
          render={(props, state) => (
            <div
              {...props}
              data-testid='group'
              data-orientation-contract={state.orientation}
            />
          )}>
          <ToolbarButton
            className={(state) => `button-${state.orientation}`}
            render={(props, state) => (
              <button
                {...props}
                data-testid='button'
                data-orientation-contract={state.orientation}
              />
            )}>
            Bold
          </ToolbarButton>
        </ToolbarGroup>
        <ToolbarSeparator
          className={(state) => `separator-${state.orientation}`}
          render={(props, state) => (
            <div
              {...props}
              data-testid='separator'
              data-orientation-contract={state.orientation}
            />
          )}
        />
        <ToolbarLink
          href='/help'
          className={(state) => `link-${state.orientation}`}
          render={(props, state) => (
            <a
              {...props}
              data-testid='link'
              data-orientation-contract={state.orientation}
            />
          )}>
          Help
        </ToolbarLink>
      </Toolbar>,
    );

    const orientation = part === "separator" ? "horizontal" : "vertical";
    expect(screen.getByTestId(part)).toHaveAttribute("data-orientation-contract", orientation);
    expect(screen.getByTestId(part)).toHaveClass(`${part}-${orientation}`);
  });

  it.each(["element", "callback"] as const)("preserves every %s-rendered part's children, classes, refs and cleanup", async (mode) => {
    const user = userEvent.setup();
    const attached: HTMLElement[] = [];
    const cleaned = vi.fn<(node: HTMLElement) => void>();
    const renderCleaned = vi.fn<(node: HTMLElement) => void>();
    const ref = (node: HTMLElement | null): (() => void) | undefined => {
      if (!node) return undefined;
      attached.push(node);
      return () => cleaned(node);
    };
    const renderRef = (node: HTMLElement | null): (() => void) | undefined => (node ? () => renderCleaned(node) : undefined);
    const clicks: string[] = [];
    const {unmount} = render(
      <Toolbar
        ref={ref}
        aria-label='Composed editor'
        className='root-custom'
        render={
          mode === "element" ? (
            <div
              ref={renderRef}
              className='root-render'
            />
          ) : (
            (props) => <div {...props} />
          )
        }>
        <ToolbarGroup
          ref={ref}
          data-testid='group'
          className='group-custom'
          render={
            mode === "element" ? (
              <div
                ref={renderRef}
                className='group-render'
              />
            ) : (
              (props) => <div {...props} />
            )
          }>
          <ToolbarButton
            ref={ref}
            className='button-custom'
            onClick={() => clicks.push("wrapper")}
            render={
              mode === "element" ? (
                <button
                  ref={renderRef}
                  className='button-render'
                  onClick={() => clicks.push("render")}>
                  Rendered button
                </button>
              ) : (
                (props) => <button {...props} />
              )
            }>
            Wrapper button
          </ToolbarButton>
        </ToolbarGroup>
        <ToolbarSeparator
          ref={ref}
          className='separator-custom'
          render={
            mode === "element" ? (
              <div
                ref={renderRef}
                className='separator-render'
              />
            ) : (
              (props) => <div {...props} />
            )
          }
        />
        <ToolbarLink
          ref={ref}
          href='#help'
          className='link-custom'
          render={
            mode === "element" ? (
              <a
                ref={renderRef}
                className='link-render'>
                Rendered link
              </a>
            ) : (
              (props) => <a {...props} />
            )
          }>
          Wrapper link
        </ToolbarLink>
      </Toolbar>,
    );
    const parts = {
      root: screen.getByRole("toolbar", {name: "Composed editor"}),
      group: screen.getByTestId("group"),
      button: screen.getByRole("button", {name: mode === "element" ? "Rendered button" : "Wrapper button"}),
      separator: screen.getByRole("separator"),
      link: screen.getByRole("link", {name: mode === "element" ? "Rendered link" : "Wrapper link"}),
    };
    for (const [part, node] of Object.entries(parts)) {
      expect(attached).toContain(node);
      expect(node).toHaveClass(`${part}-custom`);
      if (mode === "element") expect(node).toHaveClass(`${part}-render`);
    }
    expect(parts.group).toContainElement(parts.button);
    expect(parts.link).toHaveAttribute("href", "#help");
    await user.click(parts.button);
    expect(clicks).toEqual(mode === "element" ? ["render", "wrapper"] : ["wrapper"]);
    unmount();
    for (const node of Object.values(parts)) {
      expect(cleaned).toHaveBeenCalledWith(node);
      if (mode === "element") expect(renderCleaned).toHaveBeenCalledWith(node);
    }
    expect(cleaned).toHaveBeenCalledTimes(5);
    expect(renderCleaned).toHaveBeenCalledTimes(mode === "element" ? 5 : 0);
  });

  it.each([
    {orientation: "horizontal" as const, next: "{ArrowRight}", previous: "{ArrowLeft}"},
    {orientation: "vertical" as const, next: "{ArrowDown}", previous: "{ArrowUp}"},
  ])("preserves $orientation roving focus, Home/End, disabled skipping and native links", async ({orientation, next, previous}) => {
    const user = userEvent.setup();
    const activations: string[] = [];
    render(
      <Toolbar
        aria-label='Navigation'
        orientation={orientation}>
        <ToolbarButton>First</ToolbarButton>
        <ToolbarButton
          disabled
          focusableWhenDisabled={false}>
          Unavailable
        </ToolbarButton>
        <ToolbarLink
          href='#docs'
          onClick={(event) => {
            event.preventDefault();
            activations.push("docs");
          }}>
          Docs
        </ToolbarLink>
        <ToolbarButton>Last</ToolbarButton>
      </Toolbar>,
    );
    const first = screen.getByRole("button", {name: "First"});
    const unavailable = screen.getByRole("button", {name: "Unavailable"});
    const link = screen.getByRole("link", {name: "Docs"});
    const last = screen.getByRole("button", {name: "Last"});
    expect(screen.getByRole("toolbar")).toHaveAttribute("aria-orientation", orientation);
    expect(link).toHaveAttribute("href", "#docs");
    expect(unavailable).toBeDisabled();
    await user.tab();
    expect(first).toHaveFocus();
    await user.keyboard(next);
    expect(link).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(activations).toEqual(["docs"]);
    await user.keyboard(next);
    expect(last).toHaveFocus();
    await user.keyboard(previous);
    expect(link).toHaveFocus();
    await user.keyboard("{Home}");
    expect(link).toHaveFocus();
    await user.keyboard("{End}");
    expect(link).toHaveFocus();
  });

  it("updates inherited disabled and orientation state on rerender without losing DOM refs", async () => {
    const user = userEvent.setup();
    const buttonRef = React.createRef<HTMLButtonElement>();
    const clicks: string[] = [];
    const fixture = (disabled: boolean, orientation: Toolbar.State["orientation"]): React.ReactElement => (
      <Toolbar
        disabled={disabled}
        orientation={orientation}
        aria-label='Controlled editor'
        className={(state) => `root-${state.orientation}-${state.disabled}`}>
        <ToolbarGroup
          className={(state) => `group-${state.disabled}`}
          data-testid='group'>
          <ToolbarButton
            ref={buttonRef}
            onClick={() => clicks.push("bold")}
            className={(state) => `button-${state.disabled}`}
            render={(props, state) => (
              <button
                {...props}
                data-contract-disabled={String(state.disabled)}
              />
            )}>
            Bold
          </ToolbarButton>
        </ToolbarGroup>
        <ToolbarSeparator />
        <ToolbarLink
          href='#help'
          className={(state) => `link-${state.orientation}`}>
          Help
        </ToolbarLink>
      </Toolbar>
    );
    const {rerender} = render(fixture(false, "horizontal"));
    const button = screen.getByRole("button", {name: "Bold"});
    await user.click(button);
    expect(clicks).toEqual(["bold"]);
    rerender(fixture(true, "vertical"));
    expect(buttonRef.current).toBe(button);
    expect(button).toHaveClass("button-true");
    expect(button).toHaveAttribute("data-contract-disabled", "true");
    expect(screen.getByRole("toolbar")).toHaveClass("root-vertical-true");
    expect(screen.getByTestId("group")).toHaveClass("group-true");
    expect(screen.getByRole("link")).toHaveClass("link-vertical");
    expect(screen.getByRole("separator")).toHaveAttribute("aria-orientation", "horizontal");
    await user.click(button);
    act(() => button.focus());
    await user.keyboard("{Enter} ");
    expect(clicks).toEqual(["bold"]);
  });

  it("preserves group-specific disabled state and non-native button activation", async () => {
    const user = userEvent.setup();
    const clicks: string[] = [];
    render(
      <Toolbar aria-label='Custom controls'>
        <ToolbarGroup disabled>
          <ToolbarButton
            nativeButton={false}
            onClick={() => clicks.push("disabled")}
            render={(props, state) => (
              <span
                {...props}
                data-contract-disabled={String(state.disabled)}
              />
            )}>
            Disabled custom button
          </ToolbarButton>
        </ToolbarGroup>
        <ToolbarButton
          nativeButton={false}
          render={<span />}
          onClick={() => clicks.push("enabled")}>
          Custom button
        </ToolbarButton>
      </Toolbar>,
    );
    const disabled = screen.getByRole("button", {name: "Disabled custom button"});
    const enabled = screen.getByRole("button", {name: "Custom button"});
    expect(disabled).toHaveAttribute("aria-disabled", "true");
    expect(disabled).toHaveAttribute("data-contract-disabled", "true");
    await user.click(disabled);
    act(() => disabled.focus());
    await user.keyboard("{Enter} ");
    expect(clicks).toEqual([]);
    act(() => enabled.focus());
    await user.keyboard("{Enter} ");
    expect(clicks).toEqual(["enabled", "enabled"]);
  });

  it("retains focusable disabled buttons in roving focus unless opted out", async () => {
    const user = userEvent.setup();
    const clicks: string[] = [];
    render(
      <Toolbar aria-label='Focusable disabled actions'>
        <ToolbarButton>First</ToolbarButton>
        <ToolbarButton
          disabled
          onClick={() => clicks.push("unavailable")}>
          Unavailable
        </ToolbarButton>
        <ToolbarButton>Last</ToolbarButton>
      </Toolbar>,
    );
    await user.tab();
    await user.keyboard("{ArrowRight}");
    const unavailable = screen.getByRole("button", {name: "Unavailable"});
    expect(unavailable).toHaveFocus();
    expect(unavailable).toHaveAttribute("aria-disabled", "true");
    expect(unavailable).not.toBeDisabled();
    await user.keyboard("{Enter} ");
    expect(clicks).toEqual([]);
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", {name: "Last"})).toHaveFocus();
  });

  it("does not submit its containing form from default toolbar buttons and preserves canceled events", async () => {
    const user = userEvent.setup();
    const submitted = vi.fn();
    const clicks: string[] = [];
    render(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitted();
        }}>
        <Toolbar aria-label='Form actions'>
          <ToolbarButton onClick={() => clicks.push("save")}>Save</ToolbarButton>
          <ToolbarButton
            nativeButton={false}
            onKeyDown={(event) => event.preventBaseUIHandler()}
            render={<span />}
            onClick={() => clicks.push("canceled")}>
            Canceled
          </ToolbarButton>
        </Toolbar>
      </form>,
    );
    const save = screen.getByRole("button", {name: "Save"});
    expect(save).toHaveAttribute("type", "button");
    await user.click(save);
    act(() => screen.getByRole("button", {name: "Canceled"}).focus());
    await user.keyboard("{Enter} ");
    expect(clicks).toEqual(["save"]);
    expect(submitted).not.toHaveBeenCalled();
  });

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
