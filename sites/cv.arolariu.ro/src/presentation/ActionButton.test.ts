/**
 * @fileoverview Behaviour tests for the ActionButton component.
 *
 * Covers the five visible states:
 *  - Renders label text inside the <button>.
 *  - `disabled` prop disables the button.
 *  - `loading` prop disables AND shows a spinner.
 *  - `back && !icon` renders the arrow-left icon.
 *  - `icon` prop renders a named icon.
 *  - onclick handler fires when the button is clicked.
 */

import {fireEvent, render} from "@testing-library/svelte";
import {describe, expect, it, vi} from "vitest";

import ActionButton from "./ActionButton.svelte";

describe("ActionButton", () => {
  it("renders the label inside a <button>", () => {
    const {container} = render(ActionButton, {props: {label: "Download"}});
    const button = container.querySelector("button");
    expect(button).not.toBeNull();
    expect(button?.textContent).toContain("Download");
  });

  it("is disabled when disabled prop is true", () => {
    const {container} = render(ActionButton, {props: {label: "Disabled", disabled: true}});
    expect(container.querySelector("button")?.hasAttribute("disabled")).toBe(true);
  });

  it("is disabled and shows a spinner when loading prop is true", () => {
    const {container} = render(ActionButton, {props: {label: "Loading", loading: true}});
    expect(container.querySelector("button")?.hasAttribute("disabled")).toBe(true);
    // Spinner has aria-hidden, but its <circle> + animated <path> are the marker.
    expect(container.querySelector("button svg circle")).not.toBeNull();
  });

  it("renders the arrow-left icon when back=true and no icon prop", () => {
    const {container} = render(ActionButton, {props: {label: "Back", back: true}});
    // The Icon component renders <svg> when name="arrow-left"; that
    // SVG's <path> has the distinctive d="M15 19l-7-7 7-7" shape.
    const path = container.querySelector("button svg path");
    expect(path?.getAttribute("d")).toBe("M15 19l-7-7 7-7");
  });

  it("renders the named icon when icon prop is provided", () => {
    const {container} = render(ActionButton, {props: {label: "Print", icon: "print"}});
    // The print icon path includes "M18.75 17H20" — a distinctive
    // marker that identifies it among the 14 registered icons.
    const printPath = container.querySelector('button svg path[d^="M18.75 17H20"]');
    expect(printPath).not.toBeNull();
  });

  it("fires onClick when clicked", async () => {
    const onClick = vi.fn();
    const {container} = render(ActionButton, {props: {label: "Click me", onClick}});
    const button = container.querySelector("button");
    expect(button).not.toBeNull();
    await fireEvent.click(button!);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
