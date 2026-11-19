// @vitest-environment happy-dom
// @vitest-environment-options {"settings":{"device":{"prefersReducedMotion":"reduce"}}}

import {act, render, screen} from "@testing-library/svelte";
import {afterEach, describe, expect, it, vi} from "vitest";
import AnimatedSection from "./AnimatedSection.svelte";

describe("AnimatedSection with reduced motion", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reveals content already in view without waiting for its animation delay", () => {
    render(AnimatedSection, {props: {id: "about", animation: "scale-up", delay: 5000, duration: 8}});

    const section = screen.getByRole("region", {name: "Section: about"});
    expect(section).toHaveStyle({opacity: "1", transform: "translate(0.00px, 0.00px) scale(1.000)"});
  });

  it("reveals off-screen content immediately when the safety deadline arrives", async () => {
    vi.useFakeTimers({toFake: ["setTimeout", "clearTimeout"]});
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(new DOMRect(0, window.innerHeight + 20, 200, 80));
    render(AnimatedSection, {props: {animation: "fade-down", delay: 5000, duration: 8}});
    const section = screen.getByRole("region", {name: "Content section"});

    await act(() => vi.advanceTimersByTimeAsync(1199));

    expect(section).toHaveStyle({opacity: "0", transform: "translate(0.00px, -8.00px) scale(1.000)"});

    await act(() => vi.advanceTimersByTimeAsync(1));

    expect(section).toHaveStyle({opacity: "1", transform: "translate(0.00px, 0.00px) scale(1.000)"});
  });
});
