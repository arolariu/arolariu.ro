/**
 * @fileoverview Tests for the site footer subdomain links.
 * @module components/Footer.test
 */

import {render, screen} from "@testing-library/react";
import {afterAll, describe, expect, it, vi} from "vitest";

// SITE_NAME is an import-time constant, so the env must be stubbed before the module loads.
vi.hoisted(() => {
  vi.stubEnv("SITE_NAME", "arolariu.ro");
});

import Footer from "./Footer";

describe("Footer", () => {
  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("links to the dev subdomain and not to the production site when SITE_NAME is arolariu.ro", () => {
    render(<Footer />);

    expect(screen.getByRole("link", {name: "dev.arolariu.ro"})).toHaveAttribute("href", "https://dev.arolariu.ro");
    expect(screen.queryByRole("link", {name: "arolariu.ro"})).not.toBeInTheDocument();
    expect(screen.getByRole("link", {name: "cv.arolariu.ro"})).toHaveAttribute("href", "https://cv.arolariu.ro");
  });

  it("ends with a decorative toolbar tint strip hidden from assistive technology", () => {
    render(<Footer />);

    const tint = screen.getByRole("contentinfo").lastElementChild;

    expect(tint).toHaveClass("footer__toolbar-tint");
    expect(tint).toHaveAttribute("aria-hidden", "true");
    expect(tint).toBeEmptyDOMElement();
  });
});
