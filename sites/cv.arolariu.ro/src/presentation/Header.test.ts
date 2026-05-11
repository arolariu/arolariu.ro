/**
 * @fileoverview Render test for the Header chrome component.
 *
 * Asserts:
 *  - Brand <h1> always renders with the author name.
 *  - showNavLinks=true exposes the four in-page nav anchors;
 *    showNavLinks=false hides them.
 *  - ThemeToggle is present (its accessible name "Toggle theme").
 *  - actionsConfig items render as buttons with their labels.
 */

import {render} from "@testing-library/svelte";
import {describe, expect, it, vi} from "vitest";

import Header from "./Header.svelte";

describe("Header", () => {
  it("always renders the brand <h1>", () => {
    const {container} = render(Header);
    const h1 = container.querySelector("h1");
    expect(h1).not.toBeNull();
    expect(h1?.textContent).toMatch(/Olariu/);
  });

  it("renders the four in-page nav anchors when showNavLinks=true (default)", () => {
    const {container} = render(Header);
    const nav = container.querySelector("nav");
    expect(nav).not.toBeNull();
    const anchors = nav?.querySelectorAll("a[href^='#']") ?? [];
    expect(anchors.length).toBeGreaterThanOrEqual(4);
    const hrefs = Array.from(anchors, (a) => a.getAttribute("href"));
    expect(hrefs).toContain("#about");
    expect(hrefs).toContain("#experience");
    expect(hrefs).toContain("#skills");
    expect(hrefs).toContain("#contact");
  });

  it("hides the in-page nav when showNavLinks=false", () => {
    const {container} = render(Header, {props: {showNavLinks: false}});
    expect(container.querySelector("nav")).toBeNull();
  });

  it("includes the theme toggle", () => {
    const {getByRole} = render(Header);
    expect(getByRole("button", {name: /toggle theme/i})).toBeTruthy();
  });

  it("renders buttons for each actionsConfig entry", () => {
    const onClick = vi.fn();
    const {getByRole} = render(Header, {
      props: {
        actionsConfig: [
          {icon: "print" as const, label: "Print", loading: false, disabled: false, onClick},
          {icon: "download" as const, label: "Download PDF", loading: false, disabled: false, onClick},
        ],
      },
    });
    expect(getByRole("button", {name: /print/i})).toBeTruthy();
    expect(getByRole("button", {name: /download pdf/i})).toBeTruthy();
  });
});
