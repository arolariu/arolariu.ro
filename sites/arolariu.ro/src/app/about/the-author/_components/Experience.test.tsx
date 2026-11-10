/**
 * @fileoverview Tests for the author professional experience timeline.
 * @module app/about/the-author/_components/Experience.test
 */

import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import {MotionGlobalConfig} from "motion/react";
import {afterAll, beforeAll, describe, expect, it, vi} from "vitest";
import en from "../../../../../messages/en.json";
import Experience from "./Experience";

vi.mock("next-intl-selector", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next-intl-selector")>();
  const {default: messages} = await import("../../../../../messages/en.json");

  return {
    ...actual,
    useTranslations: () => (selector: import("next-intl-selector").MessageSelector) =>
      actual
        .pathFromSelector(selector)
        .split(".")
        .reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], messages) as string,
  };
});

const experiences = en.sections.about.author.experiences;

function paragraphsOf(description: string): string[] {
  return description.split("\n").filter((paragraph) => paragraph.trim().length > 0);
}

function panelOf(title: string): HTMLElement {
  const panel = screen.getByRole("heading", {level: 3, name: title}).closest<HTMLElement>("[style*='z-index']");
  if (!panel) {
    throw new Error(`The panel for ${title} was not rendered.`);
  }
  return panel;
}

describe("Experience", () => {
  beforeAll(() => {
    MotionGlobalConfig.skipAnimations = true;
  });

  afterAll(() => {
    MotionGlobalConfig.skipAnimations = false;
  });

  it("lists the Copilot Platform role first, followed by the M365 AI role", () => {
    render(<Experience />);

    const [currentRole, previousRole] = screen.getAllByRole("button");

    expect(currentRole).toHaveTextContent(experiences.microsoft4.title);
    expect(currentRole).toHaveTextContent(experiences.microsoft4.period);
    expect(previousRole).toHaveTextContent(experiences.microsoft3.title);
    expect(previousRole).toHaveTextContent(experiences.microsoft3.period);
  });

  it.each(["microsoft4", "microsoft3"] as const)("renders each %s description paragraph as its own paragraph", (experienceKey) => {
    const paragraphs = paragraphsOf(experiences[experienceKey].description);
    expect(paragraphs.length).toBeGreaterThan(1);

    render(<Experience />);

    for (const paragraph of paragraphs) {
      expect(screen.getByText(paragraph).tagName).toBe("P");
    }
  });

  it("switches the active timeline panel when another role is selected", async () => {
    render(<Experience />);
    const [firstButton, secondButton] = screen.getAllByRole("button") as [HTMLElement, HTMLElement];
    const first = panelOf(experiences.microsoft4.title);
    const second = panelOf(experiences.microsoft3.title);

    expect(first).toHaveStyle({zIndex: "1"});
    expect(second).toHaveStyle({zIndex: "0"});

    fireEvent.click(secondButton);

    expect(second).toHaveStyle({zIndex: "1"});
    expect(first).toHaveStyle({zIndex: "0"});
    await waitFor(() => expect(second).toHaveStyle({pointerEvents: "auto"}));
    expect(first).toHaveStyle({pointerEvents: "none"});

    fireEvent.click(firstButton);

    expect(first).toHaveStyle({zIndex: "1"});
    expect(second).toHaveStyle({zIndex: "0"});
    await waitFor(() => expect(first).toHaveStyle({pointerEvents: "auto"}));
    expect(second).toHaveStyle({pointerEvents: "none"});
  });

  it("defensive invariant: keeps the active panel when a role button lost its data-index", () => {
    render(<Experience />);
    const [, secondButton] = screen.getAllByRole("button") as [HTMLElement, HTMLElement];
    const firstPanel = panelOf(experiences.microsoft4.title);
    const secondPanel = panelOf(experiences.microsoft3.title);
    secondButton.removeAttribute("data-index");

    fireEvent.click(secondButton);

    expect(firstPanel).toHaveStyle({zIndex: "1"});
    expect(secondPanel).toHaveStyle({zIndex: "0"});
  });
});
