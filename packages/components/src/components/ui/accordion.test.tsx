import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it} from "vitest";

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
});
