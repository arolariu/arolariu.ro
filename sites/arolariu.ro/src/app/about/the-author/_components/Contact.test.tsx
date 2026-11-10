/**
 * @fileoverview Tests for the author contact section.
 * @module app/about/the-author/_components/Contact.test
 */

import {render, screen} from "@testing-library/react";
import {MotionGlobalConfig} from "motion/react";
import {afterAll, afterEach, beforeAll, describe, expect, it, vi} from "vitest";
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

describe("Contact", () => {
  beforeAll(() => {
    MotionGlobalConfig.skipAnimations = true;
  });

  afterAll(() => {
    MotionGlobalConfig.skipAnimations = false;
  });

  afterEach(() => {
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
});
