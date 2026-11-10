/**
 * @fileoverview Tests for the author education cards.
 * @module app/about/the-author/_components/Education.test
 */

import {fireEvent, render, screen, within} from "@testing-library/react";
import {MotionGlobalConfig} from "motion/react";
import {afterAll, beforeAll, describe, expect, it, vi} from "vitest";
import Education from "./Education";

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

describe("Education", () => {
  beforeAll(() => {
    MotionGlobalConfig.skipAnimations = true;
  });

  afterAll(() => {
    MotionGlobalConfig.skipAnimations = false;
  });

  it("shows Portsmouth enrollment and self-directed MIT study without implying completed degrees", () => {
    render(<Education />);

    expect(screen.getByRole("heading", {level: 3, name: "MSc. in Data Science"})).toBeInTheDocument();
    expect(screen.getByRole("heading", {level: 3, name: "Graduate Program in Software Design & Engineering"})).toBeInTheDocument();
    expect(screen.getByText(/the degree was not completed/i)).toBeInTheDocument();
    expect(screen.getByText(/self-directed, self-paced, remote-only course of study/i)).toBeInTheDocument();
  });

  it("makes all eight MIT courses available across both sides of its card", async () => {
    render(<Education />);

    const mitHeading = screen.getByRole("heading", {level: 3, name: "Graduate Program in Software Design & Engineering"});
    const mitCard = mitHeading.closest("[data-index]");
    if (!(mitCard instanceof HTMLElement)) {
      throw new Error("The MIT course-of-study card was not rendered.");
    }

    const initialCourses = [
      "6.S191 - Introduction to Deep Learning",
      "6.5660 / 6.858 - Computer Systems Security",
      "6.172 - Performance Engineering of Software Systems",
      "18.225 - Graph Theory and Additive Combinatorics",
      "6.033 - Computer System Engineering",
    ];
    const additionalCourses = ["6.8300 - Advances in Computer Vision", "6.5950 - Secure Hardware Design", "6.5060 - Algorithm Engineering"];

    for (const course of initialCourses) {
      expect(within(mitCard).getByText(course)).toBeInTheDocument();
    }
    for (const course of additionalCourses) {
      expect(within(mitCard).queryByText(course)).not.toBeInTheDocument();
    }

    const detailsButton = mitCard.querySelector<HTMLButtonElement>('button[aria-label="See more details"]');
    if (!detailsButton) {
      throw new Error("The MIT course-of-study details button was not rendered.");
    }
    fireEvent.click(detailsButton);
    await screen.findByRole("heading", {level: 4, name: "Additional courses"});

    for (const course of additionalCourses) {
      expect(await within(mitCard).findByText(course)).toBeInTheDocument();
    }
  });
});
