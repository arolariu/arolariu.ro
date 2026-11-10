/**
 * @fileoverview Tests for the author contact section.
 * @module app/about/the-author/_components/Contact.test
 */

import {act, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {MotionGlobalConfig} from "motion/react";
import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import en from "../../../../../messages/en.json";
import Contact from "./Contact";

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

const activeToken = /(^|[\s_])linkBgActive([\s_]|$)/;

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

describe("Contact", () => {
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
    vi.useRealTimers();
    vi.unstubAllGlobals();
    globalThis.history.replaceState(null, "", "/");
    vi.restoreAllMocks();
  });

  it("is the #contact fragment target linked from the About hub", () => {
    render(<Contact />);

    const heading = screen.getByRole("heading", {level: 2, name: en.sections.about.author.contact.title});

    expect(heading.closest("section")).toHaveAttribute("id", "contact");
  });

  it("scrolls itself into view when it mounts after a #contact navigation", () => {
    globalThis.history.replaceState(null, "", "/about/the-author/#contact");
    const scrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView");

    const {container} = render(<Contact />);

    expect(scrollIntoView).toHaveBeenCalledOnce();
    expect(scrollIntoView.mock.contexts[0]).toBe(container.querySelector("section#contact"));
  });

  it("leaves the scroll position alone without the #contact fragment", () => {
    globalThis.history.replaceState(null, "", "/about/the-author/");
    const scrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView");

    render(<Contact />);

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("highlights only the hovered link row and clears it on mouse leave", () => {
    const {container} = render(<Contact />);
    const rows = [...container.querySelectorAll<HTMLElement>("[data-id]")];
    expect(rows.length).toBeGreaterThan(1);
    const [hoveredRow, otherRow] = rows as [HTMLElement, HTMLElement];
    const isActive = (row: HTMLElement): boolean => activeToken.test(row.firstElementChild?.className ?? "");

    expect(isActive(hoveredRow)).toBe(false);

    fireEvent.mouseEnter(hoveredRow);

    expect(isActive(hoveredRow)).toBe(true);
    expect(isActive(otherRow)).toBe(false);

    fireEvent.mouseLeave(hoveredRow);

    expect(isActive(hoveredRow)).toBe(false);
  });

  it("copies the email address, swaps the copy icon for a check, and reverts after two seconds", () => {
    vi.useFakeTimers({toFake: ["setTimeout", "clearTimeout"]});
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    const clipboardDescriptor = Object.getOwnPropertyDescriptor(globalThis.navigator, "clipboard");
    Object.defineProperty(globalThis.navigator, "clipboard", {configurable: true, value: {writeText}});

    try {
      const {container} = render(<Contact />);
      const emailRow = container.querySelector<HTMLElement>('[data-id="email"]');
      const copyButton = emailRow?.querySelector("button");
      if (!emailRow || !copyButton) {
        throw new Error("The email row copy button was not rendered.");
      }
      const iconOf = (): string => copyButton.querySelector("svg")?.outerHTML ?? "";
      const copyIcon = iconOf();

      expect(container.querySelectorAll("button")).toHaveLength(1);

      fireEvent.click(copyButton);

      expect(writeText).toHaveBeenCalledExactlyOnceWith("admin@arolariu.ro");
      expect(iconOf()).not.toBe(copyIcon);

      act(() => {
        vi.advanceTimersByTime(1999);
      });
      expect(iconOf()).not.toBe(copyIcon);

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(iconOf()).toBe(copyIcon);
    } finally {
      if (clipboardDescriptor) {
        Object.defineProperty(globalThis.navigator, "clipboard", clipboardDescriptor);
      } else {
        Reflect.deleteProperty(globalThis.navigator, "clipboard");
      }
    }
  });

  it("reveals the contact grid once it scrolls into view", async () => {
    render(<Contact />);
    expect(observations).toHaveLength(1);
    const [observation] = observations as [Observation];
    const grid = observation.target as HTMLElement;

    expect(grid).toHaveStyle({opacity: "0"});

    act(() => {
      observation.callback([{isIntersecting: true, target: grid}]);
    });

    await waitFor(() => expect(grid).toHaveStyle({opacity: "1"}));
  });

  it("defensive invariant: ignores a hover on a link row that lost its data-id", () => {
    const {container} = render(<Contact />);
    const row = container.querySelector<HTMLElement>("[data-id]");
    if (!row) {
      throw new Error("No link row was rendered.");
    }
    row.removeAttribute("data-id");

    fireEvent.mouseEnter(row);

    expect(activeToken.test(row.firstElementChild?.className ?? "")).toBe(false);
  });
});
