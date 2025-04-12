/** @format */

import {act, renderHook} from "@testing-library/react";
import {useWindowSize} from "./useWindowSize";

describe("useWindowSize", () => {
  beforeEach(() => {
    // Mock window.innerWidth and window.innerHeight
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, "innerHeight", {
      writable: true,
      configurable: true,
      value: 768,
    });
  });

  it("should return initial window size", () => {
    const {result} = renderHook(() => useWindowSize());

    expect(result.current.windowSize.width).toBe(1024);
    expect(result.current.windowSize.height).toBe(768);
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isDesktop).toBe(true);
  });

  it("should update window size on resize", () => {
    const {result} = renderHook(() => useWindowSize());

    act(() => {
      window.innerWidth = 500;
      window.innerHeight = 400;
      window.dispatchEvent(new Event("resize"));
    });

    expect(result.current.windowSize.width).toBe(500);
    expect(result.current.windowSize.height).toBe(400);
    expect(result.current.isMobile).toBe(true);
    expect(result.current.isDesktop).toBe(false);
  });

  it("should handle desktop size correctly", () => {
    const {result} = renderHook(() => useWindowSize());

    act(() => {
      window.innerWidth = 1024;
      window.innerHeight = 768;
      window.dispatchEvent(new Event("resize"));
    });

    expect(result.current.windowSize.width).toBe(1024);
    expect(result.current.windowSize.height).toBe(768);
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isDesktop).toBe(true);
  });

  it("should handle mobile size correctly", () => {
    const {result} = renderHook(() => useWindowSize());

    act(() => {
      window.innerWidth = 600;
      window.innerHeight = 800;
      window.dispatchEvent(new Event("resize"));
    });

    expect(result.current.windowSize.width).toBe(600);
    expect(result.current.windowSize.height).toBe(800);
    expect(result.current.isMobile).toBe(true);
    expect(result.current.isDesktop).toBe(false);
  });

  it("does not throw when window is undefined", () => {
    const {result} = renderHook(() => useWindowSize());

    act(() => {
      window.innerWidth = undefined!;
      window.innerHeight = undefined!;
      window.dispatchEvent(new Event("resize"));
    });

    expect(result.current.windowSize.width).toBe(undefined);
    expect(result.current.windowSize.height).toBe(undefined);
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isDesktop).toBe(false);
  });
});
