import {cleanup, render, screen} from "@testing-library/react";
import type {DetachedWindowAPI} from "happy-dom";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {createRef} from "react";
import {afterEach, beforeEach, describe, expect, it} from "vitest";

import {Skeleton} from "./skeleton";

const stylesheet = readFileSync(join(import.meta.dirname, "skeleton.module.css"), "utf8");

declare global {
  interface Window {
    readonly happyDOM: DetachedWindowAPI;
  }
}

describe("Skeleton", () => {
  it("keeps an observable caller-named loading placeholder when animation is explicitly disabled", () => {
    render(
      <Skeleton
        animated={false}
        role='status'
        aria-label='Preparing the preview'
      />,
    );
    const placeholder = screen.getByRole("status", {name: "Preparing the preview"});
    expect(placeholder).toHaveAttribute("data-animated", "false");
    expect(placeholder).toHaveAttribute("data-slot", "skeleton");
    expect(placeholder).not.toHaveAttribute("animated");
  });

  describe("Skeleton motion styles", () => {
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

    it.each(["no-preference", "reduce"] as const)("keeps a named loading surface with %s media preference", (preference) => {
      window.happyDOM.settings.device.prefersReducedMotion = preference;
      render(
        <Skeleton
          className='skeleton'
          role='status'
          aria-label='Preparing content'
        />,
      );
      const placeholder = screen.getByRole("status", {name: "Preparing content"});
      const animation = getComputedStyle(placeholder).animation;
      if (preference === "reduce") expect(animation).toBe("none");
      else expect(animation).toContain("infinite");
    });

    it("applies the explicit static state outside the animation keyframes", () => {
      window.happyDOM.settings.device.prefersReducedMotion = "no-preference";
      render(
        <Skeleton
          className='skeleton'
          animated={false}
          role='status'
          aria-label='Preparing content'
        />,
      );
      expect(getComputedStyle(screen.getByRole("status", {name: "Preparing content"})).animation).toBe("none");
    });
  });
  it("renders without crashing", () => {
    render(<Skeleton data-testid='skeleton' />);

    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();

    render(<Skeleton ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("applies custom className alongside default styles", () => {
    render(
      <Skeleton
        className='custom-skeleton'
        data-testid='skeleton'
      />,
    );

    const skeleton = screen.getByTestId("skeleton");

    expect(skeleton).toHaveClass("custom-skeleton");
    expect(skeleton.className).not.toBe("custom-skeleton");
  });

  it("renders children", () => {
    render(
      <Skeleton>
        <span>Loading profile</span>
      </Skeleton>,
    );

    expect(screen.getByText("Loading profile")).toBeInTheDocument();
  });

  it("forwards accessibility attributes", () => {
    render(
      <Skeleton
        role='status'
        aria-label='Loading account summary'
      />,
    );

    expect(screen.getByRole("status", {name: "Loading account summary"})).toBeInTheDocument();
  });
});
