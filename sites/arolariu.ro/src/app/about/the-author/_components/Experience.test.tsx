/**
 * @fileoverview Tests for the author professional experience timeline.
 * @module app/about/the-author/_components/Experience.test
 */

import {render, screen} from "@testing-library/react";
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
});
