/**
 * @fileoverview Tests for the responsive site header.
 * @module components/Header.test
 */

import {render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import Header from "./Header";

describe("Header", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the mobile navigation and hides the desktop navigation on a narrow viewport", async () => {
    vi.stubGlobal("innerWidth", 375);

    render(<Header />);

    expect(await screen.findByText("app.navigation.mobile.openNavigation")).toBeInTheDocument();
    expect(screen.getByRole("link", {name: /arolariu\.ro/})).toHaveAttribute("href", "/");
    expect(document.querySelector(".header__center")).toBeEmptyDOMElement();
  });

  it("shows the desktop navigation and hides the mobile navigation on a wide viewport", async () => {
    vi.stubGlobal("innerWidth", 1280);

    render(<Header />);

    await vi.waitFor(() => expect(document.querySelector(".header__center")).not.toBeEmptyDOMElement());
    expect(screen.queryByText("app.navigation.mobile.openNavigation")).not.toBeInTheDocument();
  });
});
