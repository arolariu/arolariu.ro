import {render} from "@testing-library/svelte";
import {beforeEach, describe, expect, it, vi} from "vitest";

import Skills from "./Skills.svelte";

describe("Skills section (Bento mosaic)", () => {
  beforeEach(() => {
    // The setup-file mock uses an arrow function and cannot be `new`-invoked,
    // which breaks AnimatedSection's IntersectionObserver wiring. Use a real
    // function so it is constructor-callable.
    global.IntersectionObserver = vi.fn(function (this: IntersectionObserver) {
      this.observe = vi.fn();
      this.unobserve = vi.fn();
      this.disconnect = vi.fn();
      this.takeRecords = vi.fn(() => []);
      return this;
    }) as unknown as typeof IntersectionObserver;
  });

  it("renders heading 'What I Build With'", () => {
    const {getByRole} = render(Skills);
    const heading = getByRole("heading", {name: /what i build with/i, level: 2});
    expect(heading).toBeTruthy();
  });

  it("renders exactly 12 skill tiles", () => {
    const {container} = render(Skills);
    const tiles = container.querySelectorAll("[data-skill-tile]");
    expect(tiles).toHaveLength(12);
  });

  it("renders no proficiency bars (regression guard)", () => {
    const {container} = render(Skills);
    const bars = container.querySelectorAll('[role="progressbar"]');
    expect(bars).toHaveLength(0);
  });

  it("renders one hero tile", () => {
    const {container} = render(Skills);
    const heroes = container.querySelectorAll('[data-skill-tile][data-skill-size="hero"]');
    expect(heroes).toHaveLength(1);
  });

  it("renders 2 large, 3 medium, 6 small tiles", () => {
    const {container} = render(Skills);
    expect(container.querySelectorAll('[data-skill-tile][data-skill-size="lg"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-skill-tile][data-skill-size="md"]')).toHaveLength(3);
    expect(container.querySelectorAll('[data-skill-tile][data-skill-size="sm"]')).toHaveLength(6);
  });

  it("renders the hero caption text", () => {
    const {getByText} = render(Skills);
    expect(getByText(/my production languages\. most of what i ship\./i)).toBeTruthy();
  });
});
