import {render, screen, waitFor} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";

import {CountingNumber} from "./counting-number";

type MotionValue = {
  get: () => number;
  on: (event: "change", listener: (latest: number) => void) => () => void;
  set: (value: number) => void;
};

const {useInViewMock, useSpringMock} = vi.hoisted(() => ({
  useInViewMock: vi.fn(() => true),
  useSpringMock: vi.fn((value: MotionValue) => value),
}));

vi.mock("motion/react", async () => {
  const ReactModule = await import("react");

  function createMotionValue(initialValue: number): MotionValue {
    let currentValue = initialValue;
    const listeners = new Set<(latest: number) => void>();

    return {
      get: () => currentValue,
      on: (_event, listener) => {
        listeners.add(listener);
        listener(currentValue);

        return () => {
          listeners.delete(listener);
        };
      },
      set: (value) => {
        currentValue = value;

        for (const listener of listeners) {
          listener(value);
        }
      },
    };
  }

  return {
    useInView: useInViewMock,
    useMotionValue: (initialValue: number) => ReactModule.useMemo(() => createMotionValue(initialValue), [initialValue]),
    useSpring: useSpringMock,
  };
});

describe("CountingNumber", () => {
  beforeEach(() => {
    useInViewMock.mockReset();
    useInViewMock.mockReturnValue(true);
    useSpringMock.mockClear();
  });

  it("renders the target number once the motion value updates", async () => {
    render(
      <CountingNumber
        number={42}
        data-testid='counting-number'
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("counting-number")).toHaveTextContent("42");
    });
  });

  it("formats decimal places with the provided separator", async () => {
    render(
      <CountingNumber
        number={3.14159}
        decimalPlaces={2}
        decimalSeparator=','
        data-testid='counting-number'
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("counting-number")).toHaveTextContent("3,14");
    });
  });

  it("waits until the element is in view before updating the displayed number", async () => {
    useInViewMock.mockReturnValue(false);

    const {rerender} = render(
      <CountingNumber
        number={50}
        inView
        inViewMargin='100px'
        inViewOnce={false}
        data-testid='counting-number'
      />,
    );

    expect(screen.getByTestId("counting-number")).toHaveTextContent("0");
    expect(useInViewMock).toHaveBeenLastCalledWith(
      expect.any(Object),
      expect.objectContaining({
        margin: "100px",
        once: false,
      }),
    );

    useInViewMock.mockReturnValue(true);

    rerender(
      <CountingNumber
        number={50}
        inView
        inViewMargin='100px'
        inViewOnce={false}
        data-testid='counting-number'
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("counting-number")).toHaveTextContent("50");
    });
  });

  it("keeps the padded placeholder while the value is still out of view", () => {
    useInViewMock.mockReturnValue(false);

    render(
      <CountingNumber
        number={123.45}
        decimalPlaces={2}
        decimalSeparator=','
        padStart
        inView
        data-testid='counting-number'
      />,
    );

    expect(screen.getByTestId("counting-number")).toHaveTextContent("000,00");
  });

  it("forwards transition options to useSpring", () => {
    const transition = {stiffness: 200, damping: 20};

    render(
      <CountingNumber
        number={25}
        transition={transition}
      />,
    );

    expect(useSpringMock).toHaveBeenCalledWith(
      expect.objectContaining({
        get: expect.any(Function),
        on: expect.any(Function),
        set: expect.any(Function),
      }),
      transition,
    );
  });

  it("merges custom classes and forwards refs", () => {
    const ref = {current: null as HTMLSpanElement | null};

    render(
      <CountingNumber
        ref={ref}
        number={10}
        className='custom-count'
        data-testid='counting-number'
      />,
    );

    expect(screen.getByTestId("counting-number")).toHaveClass("custom-count");
    expect(ref.current).toBe(screen.getByTestId("counting-number"));
  });
});
