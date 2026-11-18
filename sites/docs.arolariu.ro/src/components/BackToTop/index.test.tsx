// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";
import {act, cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, expect, it, vi} from "vitest";
import BackToTop from "./index";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.scrollTo({top: 0});
});

it.each([
  [false, "smooth"],
  [true, "auto"],
] as const)("appears only after the scroll threshold and returns to the top (reduced motion: %s)", (reduced, behavior) => {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  vi.spyOn(media, "matches", "get").mockReturnValue(reduced);
  vi.spyOn(window, "matchMedia").mockReturnValue(media);
  window.scrollTo({top: 400});
  render(<BackToTop />);
  expect(screen.queryByRole("button", {name: "back to top"})).not.toBeInTheDocument();

  act(() => {
    window.scrollTo({top: 401});
    fireEvent.scroll(window);
  });
  const button = screen.getByRole("button", {name: "back to top"});
  const scroll = vi.spyOn(window, "scrollTo");

  fireEvent.click(button);

  expect(scroll).toHaveBeenCalledExactlyOnceWith({top: 0, behavior});
});
