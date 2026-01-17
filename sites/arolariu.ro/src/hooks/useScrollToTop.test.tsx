/**
 * @fileoverview Tests for ScrollToTop component.
 * @module hooks/useScrollToTop.test
 */

import {act, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {ScrollToTop} from "./useScrollToTop";

// Mock motion/react
vi.mock("motion/react", () => ({
  AnimatePresence: ({children}: {children: React.ReactNode}) => <>{children}</>,
  motion: {
    button: ({
      children,
      onClick,
      className,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      whileHover: _whileHover,
      whileTap: _whileTap,
    }: {
      children: React.ReactNode;
      onClick: () => void;
      className: string;
      initial: object;
      animate: object;
      exit: object;
      transition: object;
      whileHover: object;
      whileTap: object;
    }) => (
      <button
        onClick={onClick}
        className={className}
        data-testid='scroll-to-top'>
        {children}
      </button>
    ),
  },
}));

// Mock react-icons
vi.mock("react-icons/tb", () => ({
  TbChevronUp: () => <span data-testid='chevron-icon'>↑</span>,
}));

describe("ScrollToTop", () => {
  let scrollToMock: ReturnType<typeof vi.fn>;
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    scrollToMock = vi.fn();
    globalThis.scrollTo = scrollToMock;
    // Reset scrollY
    Object.defineProperty(globalThis, "scrollY", {
      value: 0,
      writable: true,
      configurable: true,
    });
    addEventListenerSpy = vi.spyOn(globalThis, "addEventListener");
    removeEventListenerSpy = vi.spyOn(globalThis, "removeEventListener");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("visibility", () => {
    it("should not render button when scrollY is 0", () => {
      render(<ScrollToTop />);

      expect(screen.queryByTestId("scroll-to-top")).not.toBeInTheDocument();
    });

    it("should not render button when scrollY is below threshold", () => {
      Object.defineProperty(globalThis, "scrollY", {value: 400, configurable: true});

      render(<ScrollToTop />);

      // Trigger scroll event
      act(() => {
        const scrollHandler = addEventListenerSpy.mock.calls.find((call) => call[0] === "scroll")?.[1] as EventListener;
        scrollHandler(new Event("scroll"));
      });

      expect(screen.queryByTestId("scroll-to-top")).not.toBeInTheDocument();
    });

    it("should render button when scrollY exceeds 500", () => {
      render(<ScrollToTop />);

      // Set scrollY above threshold and trigger scroll event
      Object.defineProperty(globalThis, "scrollY", {value: 501, configurable: true});
      act(() => {
        const scrollHandler = addEventListenerSpy.mock.calls.find((call) => call[0] === "scroll")?.[1] as EventListener;
        scrollHandler(new Event("scroll"));
      });

      expect(screen.getByTestId("scroll-to-top")).toBeInTheDocument();
    });

    it("should hide button when scrollY goes below threshold", () => {
      render(<ScrollToTop />);

      // First show the button
      Object.defineProperty(globalThis, "scrollY", {value: 600, configurable: true});
      act(() => {
        const scrollHandler = addEventListenerSpy.mock.calls.find((call) => call[0] === "scroll")?.[1] as EventListener;
        scrollHandler(new Event("scroll"));
      });

      expect(screen.getByTestId("scroll-to-top")).toBeInTheDocument();

      // Then scroll back up
      Object.defineProperty(globalThis, "scrollY", {value: 100, configurable: true});
      act(() => {
        const scrollHandler = addEventListenerSpy.mock.calls.find((call) => call[0] === "scroll")?.[1] as EventListener;
        scrollHandler(new Event("scroll"));
      });

      expect(screen.queryByTestId("scroll-to-top")).not.toBeInTheDocument();
    });
  });

  describe("scroll behavior", () => {
    it("should scroll to top when button is clicked", () => {
      render(<ScrollToTop />);

      // Show the button
      Object.defineProperty(globalThis, "scrollY", {value: 600, configurable: true});
      act(() => {
        const scrollHandler = addEventListenerSpy.mock.calls.find((call) => call[0] === "scroll")?.[1] as EventListener;
        scrollHandler(new Event("scroll"));
      });

      const button = screen.getByTestId("scroll-to-top");
      fireEvent.click(button);

      expect(scrollToMock).toHaveBeenCalledWith({
        top: 0,
        behavior: "smooth",
      });
    });
  });

  describe("event listeners", () => {
    it("should add scroll event listener on mount", () => {
      render(<ScrollToTop />);

      expect(addEventListenerSpy).toHaveBeenCalledWith("scroll", expect.any(Function));
    });

    it("should remove scroll event listener on unmount", () => {
      const {unmount} = render(<ScrollToTop />);

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith("scroll", expect.any(Function));
    });
  });

  describe("icon rendering", () => {
    it("should render chevron icon when visible", () => {
      render(<ScrollToTop />);

      // Show the button
      Object.defineProperty(globalThis, "scrollY", {value: 600, configurable: true});
      act(() => {
        const scrollHandler = addEventListenerSpy.mock.calls.find((call) => call[0] === "scroll")?.[1] as EventListener;
        scrollHandler(new Event("scroll"));
      });

      expect(screen.getByTestId("chevron-icon")).toBeInTheDocument();
    });
  });
});
