/**
 * @fileoverview Render-smoke test for the Icon registry.
 *
 * Asserts:
 *  - Each tested known name renders an <svg> element.
 *  - An unknown name produces no SVG (the {#if/:else if} chain has no
 *    fallback branch — it renders nothing).
 *  - Numeric size prop produces a CSS dimension style.
 */

import {render} from "@testing-library/svelte";
import {describe, expect, it} from "vitest";

import Icon from "./Icon.svelte";

describe("Icon", () => {
  it.each([
    ["arrow-left"],
    ["arrow-right"],
    ["download"],
    ["github"],
    ["help"],
  ] as const)("renders an <svg> for the known name %s", (name) => {
    const {container} = render(Icon, {props: {name}});
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("renders nothing for an unknown name", () => {
    // Casting through unknown is required because the IconName union
    // does not include this string; the component still gracefully
    // renders nothing because every branch is guarded by the name.
    const {container} = render(Icon, {props: {name: "not-a-real-icon" as unknown as never}});
    expect(container.querySelector("svg")).toBeNull();
  });

  it("applies width/height from a numeric size prop", () => {
    const {container} = render(Icon, {props: {name: "github", size: 24}});
    const svg = container.querySelector("svg");
    // jsdom normalizes the style attribute (inserts spaces after colons),
    // so the regex allows optional whitespace between property and value.
    expect(svg?.getAttribute("style")).toMatch(/width:\s*24px/);
    expect(svg?.getAttribute("style")).toMatch(/height:\s*24px/);
  });

  it("applies width/height from a CSS-string size prop", () => {
    const {container} = render(Icon, {props: {name: "github", size: "1.5rem"}});
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("style")).toMatch(/width:\s*1\.5rem/);
  });
});
