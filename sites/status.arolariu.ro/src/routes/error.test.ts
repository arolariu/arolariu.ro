import {render, screen} from "@testing-library/svelte";
import {describe, expect, it} from "vitest";
import {page} from "../__mocks__/$app/state";
import ErrorPage from "./+error.svelte";

describe("status error page", () => {
  it.each([
    {status: 404, error: {message: "This status page does not exist."}, text: "This status page does not exist."},
    {status: 500, error: null, text: "Something went wrong."},
  ])("shows the status and message when SvelteKit reports $status", ({status, error, text}) => {
    page.status = status;
    page.error = error;

    render(ErrorPage);

    expect(screen.getByRole("heading", {name: `Error ${status}`})).toBeInTheDocument();
    expect(screen.getByText(text)).toBeInTheDocument();
  });
});
