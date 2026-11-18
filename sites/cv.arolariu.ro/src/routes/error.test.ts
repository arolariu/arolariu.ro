import * as navigation from "$app/navigation";
import {page} from "$app/state";
import {fireEvent, render, screen} from "@testing-library/svelte";
import {beforeEach, describe, expect, it, vi} from "vitest";

import ErrorPage from "./+error.svelte";

describe("+error.svelte", () => {
  beforeEach(() => {
    page.status = 200;
    page.error = null;
    page.url = new URL("https://cv.arolariu.ro/");
  });

  it("provides a way home instead of a retry for an unavailable route", async () => {
    const goto = vi.spyOn(navigation, "goto");
    const invalidate = vi.spyOn(navigation, "invalidateAll");
    page.status = 404;
    page.error = {message: "Missing route"};
    render(ErrorPage);
    expect(screen.getByRole("heading", {name: "Page Not Found"})).toBeInTheDocument();
    expect(screen.queryByRole("button", {name: "Try Again"})).not.toBeInTheDocument();
    expect(screen.queryByText("Technical Details")).not.toBeInTheDocument();

    await fireEvent.click(screen.getByRole("button", {name: "Go Home"}));

    expect(goto).toHaveBeenCalledExactlyOnceWith("/");
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("retries the current route without navigating away for a service outage", async () => {
    const goto = vi.spyOn(navigation, "goto");
    const invalidate = vi.spyOn(navigation, "invalidateAll");
    page.status = 503;
    page.error = {message: "Service temporarily unavailable"};
    render(ErrorPage);
    expect(screen.getByRole("heading", {name: "Service Unavailable"})).toBeInTheDocument();

    await fireEvent.click(screen.getByRole("button", {name: "Try Again"}));

    expect(invalidate).toHaveBeenCalledOnce();
    expect(goto).not.toHaveBeenCalled();
  });

  it.each([
    [{message: "Temporary gateway failure"}, "Temporary gateway failure"],
    [null, "An unexpected error occurred."],
  ] as const)("shows a useful fallback description for an unmapped gateway error (%s)", (error, description) => {
    page.status = 502;
    page.error = error;

    render(ErrorPage);

    expect(screen.getByRole("heading", {name: "Something Went Wrong"})).toBeInTheDocument();
    expect(screen.getByText(description, {selector: "p"})).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Try Again"})).toBeEnabled();
  });
});
