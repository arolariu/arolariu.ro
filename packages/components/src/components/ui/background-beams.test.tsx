import * as React from "react";
import {act, render, screen} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";

import {BackgroundBeams} from "./background-beams";

let reduced = true;
let media: MediaQueryList;

beforeEach(() => {
  reduced = true;
  media = window.matchMedia("(prefers-reduced-motion: reduce)");
  Object.defineProperty(media, "matches", {configurable: true, get: () => reduced});
  vi.spyOn(window, "matchMedia").mockReturnValue(media);
});

describe("BackgroundBeams", () => {
  it("preserves React callback-ref cleanup without unsafe forwarded-ref casts", () => {
    const cleanup = vi.fn();
    const callback: React.RefCallback<HTMLDivElement> = (): (() => void) => cleanup;
    const {unmount} = render(<BackgroundBeams ref={callback} />);
    unmount();
    expect(cleanup).toHaveBeenCalledOnce();
  });
  it("scopes every SVG paint resource and preserves caller children and refs", () => {
    const ref = React.createRef<HTMLDivElement>();
    const {container} = render(
      <>
        <BackgroundBeams
          ref={ref}
          className='custom'>
          Visible content
        </BackgroundBeams>
        <BackgroundBeams />
      </>,
    );
    expect(ref.current).toHaveClass("custom");
    expect(screen.getByText("Visible content")).toBeInTheDocument();
    const ids = [...container.querySelectorAll("svg [id]")].map((node) => node.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const svg of container.querySelectorAll("svg")) {
      expect(svg).toHaveAttribute("aria-hidden", "true");
      expect(svg).toHaveAttribute("focusable", "false");
      for (const path of svg.querySelectorAll("path")) {
        const paint = path.getAttribute("stroke")?.match(/^url\(#(.+)\)$/u)?.[1];
        expect([...svg.querySelectorAll("[id]")].some((node) => node.id === paint)).toBe(true);
      }
    }
  });

  it("uses stable timings instead of rerandomizing each render", () => {
    const random = vi.spyOn(Math, "random");
    const {rerender, container} = render(<BackgroundBeams title='first' />);
    const gradient = container.querySelector("linearGradient");
    random.mockClear();
    rerender(<BackgroundBeams title='second' />);
    expect(random).not.toHaveBeenCalled();
    expect(container.querySelector("linearGradient")).toBe(gradient);
  });

  it("switches recurring Motion to static paint on live preference changes", () => {
    const ref = React.createRef<HTMLDivElement>();
    const {unmount} = render(<BackgroundBeams ref={ref} />);
    expect(ref.current).toHaveAttribute("data-motion", "paused");
    expect(ref.current?.querySelector("linearGradient")).toHaveAttribute("x2", "95%");
    act(() => {
      reduced = false;
      media.dispatchEvent(new Event("change"));
    });
    expect(ref.current).toHaveAttribute("data-motion", "running");
    act(() => {
      reduced = true;
      media.dispatchEvent(new Event("change"));
    });
    expect(ref.current).toHaveAttribute("data-motion", "paused");
    unmount();
    expect(ref.current).toBeNull();
  });
});
