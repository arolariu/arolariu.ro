import {act, render, screen, within} from "@testing-library/svelte";
import {createRawSnippet} from "svelte";
import {afterEach, describe, expect, it, vi} from "vitest";

import AnimatedSection from "./AnimatedSection.svelte";

describe("AnimatedSection", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reveals content already in the viewport without waiting for the safety timer", () => {
    const children = createRawSnippet(() => ({render: () => "<span>Visible content</span>"}));

    render(AnimatedSection, {props: {children, id: "about", class: "custom-class", animation: "fade-left", duration: 0}});

    const section = screen.getByRole("region", {name: "Section: about"});
    expect(section).toHaveAttribute("id", "about");
    expect(section).toHaveClass("custom-class");
    expect(section).toHaveStyle({opacity: "1", transform: "translate(0.00px, 0.00px) scale(1.000)"});
    expect(within(section).getByText("Visible content")).toBeVisible();
  });

  it("reveals an off-screen section at the safety deadline when no intersection is reported", async () => {
    vi.useFakeTimers({toFake: ["setTimeout", "clearTimeout"]});
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(new DOMRect(0, window.innerHeight + 20, 200, 80));
    const children = createRawSnippet(() => ({render: () => "<span>Below the fold</span>"}));
    render(AnimatedSection, {props: {children, animation: "scale-up", duration: 0}});
    const section = screen.getByRole("region", {name: "Content section"});
    expect(section).toHaveStyle({opacity: "0", transform: "translate(0.00px, 0.00px) scale(0.950)"});

    await act(() => vi.advanceTimersByTimeAsync(1199));

    expect(section).toHaveStyle({opacity: "0"});

    await act(() => vi.advanceTimersByTimeAsync(1));

    expect(section).toHaveStyle({opacity: "1", transform: "translate(0.00px, 0.00px) scale(1.000)"});
    expect(screen.getByText("Below the fold")).toBeVisible();
  });
});
