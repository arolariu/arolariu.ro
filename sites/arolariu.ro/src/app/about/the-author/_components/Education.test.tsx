/**
 * @fileoverview Tests for the author education cards.
 * @module app/about/the-author/_components/Education.test
 */

import {act, fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import {MotionGlobalConfig} from "motion/react";
import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
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

type ObserverEntry = {isIntersecting: boolean; target: Element};
type Observation = {callback: (entries: ObserverEntry[]) => void; target: Element};

const glowToken = /(^|[\s_])glowEffect([\s_]|$)/;
const frontCourse = "6.S191 - Introduction to Deep Learning";

// motion may cache its observer per root, so observations are tracked per target instead of per constructed instance.
const observations: Observation[] = [];

class StubIntersectionObserver {
  private readonly callback: (entries: ObserverEntry[]) => void;

  constructor(callback: (entries: ObserverEntry[]) => void) {
    this.callback = callback;
  }

  observe(target: Element): void {
    observations.push({callback: this.callback, target});
  }

  unobserve(target: Element): void {
    const index = observations.findIndex((observation) => observation.target === target);
    if (index !== -1) {
      observations.splice(index, 1);
    }
  }

  disconnect(): void {}
}

function detailsButtonOf(card: HTMLElement): HTMLElement {
  const [button] = within(card).getAllByRole("button", {name: "See more details"});
  if (!button) {
    throw new Error("The details button was not rendered.");
  }
  return button;
}

function mitCardOf(): HTMLElement {
  const heading = screen.getByRole("heading", {level: 3, name: "Graduate Program in Software Design & Engineering"});
  const card = heading.closest("[data-index]");
  if (!(card instanceof HTMLElement)) {
    throw new Error("The MIT course-of-study card was not rendered.");
  }
  return card;
}

describe("Education", () => {
  beforeAll(() => {
    MotionGlobalConfig.skipAnimations = true;
  });

  afterAll(() => {
    MotionGlobalConfig.skipAnimations = false;
  });

  beforeEach(() => {
    observations.length = 0;
    vi.stubGlobal("IntersectionObserver", StubIntersectionObserver);
    // motion's resolveElements tests `instanceof EventTarget`, which is false for happy-dom elements against the Node global.
    vi.stubGlobal("EventTarget", Object.getPrototypeOf(globalThis.Node));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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

  it("flips the MIT card back to its front face from the icon-only back button", async () => {
    render(<Education />);
    const mitCard = mitCardOf();

    fireEvent.click(detailsButtonOf(mitCard));
    await screen.findByRole("heading", {level: 4, name: "Additional courses"});
    expect(within(mitCard).queryByText(frontCourse)).not.toBeInTheDocument();

    fireEvent.click(within(mitCard).getByRole("button"));

    expect(await within(mitCard).findByText(frontCourse)).toBeInTheDocument();
    expect(within(mitCard).queryByRole("heading", {level: 4, name: "Additional courses"})).not.toBeInTheDocument();
  });

  it("shows a glow only on the hovered card and removes it on mouse leave or flip", async () => {
    const {container} = render(<Education />);
    const mitCard = mitCardOf();
    const otherCard = container.querySelector<HTMLElement>('[data-index="1"]');
    if (!otherCard) {
      throw new Error("The second education card was not rendered.");
    }
    const glowCount = (): number => [...container.querySelectorAll("div")].filter((element) => glowToken.test(element.className)).length;

    expect(glowCount()).toBe(0);

    fireEvent.mouseEnter(mitCard);
    expect(glowCount()).toBe(1);
    expect([...mitCard.children].some((child) => glowToken.test(child.className))).toBe(true);
    expect([...otherCard.children].some((child) => glowToken.test(child.className))).toBe(false);

    fireEvent.mouseLeave(mitCard);
    expect(glowCount()).toBe(0);

    fireEvent.mouseEnter(mitCard);
    expect(glowCount()).toBe(1);
    fireEvent.click(detailsButtonOf(mitCard));
    await screen.findByRole("heading", {level: 4, name: "Additional courses"});
    expect(glowCount()).toBe(0);
  });

  it("reveals the education list once it scrolls into view", async () => {
    render(<Education />);
    expect(observations).toHaveLength(1);
    const [observation] = observations as [Observation];
    const list = observation.target as HTMLElement;

    expect(list).toHaveStyle({opacity: "0"});

    act(() => {
      observation.callback([{isIntersecting: true, target: list}]);
    });

    await waitFor(() => expect(list).toHaveStyle({opacity: "1"}));
  });

  it("defensive invariant: ignores hover and flip clicks on a card that lost its data-index", () => {
    const {container} = render(<Education />);
    const mitCard = mitCardOf();
    const detailsButton = detailsButtonOf(mitCard);
    mitCard.removeAttribute("data-index");
    detailsButton.removeAttribute("data-index");

    fireEvent.mouseEnter(mitCard);
    fireEvent.click(detailsButton);

    expect([...container.querySelectorAll("div")].some((element) => glowToken.test(element.className))).toBe(false);
    expect(within(mitCard).getByText(frontCourse)).toBeInTheDocument();
    expect(within(mitCard).queryByRole("heading", {level: 4, name: "Additional courses"})).not.toBeInTheDocument();
  });
});
