import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {describe, expect, it, vi} from "vitest";

import {Collapsible, CollapsibleContent, CollapsibleTrigger} from "./collapsible";

function renderCollapsible({onOpenChange}: Readonly<{onOpenChange?: (open: boolean) => void}> = {}): HTMLElement {
  render(
    <Collapsible
      className='custom-root'
      data-testid='collapsible-root'
      onOpenChange={onOpenChange}>
      <CollapsibleTrigger className='custom-trigger'>Toggle details</CollapsibleTrigger>
      <CollapsibleContent
        className='custom-panel'
        data-testid='collapsible-panel'>
        Hidden details content
      </CollapsibleContent>
    </Collapsible>,
  );

  return screen.getByRole("button", {name: "Toggle details"});
}

describe("Collapsible", () => {
  it("preserves separate CollapsibleTrigger children with render", () => {
    render(
      <Collapsible>
        <CollapsibleTrigger render={<button />}>Details</CollapsibleTrigger>
        <CollapsibleContent>Body</CollapsibleContent>
      </Collapsible>,
    );

    expect(screen.getByRole("button", {name: "Details"})).toBeInTheDocument();
  });

  it("passes live primitive state to trigger and panel render callbacks", async () => {
    const user = userEvent.setup();
    const {rerender} = render(
      <Collapsible>
        <CollapsibleTrigger
          render={(props, state) => (
            <button
              {...props}
              data-open={String(state.open)}
              data-is-disabled={String(state.disabled)}
              data-transition={state.transitionStatus}
            />
          )}>
          Details
        </CollapsibleTrigger>
        <CollapsibleContent
          keepMounted
          render={(props, state) => (
            <section
              {...props}
              data-testid='render-panel'
              data-open={String(state.open)}
              data-transition={state.transitionStatus}
            />
          )}>
          Body
        </CollapsibleContent>
      </Collapsible>,
    );

    const trigger = screen.getByRole("button", {name: "Details"});
    const panel = screen.getByTestId("render-panel");
    expect(trigger).toHaveAttribute("data-open", "false");
    expect(trigger).toHaveAttribute("data-is-disabled", "false");
    expect(panel).toHaveAttribute("data-open", "false");
    expect(panel).not.toHaveAttribute("data-transition");

    await user.click(trigger);

    expect(trigger).toHaveAttribute("data-open", "true");
    expect(panel).toHaveAttribute("data-open", "true");
    expect(panel).toBeVisible();
    await waitFor(() => expect(panel).toHaveAttribute("data-transition", "idle"));

    rerender(
      <Collapsible disabled>
        <CollapsibleTrigger
          render={(props, state) => (
            <button
              {...props}
              data-open={String(state.open)}
              data-is-disabled={String(state.disabled)}
            />
          )}>
          Details
        </CollapsibleTrigger>
        <CollapsibleContent>Body</CollapsibleContent>
      </Collapsible>,
    );

    expect(trigger).toHaveAttribute("data-open", "true");
    expect(trigger).toHaveAttribute("data-is-disabled", "true");
    expect(trigger).toBeDisabled();
  });

  it("merges render element refs, classes, and handlers without submitting a form", async () => {
    const user = userEvent.setup();
    const rootRef = React.createRef<HTMLDivElement>();
    const triggerRef = React.createRef<HTMLButtonElement>();
    const childRef = React.createRef<HTMLButtonElement>();
    const panelRef = React.createRef<HTMLDivElement>();
    const clicks: string[] = [];
    const submit = vi.fn();
    render(
      <form onSubmit={submit}>
        <Collapsible ref={rootRef}>
          <CollapsibleTrigger
            ref={triggerRef}
            className='wrapper-trigger'
            onClick={() => clicks.push("wrapper")}
            render={
              <button
                ref={childRef}
                className='render-trigger'
                onClick={() => clicks.push("element")}
              />
            }>
            Details
          </CollapsibleTrigger>
          <CollapsibleContent
            ref={panelRef}
            className='wrapper-panel'
            render={<div className='render-panel' />}>
            Body
          </CollapsibleContent>
        </Collapsible>
      </form>,
    );

    const trigger = screen.getByRole("button", {name: "Details"});
    await user.click(trigger);

    expect(rootRef.current).toContainElement(trigger);
    expect(triggerRef.current).toBe(trigger);
    expect(childRef.current).toBe(trigger);
    expect(trigger).toHaveClass("wrapper-trigger", "render-trigger");
    expect(panelRef.current).toHaveClass("wrapper-panel", "render-panel");
    expect(clicks).toEqual(["element", "wrapper"]);
    expect(trigger).toHaveAttribute("aria-controls", panelRef.current?.id);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(submit).not.toHaveBeenCalled();
  });

  it("retains asChild content and cancellation through the real primitive handler", async () => {
    const user = userEvent.setup();
    const triggerRef = React.createRef<HTMLButtonElement>();
    const childRef = React.createRef<HTMLButtonElement>();
    const clicks: string[] = [];
    render(
      <Collapsible>
        <CollapsibleTrigger
          asChild
          ref={triggerRef}
          className='wrapper-trigger'
          onClick={() => clicks.push("wrapper")}>
          <button
            ref={childRef}
            className='child-trigger'
            onClick={(event) => {
              clicks.push("child");
              if ("preventBaseUIHandler" in event && typeof event.preventBaseUIHandler === "function") {
                event.preventBaseUIHandler();
              }
            }}>
            Details
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>Body</CollapsibleContent>
      </Collapsible>,
    );

    const trigger = screen.getByRole("button", {name: "Details"});
    await user.click(trigger);

    expect(triggerRef.current).toBe(trigger);
    expect(childRef.current).toBe(trigger);
    expect(trigger).toHaveClass("wrapper-trigger", "child-trigger");
    expect(clicks).toEqual(["child"]);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("forwards native change details so consumers can cancel opening", async () => {
    const user = userEvent.setup();
    const changes: {open: boolean; details: Collapsible.ChangeEventDetails}[] = [];
    render(
      <Collapsible
        onOpenChange={(open, details) => {
          changes.push({open, details});
          details.cancel();
        }}>
        <CollapsibleTrigger>Details</CollapsibleTrigger>
        <CollapsibleContent>Body</CollapsibleContent>
      </Collapsible>,
    );

    const trigger = screen.getByRole("button", {name: "Details"});
    await user.click(trigger);

    expect(changes).toHaveLength(1);
    expect(changes[0]?.open).toBe(true);
    expect(changes[0]?.details.reason).toBe("trigger-press");
    expect(changes[0]?.details.event.type).toBe("click");
    expect(changes[0]?.details.isCanceled).toBe(true);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps controlled false closed across rerenders and ignores disabled activation", async () => {
    const user = userEvent.setup();
    const changes: boolean[] = [];
    const {rerender} = render(
      <Collapsible
        open={false}
        onOpenChange={(open) => changes.push(open)}>
        <CollapsibleTrigger render={<button />}>Details</CollapsibleTrigger>
        <CollapsibleContent>Body</CollapsibleContent>
      </Collapsible>,
    );

    const trigger = screen.getByRole("button", {name: "Details"});
    trigger.focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(changes).toEqual([true, true]);
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    rerender(
      <Collapsible
        defaultOpen
        open={false}
        disabled
        onOpenChange={(open) => changes.push(open)}>
        <CollapsibleTrigger render={<button />}>Details</CollapsibleTrigger>
        <CollapsibleContent>Body</CollapsibleContent>
      </Collapsible>,
    );
    await user.click(trigger);
    await user.keyboard("{Enter} ");

    expect(trigger).toBeDisabled();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(changes).toEqual([true, true]);
  });

  it("preserves content supplied by a render element and falls back for non-element asChild content", () => {
    render(
      <>
        <Collapsible>
          <CollapsibleTrigger render={<button>Render element label</button>} />
          <CollapsibleContent>First body</CollapsibleContent>
        </Collapsible>
        <Collapsible>
          <CollapsibleTrigger asChild>Fallback label</CollapsibleTrigger>
          <CollapsibleContent>Second body</CollapsibleContent>
        </Collapsible>
      </>,
    );

    expect(screen.getByRole("button", {name: "Render element label"})).toHaveAttribute("type", "button");
    expect(screen.getByRole("button", {name: "Fallback label"})).toHaveAttribute("type", "button");
  });

  it("retains mounted panel input state across closing and reopening without remounting the trigger", async () => {
    const user = userEvent.setup();
    const {rerender} = render(
      <Collapsible defaultOpen>
        <CollapsibleTrigger render={<button />}>Details</CollapsibleTrigger>
        <CollapsibleContent keepMounted>
          <input aria-label='Notes' />
        </CollapsibleContent>
      </Collapsible>,
    );

    const trigger = screen.getByRole("button", {name: "Details"});
    const input = screen.getByRole("textbox", {name: "Notes"});
    await user.type(input, "Retained text");
    await user.click(trigger);
    await user.click(trigger);
    expect(screen.getByRole("textbox", {name: "Notes"})).toBe(input);
    expect(input).toHaveValue("Retained text");

    rerender(
      <Collapsible
        defaultOpen
        className='rerendered'>
        <CollapsibleTrigger render={<button />}>Details</CollapsibleTrigger>
        <CollapsibleContent keepMounted>
          <input aria-label='Notes' />
        </CollapsibleContent>
      </Collapsible>,
    );

    expect(screen.getByRole("button", {name: "Details"})).toBe(trigger);
    expect(trigger).toHaveFocus();
    expect(input).toHaveValue("Retained text");
  });

  it("keeps nested collapsible contexts independent", async () => {
    const user = userEvent.setup();
    render(
      <Collapsible defaultOpen>
        <CollapsibleTrigger>Parent</CollapsibleTrigger>
        <CollapsibleContent>
          <Collapsible>
            <CollapsibleTrigger render={<button />}>Child</CollapsibleTrigger>
            <CollapsibleContent>Nested body</CollapsibleContent>
          </Collapsible>
        </CollapsibleContent>
      </Collapsible>,
    );

    const parent = screen.getByRole("button", {name: "Parent"});
    const child = screen.getByRole("button", {name: "Child"});
    await user.click(child);

    expect(parent).toHaveAttribute("aria-expanded", "true");
    expect(child).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Nested body")).toBeVisible();
  });

  it("renders the structure, merges class names, and exposes accessibility attributes", () => {
    // Arrange
    const trigger = renderCollapsible();

    // Assert
    expect(screen.getByTestId("collapsible-root")).toHaveClass("custom-root");
    expect(trigger).toHaveClass("custom-trigger");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("type", "button");
  });

  it("expands and collapses the content when the trigger is clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    const trigger = renderCollapsible();

    // Act
    await user.click(trigger);

    // Assert
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("collapsible-panel")).toBeVisible();
    expect(screen.getByTestId("collapsible-panel")).toHaveClass("custom-panel");
    expect(screen.getByText("Hidden details content")).toBeInTheDocument();

    // Act
    await user.click(trigger);

    // Assert
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("calls onOpenChange with the updated open state", async () => {
    // Arrange
    const user = userEvent.setup();
    const handleOpenChange = vi.fn<(open: boolean) => void>();
    const trigger = renderCollapsible({onOpenChange: handleOpenChange});

    // Act
    await user.click(trigger);

    // Assert
    expect(handleOpenChange.mock.calls.at(-1)?.[0]).toBe(true);

    // Act
    await user.click(trigger);

    // Assert
    expect(handleOpenChange.mock.calls.at(-1)?.[0]).toBe(false);
  });

  it("works in controlled mode", async () => {
    // Arrange
    const user = userEvent.setup();
    const handleOpenChange = vi.fn<(open: boolean) => void>();

    function ControlledCollapsible(): React.JSX.Element {
      const [open, setOpen] = React.useState(false);

      return (
        <Collapsible
          open={open}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            handleOpenChange(nextOpen);
          }}>
          <CollapsibleTrigger>Toggle details</CollapsibleTrigger>
          <CollapsibleContent>Controlled details content</CollapsibleContent>
        </Collapsible>
      );
    }

    render(<ControlledCollapsible />);

    const trigger = screen.getByRole("button", {name: "Toggle details"});

    expect(trigger).toHaveAttribute("aria-expanded", "false");

    // Act
    await user.click(trigger);

    // Assert
    expect(handleOpenChange).toHaveBeenCalledWith(true);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Controlled details content")).toBeVisible();
  });

  it("supports rendering the trigger as a child element while preserving the non-asChild trigger path", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <Collapsible>
        <CollapsibleTrigger asChild>
          <button
            type='button'
            data-testid='trigger-child'>
            Toggle details
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent data-testid='collapsible-panel'>Hidden details content</CollapsibleContent>
      </Collapsible>,
    );

    const trigger = screen.getByTestId("trigger-child");

    // Assert
    expect(trigger.tagName).toBe("BUTTON");
    expect(screen.queryByRole("button", {name: "Toggle details"})).toBe(trigger);
    expect(trigger.querySelector("button")).toBeNull();
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    // Act
    await user.click(trigger);

    // Assert
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("collapsible-panel")).toBeVisible();
  });
});
