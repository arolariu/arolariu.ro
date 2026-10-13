import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {describe, expect, expectTypeOf, it, vi} from "vitest";

import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "./accordion";

function renderAccordion(): {
  firstTrigger: HTMLElement;
  secondTrigger: HTMLElement;
} {
  render(
    <Accordion
      type='single'
      className='custom-root'
      data-testid='accordion-root'>
      <AccordionItem
        value='item-1'
        className='custom-item'>
        <AccordionTrigger className='custom-trigger'>Section one</AccordionTrigger>
        <AccordionContent
          className='custom-panel'
          data-testid='panel-one'>
          Panel one content
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value='item-2'>
        <AccordionTrigger>Section two</AccordionTrigger>
        <AccordionContent data-testid='panel-two'>Panel two content</AccordionContent>
      </AccordionItem>
    </Accordion>,
  );

  return {
    firstTrigger: screen.getByRole("button", {name: "Section one"}),
    secondTrigger: screen.getByRole("button", {name: "Section two"}),
  };
}

describe("Accordion", () => {
  it("keeps legacy empty selection controlled and clears it on external rerenders", async () => {
    const user = userEvent.setup();
    const changes: (string | undefined)[] = [];
    const items = (
      <AccordionItem value='item-1'>
        <AccordionTrigger>Section one</AccordionTrigger>
        <AccordionContent>Body</AccordionContent>
      </AccordionItem>
    );
    const {rerender} = render(
      <Accordion
        type='single'
        value=''
        defaultValue='item-1'
        onValueChange={(value) => changes.push(value)}>
        {items}
      </Accordion>,
    );

    const trigger = screen.getByRole("button", {name: "Section one"});
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.click(trigger);
    expect(changes).toEqual(["item-1"]);
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    rerender(
      <Accordion
        type='single'
        value='item-1'>
        {items}
      </Accordion>,
    );
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    rerender(
      <Accordion
        type='single'
        value=''>
        {items}
      </Accordion>,
    );
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("forbids legacy last-panel collapse without preventing switching items", async () => {
    const user = userEvent.setup();
    const changes: (string | undefined)[] = [];
    render(
      <Accordion
        type='single'
        collapsible={false}
        defaultValue='item-1'
        onValueChange={(value) => changes.push(value)}>
        <AccordionItem value='item-1'>
          <AccordionTrigger>Section one</AccordionTrigger>
          <AccordionContent>Body one</AccordionContent>
        </AccordionItem>
        <AccordionItem value='item-2'>
          <AccordionTrigger>Section two</AccordionTrigger>
          <AccordionContent>Body two</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    const firstTrigger = screen.getByRole("button", {name: "Section one"});
    const secondTrigger = screen.getByRole("button", {name: "Section two"});
    await user.click(firstTrigger);
    expect(firstTrigger).toHaveAttribute("aria-expanded", "true");
    expect(changes).toEqual([]);

    await user.click(secondTrigger);
    expect(firstTrigger).toHaveAttribute("aria-expanded", "false");
    expect(secondTrigger).toHaveAttribute("aria-expanded", "true");
    expect(changes).toEqual(["item-2"]);

    await user.keyboard("{Enter} ");
    expect(secondTrigger).toHaveAttribute("aria-expanded", "true");
    expect(changes).toEqual(["item-2"]);
  });

  it("allows multiple panels to close until the non-collapsible array contract reaches its last panel", async () => {
    const user = userEvent.setup();
    const changes: string[][] = [];
    render(
      <Accordion
        type='multiple'
        collapsible={false}
        defaultValue={["item-1", "item-2"]}
        onValueChange={(value) => changes.push(value)}>
        <AccordionItem value='item-1'>
          <AccordionTrigger>Section one</AccordionTrigger>
          <AccordionContent>Body one</AccordionContent>
        </AccordionItem>
        <AccordionItem value='item-2'>
          <AccordionTrigger>Section two</AccordionTrigger>
          <AccordionContent>Body two</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    const firstTrigger = screen.getByRole("button", {name: "Section one"});
    const secondTrigger = screen.getByRole("button", {name: "Section two"});
    await user.click(firstTrigger);
    expect(firstTrigger).toHaveAttribute("aria-expanded", "false");
    expect(secondTrigger).toHaveAttribute("aria-expanded", "true");
    expect(changes).toEqual([["item-2"]]);

    await user.click(secondTrigger);
    expect(secondTrigger).toHaveAttribute("aria-expanded", "true");
    expect(changes).toEqual([["item-2"]]);
  });

  it("selects an empty-string item with canonical arrays rather than treating it as empty selection", () => {
    render(
      <Accordion value={[""]}>
        <AccordionItem value=''>
          <AccordionTrigger>Empty identifier</AccordionTrigger>
          <AccordionContent>Body</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    expect(screen.getByRole("button", {name: "Empty identifier"})).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Body")).toBeVisible();
  });

  it("treats legacy empty default and controlled values as no selection even with an empty-string item", () => {
    const item = (
      <AccordionItem value=''>
        <AccordionTrigger>Empty identifier</AccordionTrigger>
        <AccordionContent>Body</AccordionContent>
      </AccordionItem>
    );
    const {rerender} = render(
      <Accordion
        type='single'
        value=''
        defaultValue=''>
        {item}
      </Accordion>,
    );

    expect(screen.getByRole("button", {name: "Empty identifier"})).toHaveAttribute("aria-expanded", "false");
    rerender(
      <Accordion
        type='single'
        value=''>
        {item}
      </Accordion>,
    );
    expect(screen.getByRole("button", {name: "Empty identifier"})).toHaveAttribute("aria-expanded", "false");
  });

  it("uses canonical default arrays and the native multiple flag without a legacy type", async () => {
    const user = userEvent.setup();
    const changes: string[][] = [];
    render(
      <Accordion
        multiple
        defaultValue={["item-1"]}
        onValueChange={(value) => changes.push(value)}>
        <AccordionItem value='item-1'>
          <AccordionTrigger>Section one</AccordionTrigger>
          <AccordionContent>Body one</AccordionContent>
        </AccordionItem>
        <AccordionItem value='item-2'>
          <AccordionTrigger>Section two</AccordionTrigger>
          <AccordionContent>Body two</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    const firstTrigger = screen.getByRole("button", {name: "Section one"});
    const secondTrigger = screen.getByRole("button", {name: "Section two"});
    expect(firstTrigger).toHaveAttribute("aria-expanded", "true");
    await user.click(secondTrigger);
    expect(firstTrigger).toHaveAttribute("aria-expanded", "true");
    expect(secondTrigger).toHaveAttribute("aria-expanded", "true");
    expect(changes).toEqual([["item-1", "item-2"]]);
  });

  it("keeps canonical empty arrays controlled and reports arrays in single mode", async () => {
    const user = userEvent.setup();
    const changes: string[][] = [];
    const item = (
      <AccordionItem value='item-1'>
        <AccordionTrigger>Section one</AccordionTrigger>
        <AccordionContent>Body</AccordionContent>
      </AccordionItem>
    );
    const {rerender} = render(
      <Accordion
        value={[]}
        onValueChange={(value) => changes.push(value)}>
        {item}
      </Accordion>,
    );

    const trigger = screen.getByRole("button", {name: "Section one"});
    await user.click(trigger);
    expect(changes).toEqual([["item-1"]]);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    rerender(<Accordion value={["item-1"]}>{item}</Accordion>);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    rerender(<Accordion value={[]}>{item}</Accordion>);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("passes live root, item, trigger, and transition state to render callbacks", async () => {
    const user = userEvent.setup();
    render(
      <Accordion
        type='single'
        defaultValue='item-1'
        render={(props, state) => (
          <section
            {...props}
            data-testid='render-root'
            data-value={state.value?.join(",")}
          />
        )}>
        <AccordionItem
          value='item-1'
          render={(props, state) => (
            <article
              {...props}
              data-testid='render-item'
              data-open={String(state.open)}
            />
          )}>
          <AccordionTrigger
            render={(props, state) => (
              <button
                {...props}
                data-open={String(state.open)}
              />
            )}>
            Section one
          </AccordionTrigger>
          <AccordionContent
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
          </AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    const root = screen.getByTestId("render-root");
    const item = screen.getByTestId("render-item");
    const trigger = screen.getByRole("button", {name: "Section one"});
    const panel = screen.getByTestId("render-panel");
    expect(root).toHaveAttribute("data-value", "item-1");
    expect(item).toHaveAttribute("data-open", "true");
    expect(trigger).toHaveAttribute("data-open", "true");
    expect(panel).toHaveAttribute("data-open", "true");
    expect(panel).toHaveAttribute("data-transition", "idle");

    await user.click(trigger);
    expect(root).toHaveAttribute("data-value", "");
    expect(item).toHaveAttribute("data-open", "false");
    expect(trigger).toHaveAttribute("data-open", "false");
    expect(panel).toHaveAttribute("data-open", "false");
    await waitFor(() => expect(panel).toHaveAttribute("hidden"));
  });

  it("forwards cancellable change details for canonical array and legacy string contracts", async () => {
    const user = userEvent.setup();
    const canonicalChanges: {value: string[]; details: Accordion.ChangeEventDetails}[] = [];
    const legacyChanges: {value: string | undefined; details: Accordion.ChangeEventDetails}[] = [];
    render(
      <>
        <Accordion
          onValueChange={(value, details) => {
            canonicalChanges.push({value, details});
            details.cancel();
          }}>
          <AccordionItem value='item-1'>
            <AccordionTrigger>Canonical</AccordionTrigger>
            <AccordionContent>Body one</AccordionContent>
          </AccordionItem>
        </Accordion>
        <Accordion
          type='single'
          onValueChange={(value, details) => {
            legacyChanges.push({value, details});
            details.cancel();
          }}>
          <AccordionItem value='item-1'>
            <AccordionTrigger>Legacy</AccordionTrigger>
            <AccordionContent>Body two</AccordionContent>
          </AccordionItem>
        </Accordion>
      </>,
    );

    const canonical = screen.getByRole("button", {name: "Canonical"});
    const legacy = screen.getByRole("button", {name: "Legacy"});
    await user.click(canonical);
    await user.click(legacy);

    expect(canonicalChanges[0]?.value).toEqual(["item-1"]);
    expect(legacyChanges[0]?.value).toBe("item-1");
    for (const changes of [canonicalChanges, legacyChanges]) {
      expect(changes).toHaveLength(1);
      expect(changes[0]?.details.reason).toBe("trigger-press");
      expect(changes[0]?.details.event.type).toBe("click");
      expect(changes[0]?.details.isCanceled).toBe(true);
    }
    expect(canonical).toHaveAttribute("aria-expanded", "false");
    expect(legacy).toHaveAttribute("aria-expanded", "false");
  });

  it("infers the canonical callback contract from reusable props and defaults to one open panel", async () => {
    const user = userEvent.setup();
    const changes: string[][] = [];
    const props = {
      defaultValue: ["item-1"],
      onValueChange(value, details) {
        expectTypeOf(value).toEqualTypeOf<string[]>();
        expectTypeOf(details).toEqualTypeOf<Accordion.ChangeEventDetails>();
        changes.push(value);
      },
    } satisfies Accordion.ArrayProps;
    const rootProps: Accordion.Props = props;
    render(
      <Accordion {...rootProps}>
        <AccordionItem value='item-1'>
          <AccordionTrigger>Section one</AccordionTrigger>
          <AccordionContent>Body one</AccordionContent>
        </AccordionItem>
        <AccordionItem value='item-2'>
          <AccordionTrigger>Section two</AccordionTrigger>
          <AccordionContent>Body two</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    const firstTrigger = screen.getByRole("button", {name: "Section one"});
    const secondTrigger = screen.getByRole("button", {name: "Section two"});
    await user.click(secondTrigger);
    expect(firstTrigger).toHaveAttribute("aria-expanded", "false");
    expect(secondTrigger).toHaveAttribute("aria-expanded", "true");
    await user.click(secondTrigger);
    expect(secondTrigger).toHaveAttribute("aria-expanded", "false");
    expect(changes).toEqual([["item-2"], []]);
  });

  it("allows opening from legacy empty defaults while retaining the string callback type", async () => {
    const user = userEvent.setup();
    const changes: (string | undefined)[] = [];
    render(
      <Accordion
        type='single'
        defaultValue=''
        onValueChange={(value, details) => {
          expectTypeOf(value).toEqualTypeOf<string | undefined>();
          expectTypeOf(details).toEqualTypeOf<Accordion.ChangeEventDetails>();
          changes.push(value);
        }}>
        <AccordionItem value='item-1'>
          <AccordionTrigger>Section one</AccordionTrigger>
          <AccordionContent>Body</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    const trigger = screen.getByRole("button", {name: "Section one"});
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    await user.click(trigger);
    expect(changes).toEqual(["item-1", undefined]);
  });

  it.each(["root", "item"] as const)("preserves native disabled behavior from the %s when rendering a custom button", async (owner) => {
    const user = userEvent.setup();
    const changes: string[][] = [];
    render(
      <Accordion
        disabled={owner === "root"}
        onValueChange={(value) => changes.push(value)}>
        <AccordionItem
          value='item-1'
          disabled={owner === "item"}>
          <AccordionTrigger render={<button />}>Disabled section</AccordionTrigger>
          <AccordionContent>Body</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    const trigger = screen.getByRole("button", {name: "Disabled section"});
    await user.click(trigger);
    trigger.focus();
    await user.keyboard("{Enter} ");
    expect(trigger).toBeDisabled();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(changes).toEqual([]);
  });

  it("preserves primitive event cancellation at the item boundary", async () => {
    const user = userEvent.setup();
    const changes: string[][] = [];
    render(
      <Accordion onValueChange={(value) => changes.push(value)}>
        <AccordionItem
          value='item-1'
          onOpenChange={(open, details) => {
            expect(open).toBe(true);
            expect(details.reason).toBe("trigger-press");
            details.cancel();
          }}>
          <AccordionTrigger>Section one</AccordionTrigger>
          <AccordionContent>Body</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    const trigger = screen.getByRole("button", {name: "Section one"});
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(changes).toEqual([]);
  });

  it("merges composed refs, classes, and handlers while preserving inner panel styling and form behavior", async () => {
    const user = userEvent.setup();
    const rootRef = React.createRef<HTMLDivElement>();
    const itemRef = React.createRef<HTMLDivElement>();
    const triggerRef = React.createRef<HTMLElement>();
    const renderRef = React.createRef<HTMLButtonElement>();
    const panelRef = React.createRef<HTMLDivElement>();
    const submit = vi.fn();
    const clicks: string[] = [];
    render(
      <form onSubmit={submit}>
        <Accordion
          ref={rootRef}
          className={(state) => (state.value.length ? "open-root" : "closed-root")}
          render={<div className='render-root' />}>
          <AccordionItem
            ref={itemRef}
            value='item-1'
            className='wrapper-item'
            render={<div className='render-item' />}>
            <AccordionTrigger
              ref={triggerRef}
              className='wrapper-trigger'
              onClick={() => clicks.push("wrapper")}
              render={
                <button
                  ref={renderRef}
                  className='render-trigger'
                  onClick={() => clicks.push("element")}
                />
              }>
              Section one
            </AccordionTrigger>
            <AccordionContent
              ref={panelRef}
              className='inner-panel'
              render={<div className='render-panel' />}>
              Body
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </form>,
    );

    const trigger = screen.getByRole("button", {name: "Section one"});
    expect(rootRef.current).toHaveClass("closed-root", "render-root");
    await user.click(trigger);

    expect(rootRef.current).toHaveClass("open-root", "render-root");
    expect(itemRef.current).toHaveClass("wrapper-item", "render-item");
    expect(triggerRef.current).toBe(trigger);
    expect(renderRef.current).toBe(trigger);
    expect(trigger).toHaveClass("wrapper-trigger", "render-trigger");
    expect(panelRef.current).toHaveClass("render-panel");
    expect(panelRef.current?.firstElementChild).toHaveClass("inner-panel");
    expect(trigger).toHaveAttribute("aria-controls", panelRef.current?.id);
    expect(panelRef.current).toHaveAttribute("aria-labelledby", trigger.id);
    expect(clicks).toEqual(["element", "wrapper"]);
    expect(submit).not.toHaveBeenCalled();
  });

  it("retains focused controls and uncontrolled panel inputs across root rerenders", async () => {
    const user = userEvent.setup();
    const item = (
      <AccordionItem value='item-1'>
        <AccordionTrigger render={<button />}>Section one</AccordionTrigger>
        <AccordionContent keepMounted>
          <input aria-label='Notes' />
        </AccordionContent>
      </AccordionItem>
    );
    const {rerender} = render(<Accordion defaultValue={["item-1"]}>{item}</Accordion>);
    const trigger = screen.getByRole("button", {name: "Section one"});
    const input = screen.getByRole("textbox", {name: "Notes"});
    await user.type(input, "Retained text");
    trigger.focus();

    rerender(
      <Accordion
        defaultValue={["item-1"]}
        className='rerendered'>
        {item}
      </Accordion>,
    );

    expect(screen.getByRole("button", {name: "Section one"})).toBe(trigger);
    expect(trigger).toHaveFocus();
    expect(screen.getByRole("textbox", {name: "Notes"})).toBe(input);
    expect(input).toHaveValue("Retained text");
  });

  it("renders the accordion structure, merges class names, and exposes accessibility attributes", () => {
    // Arrange
    const {firstTrigger} = renderAccordion();

    // Assert
    expect(screen.getByTestId("accordion-root")).toHaveClass("custom-root");
    expect(screen.getByText("Section one").closest("button")).toHaveClass("custom-trigger");
    expect(firstTrigger.closest("h3")?.parentElement).toHaveClass("custom-item");
    expect(firstTrigger).toHaveAttribute("aria-expanded", "false");
    expect(firstTrigger).toHaveAttribute("type", "button");
    expect(screen.getByRole("button", {name: "Section two"})).toBeInTheDocument();
  });

  it("expands and collapses accordion items when the trigger is clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    const {firstTrigger} = renderAccordion();

    // Act
    await user.click(firstTrigger);

    // Assert
    expect(firstTrigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("panel-one")).toBeVisible();
    expect(screen.getByTestId("panel-one").firstElementChild).toHaveClass("custom-panel");

    // Act
    await user.click(firstTrigger);

    // Assert
    expect(firstTrigger).toHaveAttribute("aria-expanded", "false");
  });

  it("calls onValueChange with the toggled item value", async () => {
    // Arrange
    const user = userEvent.setup();
    const handleValueChange = vi.fn<(value: string | undefined, eventDetails: unknown) => void>();

    render(
      <Accordion
        type='single'
        onValueChange={handleValueChange}>
        <AccordionItem value='item-1'>
          <AccordionTrigger>Section one</AccordionTrigger>
          <AccordionContent>Panel one content</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    const trigger = screen.getByRole("button", {name: "Section one"});

    // Act
    await user.click(trigger);

    // Assert
    expect(handleValueChange.mock.calls.at(-1)?.[0]).toBe("item-1");

    // Act
    await user.click(trigger);

    // Assert
    expect(handleValueChange.mock.calls.at(-1)?.[0]).toBeUndefined();
  });

  it("supports keyboard toggling with enter and space keys", async () => {
    // Arrange
    const user = userEvent.setup();
    const {firstTrigger, secondTrigger} = renderAccordion();

    secondTrigger.focus();

    // Act
    await user.keyboard("{Enter}");

    // Assert
    expect(secondTrigger).toHaveFocus();
    expect(secondTrigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("panel-two")).toBeVisible();

    // Act
    firstTrigger.focus();
    await user.keyboard(" ");

    // Assert
    expect(firstTrigger).toHaveFocus();
    expect(firstTrigger).toHaveAttribute("aria-expanded", "true");
  });

  it("keeps every accordion trigger in the natural tab sequence", async () => {
    // Arrange — Base UI removed roving focus from the Accordion following the W3C APG
    // update (w3c/aria-practices#3434). Arrow keys deliberately do NOT move focus between
    // headers; every trigger stays in the tab sequence instead, which is why each one
    // renders with tabindex="0". See the `orientation` state on Accordion.Trigger, which
    // Base UI documents as deprecated and "no longer affects keyboard focus behavior".
    const user = userEvent.setup();
    const {firstTrigger, secondTrigger} = renderAccordion();

    firstTrigger.focus();

    // Assert — both headers are reachable by Tab rather than by arrow keys
    expect(firstTrigger).toHaveFocus();

    // Act — Tab should advance to the second trigger
    await user.tab();

    // Assert
    expect(secondTrigger).toHaveFocus();

    // Act — Shift+Tab should retreat to the first trigger
    await user.tab({shift: true});

    // Assert
    expect(firstTrigger).toHaveFocus();
  });

  it("supports multiple type accordion with multiple items open simultaneously", async () => {
    // Arrange
    const user = userEvent.setup();

    render(
      <Accordion
        type='multiple'
        data-testid='accordion-multiple'>
        <AccordionItem value='item-1'>
          <AccordionTrigger data-testid='trigger-1'>Section one</AccordionTrigger>
          <AccordionContent data-testid='panel-1'>Panel one content</AccordionContent>
        </AccordionItem>
        <AccordionItem value='item-2'>
          <AccordionTrigger data-testid='trigger-2'>Section two</AccordionTrigger>
          <AccordionContent data-testid='panel-2'>Panel two content</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    const trigger1 = screen.getByTestId("trigger-1");
    const trigger2 = screen.getByTestId("trigger-2");

    // Act - open both items
    await user.click(trigger1);
    await user.click(trigger2);

    // Assert - both panels should be open
    expect(trigger1).toHaveAttribute("aria-expanded", "true");
    expect(trigger2).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("panel-1")).toBeVisible();
    expect(screen.getByTestId("panel-2")).toBeVisible();
  });

  it("supports controlled multiple type accordion with defaultValue", () => {
    // Arrange
    render(
      <Accordion
        type='multiple'
        defaultValue={["item-1", "item-2"]}
        data-testid='accordion-controlled'>
        <AccordionItem value='item-1'>
          <AccordionTrigger data-testid='trigger-1'>Section one</AccordionTrigger>
          <AccordionContent data-testid='panel-1'>Panel one content</AccordionContent>
        </AccordionItem>
        <AccordionItem value='item-2'>
          <AccordionTrigger data-testid='trigger-2'>Section two</AccordionTrigger>
          <AccordionContent data-testid='panel-2'>Panel two content</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    // Assert - both panels should be open by default
    const trigger1 = screen.getByTestId("trigger-1");
    const trigger2 = screen.getByTestId("trigger-2");

    expect(trigger1).toHaveAttribute("aria-expanded", "true");
    expect(trigger2).toHaveAttribute("aria-expanded", "true");
  });

  it("works in controlled single mode", async () => {
    // Arrange
    const user = userEvent.setup();
    const handleValueChange = vi.fn<(value: string | undefined) => void>();

    function ControlledAccordion(): React.JSX.Element {
      const [value, setValue] = React.useState("item-1");

      return (
        <Accordion
          type='single'
          value={value}
          onValueChange={(nextValue) => {
            setValue(nextValue ?? "");
            handleValueChange(nextValue);
          }}>
          <AccordionItem value='item-1'>
            <AccordionTrigger>Section one</AccordionTrigger>
            <AccordionContent>Panel one content</AccordionContent>
          </AccordionItem>
          <AccordionItem value='item-2'>
            <AccordionTrigger>Section two</AccordionTrigger>
            <AccordionContent>Panel two content</AccordionContent>
          </AccordionItem>
        </Accordion>
      );
    }

    render(<ControlledAccordion />);

    const firstTrigger = screen.getByRole("button", {name: "Section one"});
    const secondTrigger = screen.getByRole("button", {name: "Section two"});

    expect(firstTrigger).toHaveAttribute("aria-expanded", "true");
    expect(secondTrigger).toHaveAttribute("aria-expanded", "false");

    // Act
    await user.click(secondTrigger);

    // Assert
    expect(handleValueChange).toHaveBeenCalledWith("item-2");
    expect(firstTrigger).toHaveAttribute("aria-expanded", "false");
    expect(secondTrigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Panel two content")).toBeVisible();
  });

  it("works in controlled multiple mode", async () => {
    // Arrange
    const user = userEvent.setup();
    const handleValueChange = vi.fn<(value: string[]) => void>();

    function ControlledAccordion(): React.JSX.Element {
      const [value, setValue] = React.useState<string[]>(["item-1"]);

      return (
        <Accordion
          type='multiple'
          value={value}
          onValueChange={(nextValue) => {
            setValue(nextValue);
            handleValueChange(nextValue);
          }}>
          <AccordionItem value='item-1'>
            <AccordionTrigger>Section one</AccordionTrigger>
            <AccordionContent>Panel one content</AccordionContent>
          </AccordionItem>
          <AccordionItem value='item-2'>
            <AccordionTrigger>Section two</AccordionTrigger>
            <AccordionContent>Panel two content</AccordionContent>
          </AccordionItem>
        </Accordion>
      );
    }

    render(<ControlledAccordion />);

    const firstTrigger = screen.getByRole("button", {name: "Section one"});
    const secondTrigger = screen.getByRole("button", {name: "Section two"});

    expect(firstTrigger).toHaveAttribute("aria-expanded", "true");
    expect(secondTrigger).toHaveAttribute("aria-expanded", "false");

    // Act
    await user.click(secondTrigger);

    // Assert
    expect(handleValueChange).toHaveBeenCalledWith(["item-1", "item-2"]);
    expect(firstTrigger).toHaveAttribute("aria-expanded", "true");
    expect(secondTrigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Panel two content")).toBeVisible();
  });
});
