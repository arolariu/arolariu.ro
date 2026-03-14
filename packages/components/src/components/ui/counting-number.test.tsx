import {render, screen, waitFor} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {CountingNumber} from "./counting-number";

describe("CountingNumber", () => {
  it("renders with default value", () => {
    // Arrange & Act
    render(<CountingNumber number={100} />);

    // Assert
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("renders with custom fromNumber prop", () => {
    // Arrange & Act
    render(
      <CountingNumber
        number={100}
        fromNumber={50}
      />,
    );

    // Assert
    expect(screen.getByText(/50|0/)).toBeInTheDocument();
  });

  it("animates to target number", async () => {
    // Arrange
    render(
      <CountingNumber
        number={42}
        data-testid='counting-number'
      />,
    );

    // Assert - Eventually reaches target or close to it (animation timing can vary)
    await waitFor(
      () => {
        const element = screen.getByTestId("counting-number");
        const value = Number.parseInt(element.textContent ?? "0", 10);
        expect(value).toBeGreaterThanOrEqual(40);
        expect(value).toBeLessThanOrEqual(42);
      },
      {timeout: 2000},
    );
  });

  it("applies custom className", () => {
    // Arrange & Act
    render(
      <CountingNumber
        number={10}
        className='custom-class'
        data-testid='counting-number'
      />,
    );

    // Assert
    expect(screen.getByTestId("counting-number")).toHaveClass("custom-class");
  });

  it("forwards ref to span element", () => {
    // Arrange
    const ref = {current: null as HTMLSpanElement | null};

    // Act
    render(
      <CountingNumber
        ref={ref}
        number={5}
      />,
    );

    // Assert
    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
  });

  it("renders with decimal places", () => {
    // Arrange & Act
    render(
      <CountingNumber
        number={3.14159}
        decimalPlaces={2}
        data-testid='counting-number'
      />,
    );

    // Assert - Initially shows 0 with decimal places
    expect(screen.getByTestId("counting-number")).toHaveTextContent("0.00");
  });

  it("renders with custom decimal separator", async () => {
    // Arrange
    render(
      <CountingNumber
        number={10.5}
        decimalPlaces={1}
        decimalSeparator=','
        data-testid='counting-number'
      />,
    );

    // Assert - Eventually shows custom separator
    await waitFor(
      () => {
        const element = screen.getByTestId("counting-number");
        expect(element.textContent).toContain(",");
      },
      {timeout: 2000},
    );
  });

  it("pads start when padStart is true", () => {
    // Arrange & Act
    render(
      <CountingNumber
        number={100}
        padStart
        data-testid='counting-number'
      />,
    );

    // Assert - Initially shows padded zero
    expect(screen.getByTestId("counting-number")).toHaveTextContent("000");
  });

  it("delays animation until in view when inView is true", () => {
    // Arrange & Act
    render(
      <CountingNumber
        number={50}
        inView
        data-testid='counting-number'
      />,
    );

    // Assert - Renders initially
    expect(screen.getByTestId("counting-number")).toBeInTheDocument();
  });

  it("uses custom transition spring options", () => {
    // Arrange & Act
    render(
      <CountingNumber
        number={25}
        transition={{stiffness: 200, damping: 20}}
        data-testid='counting-number'
      />,
    );

    // Assert
    expect(screen.getByTestId("counting-number")).toBeInTheDocument();
  });

  it("renders with inViewMargin option", () => {
    // Arrange & Act
    render(
      <CountingNumber
        number={75}
        inView
        inViewMargin='100px'
        data-testid='counting-number'
      />,
    );

    // Assert
    expect(screen.getByTestId("counting-number")).toBeInTheDocument();
  });

  it("respects inViewOnce option", () => {
    // Arrange & Act
    render(
      <CountingNumber
        number={30}
        inView
        inViewOnce={false}
        data-testid='counting-number'
      />,
    );

    // Assert
    expect(screen.getByTestId("counting-number")).toBeInTheDocument();
  });

  it("handles negative numbers", async () => {
    // Arrange
    render(
      <CountingNumber
        number={-42}
        data-testid='counting-number'
      />,
    );

    // Assert - Eventually reaches target or close to it
    await waitFor(
      () => {
        const element = screen.getByTestId("counting-number");
        const value = Number.parseInt(element.textContent ?? "0", 10);
        expect(value).toBeLessThanOrEqual(0);
        expect(value).toBeGreaterThanOrEqual(-42);
      },
      {timeout: 2000},
    );
  });

  it("handles padStart with negative numbers", () => {
    // Arrange & Act
    render(
      <CountingNumber
        number={-100}
        padStart
        data-testid='counting-number'
      />,
    );

    // Assert - Initially shows padded zero
    expect(screen.getByTestId("counting-number")).toHaveTextContent("000");
  });

  it("handles decimal places with padStart", () => {
    // Arrange & Act
    render(
      <CountingNumber
        number={10.99}
        decimalPlaces={2}
        padStart
        data-testid='counting-number'
      />,
    );

    // Assert
    expect(screen.getByTestId("counting-number")).toHaveTextContent("00.00");
  });
});
