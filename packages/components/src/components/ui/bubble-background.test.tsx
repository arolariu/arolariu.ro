import * as React from "react";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {act, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";

import {BubbleBackground, type BubbleBackgroundColors} from "./bubble-background";

let reduced = true;
let media: MediaQueryList;
const colors: BubbleBackgroundColors = {
  first: "10,20,30",
  second: "40 50 60",
  third: "70, 80, 90",
  fourth: "100 110 120",
  fifth: "130,140,150",
  sixth: "160 170 180",
};

beforeEach(() => {
  reduced = true;
  media = window.matchMedia("(prefers-reduced-motion: reduce)");
  Object.defineProperty(media, "matches", {configurable: true, get: () => reduced});
  vi.spyOn(window, "matchMedia").mockReturnValue(media);
});

describe("BubbleBackground", () => {
  it("retains the palette when an optional caller override is undefined", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <BubbleBackground
        ref={ref}
        style={{"--ac-bubble-first-color": undefined}}
      />,
    );
    expect(ref.current?.style.getPropertyValue("--ac-bubble-first-color")).toBe("18 113 255");
  });
  it("normalizes comma and space RGB triplets for the authored slash-alpha CSS grammar", () => {
    const {container} = render(<BubbleBackground colors={colors} />);
    const root = container.querySelector("div");
    expect(root?.style.getPropertyValue("--ac-bubble-first-color")).toBe("10 20 30");
    expect(root?.style.getPropertyValue("--ac-bubble-second-color")).toBe("40 50 60");
    expect(root?.style.getPropertyValue("--ac-bubble-third-color")).toBe("70 80 90");
    expect(root?.style.getPropertyValue("--ac-bubble-fourth-color")).toBe("100 110 120");
    expect(root?.style.getPropertyValue("--ac-bubble-fifth-color")).toBe("130 140 150");
    expect(root?.style.getPropertyValue("--ac-bubble-sixth-color")).toBe("160 170 180");
    const css = readFileSync(resolve("packages", "components", "src", "components", "ui", "bubble-background.module.css"), "utf8");
    expect(css).toMatch(/rgb\(var\(--ac-bubble-first-color\) \/ 0\.8\)/u);
  });

  it("merges ordinary style with the palette and honors normalized caller custom-property overrides", () => {
    const ref = React.createRef<HTMLDivElement>();
    const callerStyle: React.CSSProperties & {"--ac-bubble-first-color": string} = {
      opacity: 0.5,
      "--ac-bubble-first-color": "1,2,3",
    };
    render(
      <BubbleBackground
        ref={ref}
        colors={colors}
        style={callerStyle}>
        Content
      </BubbleBackground>,
    );
    expect(ref.current).toHaveStyle({opacity: "0.5", "--ac-bubble-first-color": "1 2 3", "--ac-bubble-second-color": "40 50 60"});
    expect(ref.current?.style.getPropertyValue("--ac-bubble-first-color")).toBe("1 2 3");
    expect(ref.current?.style.getPropertyValue("--ac-bubble-second-color")).toBe("40 50 60");
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it.each(["1,2", "NaN,2,3", "256,2,3", "1,,2,3", "rgb(1,2,3)", "1 2 3 / .8"])("explicitly rejects invalid channel input %s", (first) => {
    expect(() => render(<BubbleBackground colors={{...colors, first}} />)).toThrow(/RGB/u);
  });

  it("scopes the goo filter and its CSS reference per instance", () => {
    const first = React.createRef<HTMLDivElement>();
    const second = React.createRef<HTMLDivElement>();
    render(
      <>
        <BubbleBackground ref={first} />
        <BubbleBackground ref={second} />
      </>,
    );
    const firstId = first.current?.querySelector("filter")?.id;
    const secondId = second.current?.querySelector("filter")?.id;
    expect(firstId).not.toBe(secondId);
    expect(first.current?.style.getPropertyValue("--ac-bubble-filter")).toContain(`#${firstId}`);
    expect(second.current?.style.getPropertyValue("--ac-bubble-filter")).toContain(`#${secondId}`);
  });

  it("stops the interactive follower on preference change and removes owned listeners on unmount", async () => {
    reduced = false;
    const ref = React.createRef<HTMLDivElement>();
    const {unmount} = render(
      <BubbleBackground
        ref={ref}
        interactive
        transition={{duration: 0}}
      />,
    );
    const root = ref.current;
    if (!root) throw new Error("Missing root");
    vi.spyOn(root, "getBoundingClientRect").mockReturnValue(new DOMRect(10, 20, 200, 100));
    const remove = vi.spyOn(root, "removeEventListener");
    fireEvent.mouseMove(root, {clientX: 40, clientY: 30});
    const movingFollower = root.querySelector<HTMLDivElement>('[data-bubble="interactive"]');
    await waitFor(() => {
      expect(movingFollower?.style.transform).toContain("-70px");
      expect(movingFollower?.style.transform).toContain("-40px");
    });
    act(() => {
      reduced = true;
      media.dispatchEvent(new Event("change"));
    });
    expect(root).toHaveAttribute("data-motion", "paused");
    expect(remove).toHaveBeenCalledWith("mousemove", expect.any(Function));
    const follower = root.querySelector('[data-bubble="interactive"]');
    await waitFor(() => expect(follower).toHaveStyle({transform: "none"}));
    unmount();
    expect(ref.current).toBeNull();
  });
});
