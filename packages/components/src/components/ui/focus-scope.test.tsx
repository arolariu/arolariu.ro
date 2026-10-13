import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {createRef, StrictMode} from "react";
import {describe, expect, it} from "vitest";

import {FocusScope} from "./focus-scope";

describe("FocusScope", () => {
  it("wraps actual Tab after the first of two unchecked group peers rather than escaping past the second", async () => {
    const user = userEvent.setup();
    render(
      <>
        <FocusScope autoFocus>
          <button type='button'>First scope action</button>
          <label>
            <input
              type='radio'
              name='unchecked-edge'
            />
            First unchecked choice
          </label>
          <label>
            <input
              type='radio'
              name='unchecked-edge'
            />
            Second unchecked choice
          </label>
        </FocusScope>
        <button type='button'>Outside action</button>
      </>,
    );

    await user.tab();
    expect(screen.getByLabelText("First unchecked choice")).toHaveFocus();
    await user.tab();

    expect(screen.getByRole("button", {name: "First scope action"})).toHaveFocus();
    expect(screen.getByLabelText("First unchecked choice")).not.toBeChecked();
    expect(screen.getByLabelText("Second unchecked choice")).not.toBeChecked();
  });

  it("uses one deliberate locally eligible unchecked representative when wrapping Shift+Tab", async () => {
    const user = userEvent.setup();
    render(
      <FocusScope autoFocus>
        <button type='button'>First scope action</button>
        <label>
          <input
            type='radio'
            name='unchecked-reverse-wrap'
          />
          Canonical unchecked choice
        </label>
        <label>
          <input
            type='radio'
            name='unchecked-reverse-wrap'
          />
          Other unchecked choice
        </label>
      </FocusScope>,
    );

    await user.tab({shift: true});
    expect(screen.getByLabelText("Canonical unchecked choice")).toHaveFocus();
    await user.tab({shift: true});
    expect(screen.getByRole("button", {name: "First scope action"})).toHaveFocus();
  });

  it("contains Shift+Tab after native reverse entry reaches the other unchecked peer at the first edge", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type='button'>Outside before</button>
        <FocusScope>
          <label>
            <input
              type='radio'
              name='unchecked-first-edge'
            />
            First edge choice
          </label>
          <label>
            <input
              type='radio'
              name='unchecked-first-edge'
            />
            Reverse-entered choice
          </label>
          <button type='button'>Last scope action</button>
        </FocusScope>
      </>,
    );
    screen.getByRole("button", {name: "Last scope action"}).focus();

    await user.tab({shift: true});
    expect(screen.getByLabelText("Reverse-entered choice")).toHaveFocus();
    await user.tab({shift: true});

    expect(screen.getByRole("button", {name: "Last scope action"})).toHaveFocus();
  });

  it("retains ordinary reverse navigation through a non-representative unchecked peer in the middle", async () => {
    const user = userEvent.setup();
    render(
      <FocusScope>
        <button type='button'>Before the group</button>
        <label>
          <input
            type='radio'
            name='unchecked-middle'
          />
          Middle canonical choice
        </label>
        <label>
          <input
            type='radio'
            name='unchecked-middle'
          />
          Middle reverse-entered choice
        </label>
        <button type='button'>After the group</button>
      </FocusScope>,
    );
    screen.getByRole("button", {name: "After the group"}).focus();

    await user.tab({shift: true});
    expect(screen.getByLabelText("Middle reverse-entered choice")).toHaveFocus();
    await user.tab({shift: true});

    expect(screen.getByRole("button", {name: "Before the group"})).toHaveFocus();
  });

  it("keeps a single local unchecked edge even when an unchecked group peer precedes the scope outside", async () => {
    const user = userEvent.setup();
    render(
      <>
        <label>
          <input
            type='radio'
            name='unchecked-external-peer'
          />
          External unchecked choice
        </label>
        <FocusScope autoFocus>
          <button type='button'>First local action</button>
          <label>
            <input
              type='radio'
              name='unchecked-external-peer'
            />
            First local choice
          </label>
          <label>
            <input
              type='radio'
              name='unchecked-external-peer'
            />
            Second local choice
          </label>
        </FocusScope>
        <button type='button'>Outside after</button>
      </>,
    );

    await user.tab();
    expect(screen.getByLabelText("First local choice")).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", {name: "First local action"})).toHaveFocus();
  });

  it("chooses the locally eligible unchecked representative rather than hidden or disabled peers", async () => {
    const user = userEvent.setup();
    render(
      <FocusScope autoFocus>
        <button type='button'>First scope action</button>
        <input
          type='radio'
          name='eligible-unchecked'
          hidden
          aria-label='Hidden unchecked peer'
        />
        <input
          type='radio'
          name='eligible-unchecked'
          disabled
          aria-label='Disabled unchecked peer'
        />
        <label>
          <input
            type='radio'
            name='eligible-unchecked'
          />
          Eligible unchecked representative
        </label>
        <label>
          <input
            type='radio'
            name='eligible-unchecked'
          />
          Other eligible unchecked peer
        </label>
      </FocusScope>,
    );

    await user.tab({shift: true});

    expect(screen.getByLabelText("Eligible unchecked representative")).toHaveFocus();
  });

  it("preserves caller cancellation while an unchecked group is the final controller edge", async () => {
    const user = userEvent.setup();
    render(
      <FocusScope onKeyDown={(event) => event.preventDefault()}>
        <button type='button'>First action</button>
        <label>
          <input
            type='radio'
            name='cancel-unchecked'
          />
          Focused unchecked choice
        </label>
        <label>
          <input
            type='radio'
            name='cancel-unchecked'
          />
          Other unchecked choice
        </label>
      </FocusScope>,
    );
    const choice = screen.getByLabelText("Focused unchecked choice");
    choice.focus();

    await user.tab();

    expect(choice).toHaveFocus();
  });

  it("advances from a later unchecked peer to the logical next local stop even when that peer is physically last", async () => {
    const user = userEvent.setup();
    render(
      <>
        <FocusScope>
          <button type='button'>First local stop</button>
          <label>
            <input
              type='radio'
              name='interleaved-unchecked'
            />
            Logical group representative
          </label>
          <button type='button'>Logical next local stop</button>
          <label>
            <input
              type='radio'
              name='interleaved-unchecked'
            />
            Physically last group peer
          </label>
        </FocusScope>
        <button type='button'>Outside after interleaved group</button>
      </>,
    );
    screen.getByLabelText("Physically last group peer").focus();

    await user.tab();

    expect(screen.getByRole("button", {name: "Logical next local stop"})).toHaveFocus();
  });

  it("reenters at the scope edge instead of treating a manually focused unchecked peer as its checked representative", async () => {
    const user = userEvent.setup();
    render(
      <>
        <FocusScope>
          <button type='button'>First available local stop</button>
          <label>
            <input
              type='radio'
              name='selected-manual-peer'
              defaultChecked
            />
            Selected group representative
          </label>
          <button type='button'>Later local stop</button>
          <label>
            <input
              type='radio'
              name='selected-manual-peer'
            />
            Manually focused unchecked peer
          </label>
        </FocusScope>
        <button type='button'>Outside selected group</button>
      </>,
    );
    const unchecked = screen.getByLabelText("Manually focused unchecked peer");
    unchecked.focus();
    expect(unchecked).not.toBeChecked();
    expect(screen.getByLabelText("Selected group representative")).toBeChecked();

    await user.tab();

    expect(screen.getByRole("button", {name: "First available local stop"})).toHaveFocus();
  });

  it("advances forward from a native reverse-entered unchecked middle peer without bouncing to the group", async () => {
    const user = userEvent.setup();
    render(
      <FocusScope>
        <button type='button'>Before middle group</button>
        <label>
          <input
            type='radio'
            name='reverse-then-forward'
          />
          Middle representative
        </label>
        <label>
          <input
            type='radio'
            name='reverse-then-forward'
          />
          Native reverse middle peer
        </label>
        <button type='button'>After middle group</button>
      </FocusScope>,
    );
    const after = screen.getByRole("button", {name: "After middle group"});
    after.focus();
    await user.tab({shift: true});
    expect(screen.getByLabelText("Native reverse middle peer")).toHaveFocus();

    await user.tab();

    expect(after).toHaveFocus();
  });

  it("excludes a nested summary under a closed summary-less outer details on entry", () => {
    render(
      <FocusScope autoFocus>
        <details>
          <details>
            <summary>Hidden nested summary</summary>
          </details>
        </details>
        <button type='button'>Available action</button>
      </FocusScope>,
    );

    expect(screen.getByRole("button", {name: "Available action"})).toHaveFocus();
  });

  it("wraps actual Tab before a nested summary hidden by a closed summary-less outer details", async () => {
    const user = userEvent.setup();
    render(
      <>
        <FocusScope>
          <button type='button'>First available</button>
          <button type='button'>Final available</button>
          <details>
            <details>
              <summary>Hidden nested final summary</summary>
            </details>
          </details>
        </FocusScope>
        <button type='button'>Outside</button>
      </>,
    );
    screen.getByRole("button", {name: "Final available"}).focus();

    await user.tab();

    expect(screen.getByRole("button", {name: "First available"})).toHaveFocus();
  });

  it("recognizes the outer details' own first direct summary rather than an earlier nested summary", () => {
    render(
      <FocusScope autoFocus>
        <details>
          <details>
            <summary>Hidden earlier nested summary</summary>
          </details>
          <summary>Visible outer summary</summary>
        </details>
        <button type='button'>Later action</button>
      </FocusScope>,
    );

    expect(screen.getByText("Visible outer summary")).toHaveFocus();
  });

  it.each(["same-form", "linked-form", "no-form"] as const)(
    "excludes an unchecked local radio when a checked native group peer is outside the scope (%s)",
    (ownership) => {
      const peer = (
        <label>
          <input
            type='radio'
            name='external-group'
            defaultChecked
            form={ownership === "linked-form" ? "radio-owner" : undefined}
          />
          External checked peer
        </label>
      );
      const scope = (
        <FocusScope autoFocus>
          <label>
            <input
              type='radio'
              name='external-group'
            />
            Local unchecked peer
          </label>
          <button type='button'>Available local action</button>
        </FocusScope>
      );
      render(
        ownership === "same-form" ? (
          <form id='radio-owner'>
            {peer}
            {scope}
          </form>
        ) : ownership === "linked-form" ? (
          <>
            {peer}
            <form id='radio-owner'>{scope}</form>
          </>
        ) : (
          <>
            {peer}
            {scope}
          </>
        ),
      );
      const external = screen.getByLabelText<HTMLInputElement>("External checked peer");
      const local = screen.getByLabelText<HTMLInputElement>("Local unchecked peer");
      expect(external).toBeChecked();
      expect(local).not.toBeChecked();
      expect(external.form).toBe(local.form);
      expect(external.getRootNode()).toBe(local.getRootNode());

      expect(screen.getByRole("button", {name: "Available local action"})).toHaveFocus();
    },
  );

  it("does not treat a checked same-name radio with a different form owner as a group peer", () => {
    render(
      <>
        <form id='other-radio-owner'>
          <label>
            <input
              type='radio'
              name='distinct-owner'
              defaultChecked
            />
            Other form peer
          </label>
        </form>
        <form id='local-radio-owner'>
          <FocusScope autoFocus>
            <label>
              <input
                type='radio'
                name='distinct-owner'
              />
              Local form peer
            </label>
            <button type='button'>Later action</button>
          </FocusScope>
        </form>
      </>,
    );
    const external = screen.getByLabelText<HTMLInputElement>("Other form peer");
    const local = screen.getByLabelText<HTMLInputElement>("Local form peer");
    expect(external.form).not.toBe(local.form);
    expect(local).toHaveFocus();
  });

  it("keeps an unchecked local peer eligible when its native group has no checked radio", () => {
    render(
      <>
        <label>
          <input
            type='radio'
            name='unselected-group'
          />
          External unchecked peer
        </label>
        <FocusScope autoFocus>
          <label>
            <input
              type='radio'
              name='unselected-group'
            />
            Local unchecked peer
          </label>
          <button type='button'>Later action</button>
        </FocusScope>
      </>,
    );

    expect(screen.getByLabelText("Local unchecked peer")).toHaveFocus();
  });

  it("uses the radio's actual owner-document tree, not a global document group", () => {
    const {getByTitle, unmount: unmountIframe} = render(<iframe title='Radio owner document' />);
    const iframe = getByTitle("Radio owner document");
    if (!(iframe instanceof HTMLIFrameElement)) throw new TypeError("The owner-document fixture requires an iframe element.");
    const otherDocument = iframe.contentDocument;
    if (!otherDocument) throw new Error("The owner-document fixture requires an actual iframe document.");
    const container = otherDocument.createElement("div");
    otherDocument.body.append(container);
    const {getByLabelText, getByRole, unmount} = render(
      <>
        <label>
          <input
            type='radio'
            name='owner-document-group'
            defaultChecked
          />
          Owner document checked peer
        </label>
        <FocusScope
          autoFocus
          restoreFocus={false}>
          <label>
            <input
              type='radio'
              name='owner-document-group'
            />
            Owner document local peer
          </label>
          <button type='button'>Owner document available action</button>
        </FocusScope>
      </>,
      {container, baseElement: otherDocument.body},
    );
    try {
      const external = getByLabelText("Owner document checked peer");
      const local = getByLabelText("Owner document local peer");
      const Input = otherDocument.defaultView?.HTMLInputElement;
      if (!Input || !(external instanceof Input) || !(local instanceof Input)) {
        throw new TypeError("The owner-document fixture requires native radio inputs.");
      }
      expect(external.ownerDocument).toBe(otherDocument);
      expect(local.ownerDocument).toBe(otherDocument);
      expect(external.form).toBeNull();
      expect(local.form).toBeNull();
      expect(external).toBeChecked();
      expect(local).not.toBeChecked();

      expect(otherDocument.activeElement).toBe(getByRole("button", {name: "Owner document available action"}));
    } finally {
      unmount();
      container.remove();
      unmountIframe();
    }
  });

  it.each([false, true])("restores the connected trigger after descendant native autofocus (Strict Mode: %s)", (strict) => {
    const {rerender} = render(<button type='button'>Native autofocus trigger</button>);
    const trigger = screen.getByRole("button", {name: "Native autofocus trigger"});
    trigger.focus();
    const scope = (
      <FocusScope>
        <input
          autoFocus
          aria-label='Native autofocus input'
        />
      </FocusScope>
    );
    rerender(
      <>
        <button type='button'>Native autofocus trigger</button>
        {strict ? <StrictMode>{scope}</StrictMode> : scope}
      </>,
    );
    expect(screen.getByRole("textbox", {name: "Native autofocus input"})).toHaveFocus();
    expect(trigger.isConnected).toBe(true);

    rerender(<button type='button'>Native autofocus trigger</button>);

    expect(trigger).toHaveFocus();
  });

  it("retains the pre-entry owner when scope autofocus follows descendant native autofocus", () => {
    const {rerender} = render(<button type='button'>Combined autofocus trigger</button>);
    const trigger = screen.getByRole("button", {name: "Combined autofocus trigger"});
    trigger.focus();
    rerender(
      <>
        <button type='button'>Combined autofocus trigger</button>
        <FocusScope autoFocus>
          <button type='button'>Scope entry action</button>
          <input
            autoFocus
            aria-label='Descendant native input'
          />
        </FocusScope>
      </>,
    );
    expect(screen.getByRole("button", {name: "Scope entry action"})).toHaveFocus();
    rerender(<button type='button'>Combined autofocus trigger</button>);
    expect(trigger).toHaveFocus();
  });

  it.each([false, true])("respects a shadow tree's own radio group rather than document peers (checked local group: %s)", (checkedPeer) => {
    const {getByTestId, unmount: unmountHost} = render(
      <>
        <label>
          <input
            type='radio'
            name='shadow-group'
            defaultChecked
          />
          Document checked peer
        </label>
        <div data-testid='radio-shadow-host' />
      </>,
    );
    const host = getByTestId("radio-shadow-host");
    const shadow = host.attachShadow({mode: "open"});
    const container = document.createElement("div");
    shadow.append(container);
    const {getByLabelText, getByRole, unmount} = render(
      <>
        {checkedPeer && (
          <label>
            <input
              type='radio'
              name='shadow-group'
              defaultChecked
            />
            Shadow checked peer
          </label>
        )}
        <FocusScope
          autoFocus
          restoreFocus={false}>
          <label>
            <input
              type='radio'
              name='shadow-group'
            />
            Shadow local peer
          </label>
          <button type='button'>Shadow available action</button>
        </FocusScope>
      </>,
      {container, baseElement: container},
    );
    try {
      const local = getByLabelText("Shadow local peer");
      expect(local.getRootNode()).toBe(shadow);
      expect(screen.getByLabelText("Document checked peer")).toBeChecked();
      if (checkedPeer) expect(getByLabelText("Shadow checked peer")).toBeChecked();
      expect(shadow.activeElement).toBe(checkedPeer ? getByRole("button", {name: "Shadow available action"}) : local);
    } finally {
      unmount();
      container.remove();
      unmountHost();
    }
  });

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
