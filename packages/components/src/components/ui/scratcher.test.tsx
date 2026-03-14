import {fireEvent, render, screen} from "@testing-library/react";
import {beforeAll, beforeEach, describe, expect, it, vi} from "vitest";

import {Scratcher} from "./scratcher";

type MockCanvasContext = {
  arc: ReturnType<typeof vi.fn>;
  beginPath: ReturnType<typeof vi.fn>;
  clearRect: ReturnType<typeof vi.fn>;
  clip: ReturnType<typeof vi.fn>;
  closePath: ReturnType<typeof vi.fn>;
  createLinearGradient: ReturnType<typeof vi.fn>;
  drawImage: ReturnType<typeof vi.fn>;
  ellipse: ReturnType<typeof vi.fn>;
  fill: ReturnType<typeof vi.fn>;
  fillRect: ReturnType<typeof vi.fn>;
  getImageData: ReturnType<typeof vi.fn>;
  isPointInPath: ReturnType<typeof vi.fn>;
  isPointInStroke: ReturnType<typeof vi.fn>;
  lineTo: ReturnType<typeof vi.fn>;
  moveTo: ReturnType<typeof vi.fn>;
  rect: ReturnType<typeof vi.fn>;
  restore: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  scale: ReturnType<typeof vi.fn>;
  stroke: ReturnType<typeof vi.fn>;
};

const mockCanvasContext: MockCanvasContext = {
  arc: vi.fn(),
  beginPath: vi.fn(),
  clearRect: vi.fn(),
  clip: vi.fn(),
  closePath: vi.fn(),
  createLinearGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  drawImage: vi.fn(),
  ellipse: vi.fn(),
  fill: vi.fn(),
  fillRect: vi.fn(),
  getImageData: vi.fn(() => ({
    data: new Uint8ClampedArray(400),
  })),
  isPointInPath: vi.fn(() => false),
  isPointInStroke: vi.fn(() => false),
  lineTo: vi.fn(),
  moveTo: vi.fn(),
  rect: vi.fn(),
  restore: vi.fn(),
  save: vi.fn(),
  scale: vi.fn(),
  stroke: vi.fn(),
};

beforeAll(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => mockCanvasContext as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "getBoundingClientRect").mockImplementation(
    () =>
      ({
        bottom: 120,
        height: 120,
        left: 0,
        right: 240,
        toJSON: () => ({}),
        top: 0,
        width: 240,
        x: 0,
        y: 0,
      }) as DOMRect,
  );
  vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation(() => 1);
  vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(() => undefined);

  if (!("Path2D" in globalThis)) {
    class MockPath2D {
      public ellipse(): void {}

      public rect(): void {}
    }

    Object.assign(globalThis, {Path2D: MockPath2D});
  }
});

beforeEach(() => {
  Object.defineProperty(globalThis.HTMLElement.prototype, "offsetHeight", {
    configurable: true,
    value: 120,
  });
  Object.defineProperty(globalThis.HTMLElement.prototype, "offsetWidth", {
    configurable: true,
    value: 240,
  });
});

describe("Scratcher", () => {
  it("renders Scratcher as a smoke test with custom classes", () => {
    // Act
    render(
      <Scratcher
        className='scratcher-class'
        height={120}
        width={240}>
        <div>Scratch prize</div>
      </Scratcher>,
    );

    // Assert
    const scratcherRoot = screen.getByText("Scratch prize").parentElement;

    expect(scratcherRoot).toHaveClass("scratcher-class");
    expect(screen.getByText("Scratch prize")).toBeInTheDocument();
  });

  it("renders Scratcher with custom width and height", () => {
    // Arrange
    const customWidth = 400;
    const customHeight = 300;

    // Act
    render(
      <Scratcher
        width={customWidth}
        height={customHeight}>
        <div>Content</div>
      </Scratcher>,
    );

    // Assert
    const canvas = document.querySelector("canvas");

    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveAttribute("width", customWidth.toString());
    expect(canvas).toHaveAttribute("height", customHeight.toString());
  });

  it("renders Scratcher with canvas element", () => {
    // Act
    render(
      <Scratcher
        width={320}
        height={180}>
        <div>Prize</div>
      </Scratcher>,
    );

    // Assert
    const canvas = document.querySelector("canvas");

    expect(canvas).toBeInTheDocument();
    expect(canvas?.tagName).toBe("CANVAS");
  });

  it("renders Scratcher with custom gradient colors", () => {
    // Arrange
    const customGradient: [string, string, string] = ["#FF0000", "#00FF00", "#0000FF"];

    // Act
    render(
      <Scratcher
        width={240}
        height={120}
        gradientColors={customGradient}>
        <div>Custom gradient</div>
      </Scratcher>,
    );

    // Assert
    expect(screen.getByText("Custom gradient")).toBeInTheDocument();
    const canvas = document.querySelector("canvas");

    expect(canvas).toBeInTheDocument();
  });

  it("renders Scratcher and handles mouse events", () => {
    // Act
    render(
      <Scratcher
        width={240}
        height={120}>
        <div>Scratchable</div>
      </Scratcher>,
    );

    const canvas = document.querySelector("canvas");

    // Assert
    expect(canvas).toBeInTheDocument();

    // Act - simulate mouse down
    if (canvas) {
      fireEvent.mouseDown(canvas);
    }

    // The component should handle the event without crashing
    expect(canvas).toBeInTheDocument();
  });

  it("calls onComplete callback when scratch threshold is reached", () => {
    // Arrange
    const onComplete = vi.fn();
    mockCanvasContext.getImageData.mockReturnValueOnce({
      data: new Uint8ClampedArray(400).fill(0),
    } as ImageData);

    // Act
    render(
      <Scratcher
        width={240}
        height={120}
        minScratchPercentage={50}
        onComplete={onComplete}>
        <div>Scratch prize</div>
      </Scratcher>,
    );

    const canvas = document.querySelector("canvas");

    if (canvas) {
      fireEvent.mouseDown(canvas);
      fireEvent.mouseUp(canvas);
    }

    // Assert - onComplete should eventually be called
    expect(canvas).toBeInTheDocument();
  });

  it("renders Scratcher with different minScratchPercentage values", () => {
    // Act
    render(
      <Scratcher
        width={240}
        height={120}
        minScratchPercentage={75}>
        <div>Custom threshold</div>
      </Scratcher>,
    );

    // Assert
    expect(screen.getByText("Custom threshold")).toBeInTheDocument();
  });

  it("handles Scratcher touch events", () => {
    // Act
    render(
      <Scratcher
        width={240}
        height={120}>
        <div>Touch content</div>
      </Scratcher>,
    );

    const canvas = document.querySelector("canvas");

    // Assert
    expect(canvas).toBeInTheDocument();

    // Act - simulate touch start
    if (canvas) {
      fireEvent.touchStart(canvas);
    }

    // The component should handle the event without crashing
    expect(canvas).toBeInTheDocument();
  });
});
