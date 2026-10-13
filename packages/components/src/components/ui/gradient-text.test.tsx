import * as React from "react";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {act, render, screen} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";

import {GradientText} from "./gradient-text";

let reduced = true;
let media: MediaQueryList;
beforeEach(() => {
  reduced = true;
  media = window.matchMedia("(prefers-reduced-motion: reduce)");
  Object.defineProperty(media, "matches", {configurable: true, get: () => reduced});
  vi.spyOn(window, "matchMedia").mockReturnValue(media);
});

describe("GradientText", () => {
  it("retains the requested gradient when an optional caller bridge is undefined", () => {
    const ref = React.createRef<HTMLSpanElement>();
    const gradient = "linear-gradient(90deg, red, blue)";
    render(
      <GradientText
        ref={ref}
        text='Content'
        gradient={gradient}
        style={{"--ac-gradient-text-background": undefined}}
      />,
    );
    expect(ref.current?.style.getPropertyValue("--ac-gradient-text-background")).toBe(gradient);
  });
  it("merges the gradient bridge with caller style and renders only one accessible text copy", () => {
    const ref = React.createRef<HTMLSpanElement>();
    const gradient = "linear-gradient(90deg, red, blue)";
    render(
      <GradientText
        ref={ref}
        gradient={gradient}
        neon
        text='Glow'
        style={{opacity: 0.5}}
      />,
    );
    expect(ref.current).toHaveStyle({opacity: "0.5", "--ac-gradient-text-background": gradient});
    expect(ref.current?.style.getPropertyValue("--ac-gradient-text-background")).toBe(gradient);
    const copies = screen.getAllByText("Glow");
    expect(copies).toHaveLength(2);
    expect(copies.filter((copy) => copy.getAttribute("aria-hidden") !== "true")).toHaveLength(1);
    expect(ref.current).toHaveAttribute("data-motion", "paused");
  });

  it("keeps caller content mounted and switches Motion on live preference changes", () => {
    const {container} = render(
      <GradientText
        text='Text'
        neon>
        <img
          alt='Related image'
          src='image.png'
        />
      </GradientText>,
    );
    expect(screen.getByRole("img", {name: "Related image"})).toBeInTheDocument();
    act(() => {
      reduced = false;
      media.dispatchEvent(new Event("change"));
    });
    expect(container.firstElementChild).toHaveAttribute("data-motion", "running");
    act(() => {
      reduced = true;
      media.dispatchEvent(new Event("change"));
    });
    expect(container.firstElementChild).toHaveAttribute("data-motion", "paused");
  });

  it("authors readable forced-colors text instead of leaving a transparent gradient-only glyph", () => {
    const css = readFileSync(resolve("packages", "components", "src", "components", "ui", "gradient-text.module.css"), "utf8");
    expect(css).toMatch(/@media\s*\(forced-colors:\s*active\)/u);
    expect(css).toMatch(/color:\s*CanvasText/u);
    expect(css).toMatch(/-webkit-text-fill-color:\s*CanvasText/u);
    expect(css).toMatch(/\.neon\s*\{\s*display:\s*none/u);
  });
});
