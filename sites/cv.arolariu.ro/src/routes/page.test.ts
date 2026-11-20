import * as navigation from "$app/navigation";
import {fireEvent, render, screen} from "@testing-library/svelte";
import {describe, expect, it, vi} from "vitest";

import Page from "./+page.svelte";

describe("CV format menu", () => {
  it.each([
    ["CV - Human Readable Format", "/human"],
    ["CV - PDF Format", "/pdf"],
    ["CV - JSON Format", "/json"],
  ])("opens the matching route from the %s panel", async (label, destination) => {
    const goto = vi.spyOn(navigation, "goto");
    render(Page);
    expect(goto).not.toHaveBeenCalled();

    await fireEvent.click(screen.getByRole("button", {name: label}));

    expect(goto).toHaveBeenCalledExactlyOnceWith(destination);
  });
});
