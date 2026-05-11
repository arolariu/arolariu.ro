/**
 * @fileoverview Render-smoke tests for the global +error.svelte boundary.
 *
 * Asserts:
 *  - The default 404 mapping renders the "Page Not Found" title.
 *  - The Try-Again button is hidden for 4xx errors but shown for 5xx.
 */

import {render} from "@testing-library/svelte";
import {describe, expect, it} from "vitest";

import ErrorPage from "./+error.svelte";
import {page} from "../__mocks__/$app/state";

describe("+error.svelte", () => {
  it("renders the 404 title for a 404 status", () => {
    page.status = 404;
    page.error = {message: "test"};
    const {getByRole} = render(ErrorPage);
    expect(getByRole("heading", {name: /page not found/i, level: 1})).toBeTruthy();
  });

  it("shows only Go Home for a 4xx error", () => {
    page.status = 404;
    page.error = {message: "test"};
    const {getByRole, queryByRole} = render(ErrorPage);
    expect(getByRole("button", {name: /go home/i})).toBeTruthy();
    expect(queryByRole("button", {name: /try again/i})).toBeNull();
  });

  it("shows the retry button on 5xx errors", () => {
    page.status = 503;
    page.error = {message: "boom"};
    const {getByRole} = render(ErrorPage);
    expect(getByRole("button", {name: /try again/i})).toBeTruthy();
  });
});
