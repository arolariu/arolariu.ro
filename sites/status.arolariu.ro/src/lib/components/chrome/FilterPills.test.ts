import {fireEvent, render, screen} from "@testing-library/svelte";
import {describe, expect, it, vi} from "vitest";
import type {FilterWindow} from "../../types/status";
import FilterPills from "./FilterPills.svelte";

describe("FilterPills", () => {
  it.each([
    ["1d", "ArrowLeft", "365d"],
    ["365d", "ArrowRight", "1d"],
    ["1d", "End", "365d"],
    ["365d", "Home", "1d"],
  ] as const)("moves focus and selection from %s with %s to %s", async (initial, key, next) => {
    const onChange = vi.fn<(window: FilterWindow) => void>();
    const {rerender} = render(FilterPills, {props: {activeWindow: initial, onChange}});
    const previous = screen.getByRole("radio", {name: initial, checked: true});
    const target = screen.getByRole("radio", {name: next, checked: false});
    previous.focus();

    await fireEvent.keyDown(previous, {key});

    expect(onChange).toHaveBeenCalledExactlyOnceWith(next);
    expect(target).toHaveFocus();
    expect(previous).toHaveAttribute("aria-checked", "true");

    await rerender({activeWindow: next});

    expect(target).toHaveAttribute("aria-checked", "true");
    expect(target).toHaveAttribute("tabindex", "0");
    expect(previous).toHaveAttribute("aria-checked", "false");
    expect(previous).toHaveAttribute("tabindex", "-1");
  });

  it("leaves selection alone for Tab and requests a new window on click", async () => {
    const onChange = vi.fn<(window: FilterWindow) => void>();
    render(FilterPills, {props: {activeWindow: "1d", onChange}});
    const previous = screen.getByRole("radio", {name: "1d", checked: true});
    const target = screen.getByRole("radio", {name: "7d", checked: false});

    await fireEvent.keyDown(previous, {key: "Tab"});

    expect(onChange).not.toHaveBeenCalled();

    await fireEvent.click(target);

    expect(onChange).toHaveBeenCalledExactlyOnceWith("7d");
  });
});
