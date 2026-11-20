import {act, fireEvent, render, screen} from "@testing-library/svelte";
import {afterEach, describe, expect, it, vi} from "vitest";

import styles from "./Hero.module.scss";
import Hero from "./Hero.svelte";

describe("Hero", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the author's name in the level-1 heading", () => {
    const {getByRole} = render(Hero);
    const heading = getByRole("heading", {name: /Alexandru-Razvan\s+Olariu/i, level: 1});
    expect(heading).toBeTruthy();
  });

  it("renders all three role taglines at least once", () => {
    const {getAllByText} = render(Hero);
    expect(getAllByText(/software engineer/i).length).toBeGreaterThan(0);
    expect(getAllByText(/solution architect/i).length).toBeGreaterThan(0);
    expect(getAllByText(/mentor/i).length).toBeGreaterThan(0);
  });

  it("exposes the two CTAs as links", () => {
    const {getAllByRole} = render(Hero);
    const links = getAllByRole("link");
    const labels = links.map((l) => l.textContent?.trim().toLowerCase() ?? "");
    expect(labels.some((l) => /get in touch/.test(l))).toBe(true);
    expect(labels.some((l) => /view my work/.test(l))).toBe(true);
  });

  it("renders the avatar with intrinsic dimensions and async decoding", () => {
    const {container} = render(Hero);
    const img = container.querySelector("img[src='/author.jpeg']");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("width")).toBe("199");
    expect(img?.getAttribute("height")).toBe("199");
    expect(img?.getAttribute("decoding")).toBe("async");
    expect(img?.getAttribute("fetchpriority")).toBe("high");
  });

  it("keeps a loaded avatar hidden until the entrance delay finishes", async () => {
    vi.useFakeTimers({toFake: ["setTimeout", "clearTimeout"]});
    render(Hero);
    const avatar = screen.getByRole("img", {name: /Alexandru-Razvan Olariu/});

    await fireEvent.load(avatar);
    await act(() => vi.advanceTimersByTimeAsync(199));

    expect(avatar).toHaveClass(styles.hidden);

    await act(() => vi.advanceTimersByTimeAsync(1));

    expect(avatar).toHaveClass(styles.visible);
    expect(avatar).not.toHaveClass(styles.hidden);
  });

  it("shows a loaded avatar immediately when reduced motion is requested", async () => {
    vi.useFakeTimers({toFake: ["setTimeout", "clearTimeout"]});
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    vi.spyOn(preference, "matches", "get").mockReturnValue(true);
    vi.spyOn(window, "matchMedia").mockReturnValue(preference);
    render(Hero);
    const avatar = screen.getByRole("img", {name: /Alexandru-Razvan Olariu/});
    expect(avatar).toHaveClass(styles.hidden);

    await fireEvent.load(avatar);

    expect(avatar).toHaveClass(styles.visible);
    expect(avatar).not.toHaveClass(styles.hidden);
  });
});
