/**
 * @fileoverview Render-smoke test for AnimatedSection.
 *
 * Asserts:
 *  - Renders a <section> element.
 *  - Children passed via the children snippet appear inside the section.
 *  - The id and class props are forwarded to the rendered element.
 *  - aria-label is built from the id ("Section: {id}") or falls back
 *    to a default when no id is given.
 *
 * Notes:
 *  - vitest.setup.ts installs a non-constructor IntersectionObserver
 *    stub. AnimatedSection's transitive import uses `new` on it, so
 *    we install a constructor-friendly override in beforeEach (same
 *    pattern as the human-view section tests).
 */

import {render} from "@testing-library/svelte";
import {createRawSnippet} from "svelte";
import {beforeEach, describe, expect, it, vi} from "vitest";

import AnimatedSection from "./AnimatedSection.svelte";

describe("AnimatedSection", () => {
  beforeEach(() => {
    global.IntersectionObserver = vi.fn(function (this: IntersectionObserver) {
      this.observe = vi.fn();
      this.unobserve = vi.fn();
      this.disconnect = vi.fn();
      this.takeRecords = vi.fn(() => []);
      return this;
    }) as unknown as typeof IntersectionObserver;
  });

  it("renders a <section> wrapping the children snippet", () => {
    const childSnippet = createRawSnippet(() => ({
      render: () => `<span data-testid="child">inside</span>`,
    }));
    const {container, getByTestId} = render(AnimatedSection, {props: {children: childSnippet}});
    expect(container.querySelector("section")).not.toBeNull();
    expect(getByTestId("child").textContent).toBe("inside");
  });

  it("forwards the id prop to the <section>", () => {
    const childSnippet = createRawSnippet(() => ({render: () => `<span>x</span>`}));
    const {container} = render(AnimatedSection, {props: {children: childSnippet, id: "about"}});
    expect(container.querySelector("section")?.getAttribute("id")).toBe("about");
  });

  it("forwards the class prop to the <section>", () => {
    const childSnippet = createRawSnippet(() => ({render: () => `<span>x</span>`}));
    const {container} = render(AnimatedSection, {
      props: {children: childSnippet, class: "custom-class"},
    });
    expect(container.querySelector("section")?.className).toContain("custom-class");
  });

  it("derives aria-label from the id prop when present", () => {
    const childSnippet = createRawSnippet(() => ({render: () => `<span>x</span>`}));
    const {container} = render(AnimatedSection, {
      props: {children: childSnippet, id: "experience"},
    });
    expect(container.querySelector("section")?.getAttribute("aria-label")).toBe("Section: experience");
  });

  it("uses a generic aria-label when no id is provided", () => {
    const childSnippet = createRawSnippet(() => ({render: () => `<span>x</span>`}));
    const {container} = render(AnimatedSection, {props: {children: childSnippet}});
    expect(container.querySelector("section")?.getAttribute("aria-label")).toBe("Content section");
  });
});
