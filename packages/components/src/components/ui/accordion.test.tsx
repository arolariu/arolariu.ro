import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {describe, expect, it, vi} from "vitest";

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

  it("moves focus between accordion triggers with ArrowDown and ArrowUp", async () => {
    // Arrange — Base UI Accordion implements the ARIA Disclosure Navigation pattern
    // with roving focus: ArrowDown advances to the next header, ArrowUp retreats.
    const user = userEvent.setup();
    const {firstTrigger, secondTrigger} = renderAccordion();

    firstTrigger.focus();

    // Act — ArrowDown should move focus to the second trigger
    await user.keyboard("{ArrowDown}");

    // Assert
    expect(secondTrigger).toHaveFocus();

    // Act — ArrowUp should move focus back to the first trigger
    await user.keyboard("{ArrowUp}");

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
