import {render, screen} from "@testing-library/svelte";
import {createRawSnippet} from "svelte";
import {describe, expect, it} from "vitest";
import Layout from "./+layout.svelte";

describe("Status route layout", () => {
  it("replaces the previous route content when the router supplies new children", async () => {
    const dashboard = createRawSnippet(() => ({render: () => "<h1>Service status</h1>"}));
    const errorPage = createRawSnippet(() => ({render: () => "<h1>Status unavailable</h1>"}));
    const {rerender} = render(Layout, {props: {children: dashboard}});
    expect(screen.getByRole("heading", {name: "Service status", level: 1})).toBeInTheDocument();

    await rerender({children: errorPage});

    expect(screen.getByRole("heading", {name: "Status unavailable", level: 1})).toBeInTheDocument();
    expect(screen.queryByRole("heading", {name: "Service status"})).not.toBeInTheDocument();
  });
});
