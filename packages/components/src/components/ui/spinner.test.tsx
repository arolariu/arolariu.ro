import {cleanup, render, screen} from "@testing-library/react";
import type {DetachedWindowAPI} from "happy-dom";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {createRef} from "react";
import {afterEach, beforeEach, describe, expect, it} from "vitest";

import {Spinner} from "./spinner";

const stylesheet = readFileSync(join(import.meta.dirname, "spinner.module.css"), "utf8");

declare global {
  interface Window {
    readonly happyDOM: DetachedWindowAPI;
  }
}

describe("Spinner", () => {
  it("retains a named loading status and visible static indicator without forwarding animation configuration to SVG", () => {
    render(
      <Spinner
        animated={false}
        aria-label='Preparing the preview'
      />,
    );
    const indicator = screen.getByRole("status", {name: "Preparing the preview"});
    expect(indicator).toHaveAttribute("data-animated", "false");
    expect(indicator).toHaveAttribute("data-slot", "spinner");
    expect(indicator).not.toHaveAttribute("animated");
    expect(indicator.querySelector("path")).toHaveAttribute("stroke", "currentColor");
  });

  describe("Spinner motion styles", () => {
    let styleElement: HTMLStyleElement;
    let previousMotion: typeof window.happyDOM.settings.device.prefersReducedMotion;

    beforeEach(() => {
      previousMotion = window.happyDOM.settings.device.prefersReducedMotion;
      styleElement = document.createElement("style");
      styleElement.textContent = stylesheet;
      document.head.append(styleElement);
    });
    afterEach(() => {
      cleanup();
      styleElement.remove();
      window.happyDOM.settings.device.prefersReducedMotion = previousMotion;
    });

    it.each(["no-preference", "reduce"] as const)("retains a named indicator with %s media preference", (preference) => {
      window.happyDOM.settings.device.prefersReducedMotion = preference;
      render(
        <Spinner
          className='spinner'
          aria-label='Preparing content'
        />,
      );
      const indicator = screen.getByRole("status", {name: "Preparing content"});
      const animation = getComputedStyle(indicator).animation;
      if (preference === "reduce") expect(animation).toBe("none");
      else expect(animation).toContain("infinite");
    });

    it("applies explicit static state outside the animation keyframes", () => {
      window.happyDOM.settings.device.prefersReducedMotion = "no-preference";
      render(
        <Spinner
          className='spinner'
          animated={false}
          aria-label='Preparing content'
        />,
      );
      expect(getComputedStyle(screen.getByRole("status", {name: "Preparing content"})).animation).toBe("none");
    });
  });
  it("renders without crashing", () => {
    render(<Spinner />);

    expect(screen.getByRole("status", {name: "Loading"})).toBeInTheDocument();
  });

  it("forwards ref", () => {
    const ref = createRef<SVGSVGElement>();

    render(<Spinner ref={ref} />);

    expect(ref.current).toBeInstanceOf(SVGSVGElement);
  });

  it("applies custom className alongside default styles", () => {
    render(<Spinner className='custom-spinner' />);

    const spinner = screen.getByRole("status", {name: "Loading"});

    expect(spinner).toHaveClass("custom-spinner");
    expect(spinner.getAttribute("class")).not.toBe("custom-spinner");
  });

  it("renders children", () => {
    render(
      <Spinner>
        <title>Loading dashboard</title>
      </Spinner>,
    );

    expect(screen.getByText("Loading dashboard")).toBeInTheDocument();
  });

  it("forwards accessibility attributes", () => {
    render(
      <Spinner
        aria-label='Saving changes'
        aria-live='polite'
      />,
    );

    const spinner = screen.getByRole("status", {name: "Saving changes"});

    expect(spinner).toHaveAttribute("aria-live", "polite");
  });
});
