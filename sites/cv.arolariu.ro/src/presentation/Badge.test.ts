/**
 * @fileoverview Render-smoke test for the Badge primitive.
 *
 * Asserts:
 *  - Renders a <span> carrying the text prop verbatim.
 *  - aria-label falls back to title, then to text when no title is given.
 *  - Default props (color=blue, variant=soft, size=md) produce a valid render.
 */

import {render} from "@testing-library/svelte";
import {describe, expect, it} from "vitest";

import Badge from "./Badge.svelte";

describe("Badge", () => {
  it("renders the text inside a <span>", () => {
    const {container} = render(Badge, {props: {text: "TypeScript"}});
    const span = container.querySelector("span");
    expect(span).not.toBeNull();
    expect(span?.textContent).toBe("TypeScript");
  });

  it("aria-label defaults to the text when no title is provided", () => {
    const {container} = render(Badge, {props: {text: "Svelte"}});
    expect(container.querySelector("span")?.getAttribute("aria-label")).toBe("Svelte");
  });

  it("aria-label uses the title when one is provided", () => {
    const {container} = render(Badge, {props: {text: "TS", title: "TypeScript 5.x"}});
    expect(container.querySelector("span")?.getAttribute("aria-label")).toBe("TypeScript 5.x");
  });

  it("renders with non-default color/variant/size without throwing", () => {
    const {container} = render(Badge, {
      props: {text: "Test", color: "green", variant: "outline", size: "sm"},
    });
    expect(container.querySelector("span")?.textContent).toBe("Test");
  });
});
