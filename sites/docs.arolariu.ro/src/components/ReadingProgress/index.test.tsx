// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";
import {act, cleanup, fireEvent, render} from "@testing-library/react";
import {afterEach, expect, it, vi} from "vitest";
import ReadingProgress from "./index";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  window.scrollTo({top: 0});
});

it("shows scroll progress only for a long page and coalesces scroll events into one frame", () => {
  vi.useFakeTimers({toFake: ["requestAnimationFrame", "cancelAnimationFrame"]});
  const viewport = window.innerHeight;
  const scrollHeight = vi.spyOn(document.documentElement, "scrollHeight", "get").mockReturnValue(viewport);
  const frame = vi.spyOn(window, "requestAnimationFrame");
  const {container} = render(<ReadingProgress />);
  expect(container.firstElementChild).toBeNull();

  scrollHeight.mockReturnValue(viewport * 2);
  fireEvent(window, new Event("resize"));
  const bar = container.querySelector("[aria-hidden='true']");
  expect(bar).toHaveStyle({width: "0%"});

  act(() => {
    window.scrollTo({top: viewport / 2});
    fireEvent.scroll(window);
    fireEvent.scroll(window);
  });
  expect(frame).toHaveBeenCalledOnce();
  expect(bar).toHaveStyle({width: "0%"});

  act(() => {
    vi.advanceTimersToNextFrame();
  });

  expect(bar).toHaveStyle({width: "50%"});

  scrollHeight.mockReturnValue(viewport);
  fireEvent(window, new Event("resize"));
  expect(bar).not.toBeInTheDocument();
});

it("cancels the pending scroll frame when the page unmounts", () => {
  vi.useFakeTimers({toFake: ["requestAnimationFrame", "cancelAnimationFrame"]});
  const request = vi.spyOn(window, "requestAnimationFrame");
  const cancel = vi.spyOn(window, "cancelAnimationFrame");
  const {unmount} = render(<ReadingProgress />);
  fireEvent.scroll(window);
  expect(request).toHaveBeenCalledOnce();
  const pendingFrame = request.mock.results[0]?.value;

  unmount();

  expect(cancel).toHaveBeenCalledExactlyOnceWith(pendingFrame);
});
