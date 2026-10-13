import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {createRef, StrictMode} from "react";
import {describe, expect, it} from "vitest";

import {FocusScope} from "./focus-scope";

describe("FocusScope", () => {
  it("includes a visibly overridden descendant of a visibility-hidden ancestor", () => {
    const {rerender} = render(
      <FocusScope>
        <div data-testid='visibility-owner'>
          <button type='button'>Visible override</button>
        </div>
        <button type='button'>Later control</button>
      </FocusScope>,
    );
    const visible = screen.getByRole("button", {name: "Visible override"});
    screen.getByTestId("visibility-owner").style.visibility = "hidden";
    visible.style.visibility = "visible";

    rerender(
      <FocusScope autoFocus>
        <div data-testid='visibility-owner'>
          <button type='button'>Visible override</button>
        </div>
        <button type='button'>Later control</button>
      </FocusScope>,
    );

    expect(visible).toHaveFocus();
  });

  it("uses native editable content without an explicit tabIndex as the first tabbable", () => {
    render(
      <FocusScope autoFocus>
        <div
          contentEditable
          suppressContentEditableWarning
          aria-label='Editable draft'>
          Draft
        </div>
        <button type='button'>Later control</button>
      </FocusScope>,
    );

    expect(screen.getByLabelText("Editable draft")).toHaveFocus();
  });

  it("includes the native first summary but excludes content inside closed details", async () => {
    const user = userEvent.setup();
    render(
      <FocusScope autoFocus>
        <details>
          <summary>Available summary</summary>
          <button type='button'>Closed detail action</button>
        </details>
        <button type='button'>Last available</button>
      </FocusScope>,
    );
    const summary = screen.getByText("Available summary");
    expect(summary).toHaveFocus();

    await user.tab({shift: true});

    expect(screen.getByRole("button", {name: "Last available"})).toHaveFocus();
  });

  it("does not choose an unchecked radio beyond the checked radio group's Tab stop", async () => {
    const user = userEvent.setup();
    render(
      <>
        <FocusScope>
          <button type='button'>First</button>
          <label>
            <input
              type='radio'
              name='choice'
              defaultChecked
            />
            Checked
          </label>
          <button type='button'>Final available</button>
          <label>
            <input
              type='radio'
              name='choice'
            />
            Unchecked final
          </label>
        </FocusScope>
        <button type='button'>Outside</button>
      </>,
    );
    screen.getByRole("button", {name: "Final available"}).focus();

    await user.tab();

    expect(screen.getByRole("button", {name: "First"})).toHaveFocus();
  });

  it("orders positive tab stops before ordinary controls when selecting the cycle edges", async () => {
    const user = userEvent.setup();
    render(
      <FocusScope autoFocus>
        <button
          type='button'
          tabIndex={2}>
          Second priority
        </button>
        <button
          type='button'
          tabIndex={1}>
          First priority
        </button>
        <button type='button'>Final ordinary</button>
      </FocusScope>,
    );
    expect(screen.getByRole("button", {name: "First priority"})).toHaveFocus();
    await user.tab({shift: true});
    expect(screen.getByRole("button", {name: "Final ordinary"})).toHaveFocus();
  });

  it("keeps controls in a disabled fieldset's first legend available", () => {
    render(
      <FocusScope autoFocus>
        <fieldset disabled>
          <legend>
            <button type='button'>Legend exception</button>
          </legend>
          <button type='button'>Disabled fieldset content</button>
        </fieldset>
        <button type='button'>Later control</button>
      </FocusScope>,
    );
    expect(screen.getByRole("button", {name: "Legend exception"})).toHaveFocus();
  });

  it("honors React callback ref cleanup on unmount", () => {
    let connected: HTMLDivElement | null = null;
    let cleanups = 0;
    const {unmount} = render(
      <FocusScope
        ref={(node) => {
          connected = node;
          return () => {
            connected = null;
            cleanups++;
          };
        }}>
        Content
      </FocusScope>,
    );
    expect(connected).toBe(screen.getByRole("group"));
    unmount();
    expect(connected).toBeNull();
    expect(cleanups).toBe(1);
  });

  it("captures and restores the trigger across Strict Mode effect replay", () => {
    const {rerender} = render(<button type='button'>Trigger</button>);
    const trigger = screen.getByRole("button", {name: "Trigger"});
    trigger.focus();
    rerender(
      <>
        <button type='button'>Trigger</button>
        <StrictMode>
          <FocusScope autoFocus>
            <button type='button'>Internal</button>
          </FocusScope>
        </StrictMode>
      </>,
    );
    expect(screen.getByRole("button", {name: "Internal"})).toHaveFocus();
    rerender(<button type='button'>Trigger</button>);
    expect(trigger).toHaveFocus();
  });

  it("wraps actual Tab from the visible final button, excluding hidden enabled controls", async () => {
    const user = userEvent.setup();
    render(
      <>
        <FocusScope contain>
          <button type='button'>First visible</button>
          <button type='button'>Final visible</button>
          <button
            type='button'
            hidden>
            Hidden enabled
          </button>
        </FocusScope>
        <button type='button'>Outside</button>
      </>,
    );

    screen.getByRole("button", {name: "Final visible"}).focus();
    await user.tab();

    expect(screen.getByRole("button", {name: "First visible"})).toHaveFocus();
  });

  it("excludes inert, hidden ancestors, disabled fieldsets and negative tab stops on focus entry", () => {
    render(
      <FocusScope autoFocus>
        <div inert>
          <button type='button'>Inert</button>
        </div>
        <div hidden>
          <button type='button'>Hidden ancestor</button>
        </div>
        <fieldset disabled>
          <button type='button'>Disabled fieldset</button>
        </fieldset>
        <input
          type='hidden'
          tabIndex={0}
        />
        <button
          type='button'
          tabIndex={-1}>
          Programmatic only
        </button>
        <button type='button'>Available</button>
      </FocusScope>,
    );

    expect(screen.getByRole("button", {name: "Available"})).toHaveFocus();
  });

  it("wraps Shift+Tab to a visible enabled non-inert final control", async () => {
    const user = userEvent.setup();
    render(
      <FocusScope autoFocus>
        <button type='button'>First</button>
        <button type='button'>Last available</button>
        <div inert>
          <button type='button'>Inert final</button>
        </div>
      </FocusScope>,
    );

    await user.tab({shift: true});

    expect(screen.getByRole("button", {name: "Last available"})).toHaveFocus();
  });

  it("excludes CSS-hidden ancestors from the actual Tab controller", async () => {
    const user = userEvent.setup();
    render(
      <FocusScope autoFocus>
        <button type='button'>First</button>
        <button type='button'>Last available</button>
        <div data-testid='css-hidden'>
          <button type='button'>CSS hidden</button>
        </div>
      </FocusScope>,
    );
    screen.getByTestId("css-hidden").style.display = "none";
    screen.getByRole("button", {name: "Last available"}).focus();

    await user.tab();

    expect(screen.getByRole("button", {name: "First"})).toHaveFocus();
  });

  it("focuses an empty scope and contains both Tab directions on that fallback", async () => {
    const user = userEvent.setup();
    render(
      <>
        <FocusScope
          autoFocus
          aria-label='Empty scope'>
          No controls
        </FocusScope>
        <button type='button'>Outside</button>
      </>,
    );
    const scope = screen.getByRole("group", {name: "Empty scope"});
    expect(scope).toHaveFocus();

    await user.tab();
    expect(scope).toHaveFocus();
    await user.tab({shift: true});
    expect(scope).toHaveFocus();
  });

  it("honors consumer Tab cancellation before running the controller", async () => {
    const user = userEvent.setup();
    render(
      <FocusScope
        autoFocus
        onKeyDown={(event) => event.preventDefault()}>
        <button type='button'>First</button>
        <button type='button'>Last</button>
      </FocusScope>,
    );
    screen.getByRole("button", {name: "Last"}).focus();

    await user.tab();

    expect(screen.getByRole("button", {name: "Last"})).toHaveFocus();
  });

  it("restores the original focus owner even after autoFocus changes", () => {
    const {rerender, unmount} = render(<button type='button'>Trigger</button>);
    const trigger = screen.getByRole("button", {name: "Trigger"});
    trigger.focus();
    const content = (autoFocus: boolean): React.JSX.Element => (
      <>
        <button type='button'>Trigger</button>
        <FocusScope autoFocus={autoFocus}>
          <button type='button'>Internal</button>
        </FocusScope>
      </>
    );
    rerender(content(true));
    expect(screen.getByRole("button", {name: "Internal"})).toHaveFocus();
    rerender(content(false));
    expect(screen.getByRole("button", {name: "Internal"})).toHaveFocus();
    // Leave the trigger mounted while unmounting just the scope.
    rerender(<button type='button'>Trigger</button>);

    expect(trigger).toHaveFocus();
    unmount();
  });

  it("preserves native div props and clears a forwarded object ref on unmount", () => {
    const ref = createRef<HTMLDivElement>();
    const {unmount} = render(
      <FocusScope
        ref={ref}
        role='region'
        aria-label='Workbench'
        className='consumer'
        tabIndex={0}>
        Content
      </FocusScope>,
    );
    const scope = screen.getByRole("region", {name: "Workbench"});
    expect(ref.current).toBe(scope);
    expect(scope).toHaveClass("consumer");
    expect(scope).toHaveAttribute("tabindex", "0");
    unmount();
    expect(ref.current).toBeNull();
  });

  it("renders children", () => {
    render(
      <FocusScope>
        <button type='button'>Click</button>
      </FocusScope>,
    );

    expect(screen.getByText("Click")).toBeInTheDocument();
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <FocusScope ref={ref}>
        <button type='button'>Click</button>
      </FocusScope>,
    );

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("supports function refs", () => {
    let currentNode: HTMLDivElement | null = null;

    render(
      <FocusScope
        ref={(node) => {
          currentNode = node;
        }}>
        <button type='button'>Click</button>
      </FocusScope>,
    );

    expect(currentNode).toBeInstanceOf(HTMLDivElement);
  });

  it("auto-focuses first focusable element when autoFocus is true", () => {
    render(
      <FocusScope autoFocus>
        <button type='button'>First</button>
        <button type='button'>Second</button>
      </FocusScope>,
    );

    expect(document.activeElement).toBe(screen.getByRole("button", {name: "First"}));
  });

  it("keeps tab focus contained within the scope", async () => {
    const user = userEvent.setup();

    render(
      <FocusScope autoFocus>
        <button type='button'>First</button>
        <button type='button'>Second</button>
      </FocusScope>,
    );

    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", {name: "Second"}));

    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", {name: "First"}));
  });

  it("restores focus to the previously focused element on unmount", () => {
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.textContent = "Trigger";
    document.body.append(trigger);
    trigger.focus();

    const {unmount} = render(
      <FocusScope autoFocus>
        <button type='button'>First</button>
      </FocusScope>,
    );

    unmount();

    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it("wraps focus backwards when using Shift+Tab on the first focusable element", async () => {
    const user = userEvent.setup();

    render(
      <FocusScope autoFocus>
        <button type='button'>First</button>
        <button type='button'>Second</button>
      </FocusScope>,
    );

    await user.tab({shift: true});

    expect(document.activeElement).toBe(screen.getByRole("button", {name: "Second"}));
  });

  it("does not throw when the scope has no focusable children", async () => {
    const user = userEvent.setup();

    render(<FocusScope>No focusable content</FocusScope>);

    await user.tab();

    expect(screen.getByText("No focusable content")).toBeInTheDocument();
  });

  it("does not contain focus when contain={false}", async () => {
    const user = userEvent.setup();

    // Create external button
    const externalButton = document.createElement("button");
    externalButton.type = "button";
    externalButton.textContent = "External";
    document.body.append(externalButton);

    render(
      <FocusScope
        contain={false}
        autoFocus>
        <button type='button'>Internal</button>
      </FocusScope>,
    );

    // Focus starts inside
    expect(document.activeElement).toBe(screen.getByRole("button", {name: "Internal"}));

    // Tab should not be trapped
    await user.tab();

    // Focus should escape the scope
    expect(document.activeElement).not.toBe(screen.getByRole("button", {name: "Internal"}));

    externalButton.remove();
  });

  it("does not restore focus when restoreFocus={false}", () => {
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.textContent = "Trigger";
    document.body.append(trigger);
    trigger.focus();

    const {unmount} = render(
      <FocusScope
        restoreFocus={false}
        autoFocus>
        <button type='button'>First</button>
      </FocusScope>,
    );

    expect(document.activeElement).toBe(screen.getByRole("button", {name: "First"}));

    unmount();

    // Focus should NOT be restored to trigger
    expect(document.activeElement).not.toBe(trigger);

    trigger.remove();
  });

  it("handles Tab key without contain enabled", async () => {
    const user = userEvent.setup();

    render(
      <FocusScope
        contain={false}
        autoFocus>
        <button type='button'>Button 1</button>
        <button type='button'>Button 2</button>
      </FocusScope>,
    );

    expect(document.activeElement).toBe(screen.getByRole("button", {name: "Button 1"}));

    // Tab should work normally without containment
    await user.tab();

    expect(document.activeElement).toBe(screen.getByRole("button", {name: "Button 2"}));
  });

  it("handles non-Tab key events", async () => {
    const user = userEvent.setup();

    render(
      <FocusScope autoFocus>
        <input
          type='text'
          placeholder='Type here'
        />
      </FocusScope>,
    );

    const input = screen.getByPlaceholderText("Type here");
    expect(document.activeElement).toBe(input);

    // Type some text - Enter key should not be trapped
    await user.keyboard("Hello{Enter}");

    // Input should still be focused
    expect(document.activeElement).toBe(input);
  });

  it("handles focus scope with no focusable elements during Tab trap", async () => {
    const user = userEvent.setup();

    render(
      <FocusScope contain>
        <div>No focusable elements</div>
      </FocusScope>,
    );

    // Tab should not throw
    await user.tab();

    expect(screen.getByText("No focusable elements")).toBeInTheDocument();
  });
});
