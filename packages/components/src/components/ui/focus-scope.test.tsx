import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it} from "vitest";

import {FocusScope} from "./focus-scope";

describe("FocusScope", () => {
  it("renders children", () => {
    render(
      <FocusScope>
        <button type='button'>Click</button>
      </FocusScope>,
    );

    expect(screen.getByText("Click")).toBeInTheDocument();
  });

  it("forwards ref", () => {
    const ref = {current: null as HTMLDivElement | null};

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
