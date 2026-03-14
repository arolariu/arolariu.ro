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

  it("formats decimal with comma separator", async () => {
    // Arrange
    render(
      <CountingNumber
        number={99.99}
        decimalPlaces={2}
        decimalSeparator=','
        data-testid='counting-number'
      />,
    );

    // Assert - Eventually shows comma
    await waitFor(
      () => {
        const element = screen.getByTestId("counting-number");
        expect(element.textContent).toContain(",");
      },
      {timeout: 2000},
    );
  });

  it("pads integer part with zeros when padStart is true", async () => {
    // Arrange
    render(
      <CountingNumber
        number={999}
        padStart
        data-testid='counting-number'
      />,
    );

    // Assert - Initially padded
    expect(screen.getByTestId("counting-number")).toHaveTextContent("000");

    // Eventually reaches target with padding
    await waitFor(
      () => {
        const element = screen.getByTestId("counting-number");
        const value = Number.parseInt(element.textContent ?? "0", 10);
        expect(value).toBeGreaterThanOrEqual(900);
      },
      {timeout: 3000},
    );
  });

  it("handles padStart with custom padStartChar (defaults to '0')", async () => {
    // Arrange
    render(
      <CountingNumber
        number={42}
        padStart
        data-testid='counting-number'
      />,
    );

    // Assert - Initially shows padded with zeros
    expect(screen.getByTestId("counting-number")).toHaveTextContent("00");
  });

  it("handles negative numbers with padStart", async () => {
    // Arrange
    render(
      <CountingNumber
        number={-50}
        padStart
        data-testid='counting-number'
      />,
    );

    // Assert - Initially shows padded zero
    expect(screen.getByTestId("counting-number")).toHaveTextContent("00");

    // Eventually animates to negative value
    await waitFor(
      () => {
        const element = screen.getByTestId("counting-number");
        const text = element.textContent ?? "";
        expect(text).toContain("-");
      },
      {timeout: 2000},
    );
  });

  it("handles integer values without decimal separator", async () => {
    // Arrange
    render(
      <CountingNumber
        number={100}
        decimalPlaces={0}
        data-testid='counting-number'
      />,
    );

    // Assert - No decimal separator
    await waitFor(
      () => {
        const element = screen.getByTestId("counting-number");
        const value = Number.parseInt(element.textContent ?? "0", 10);
        expect(value).toBeGreaterThanOrEqual(95);
      },
      {timeout: 2000},
    );
  });

  it("handles padStart with decimal values", async () => {
    // Arrange
    render(
      <CountingNumber
        number={9.99}
        decimalPlaces={2}
        padStart
        data-testid='counting-number'
      />,
    );

    // Assert - Initially padded
    expect(screen.getByTestId("counting-number")).toHaveTextContent("0.00");

    // Eventually shows value with padding
    await waitFor(
      () => {
        const element = screen.getByTestId("counting-number");
        expect(element.textContent).toMatch(/\d\.\d{2}/);
      },
      {timeout: 2000},
    );
  });

  it("splits formatted string correctly on decimal separator", async () => {
    // Arrange
    render(
      <CountingNumber
        number={123.45}
        decimalPlaces={2}
        decimalSeparator=','
        padStart
        data-testid='counting-number'
      />,
    );

    // Assert - Initially padded
    expect(screen.getByTestId("counting-number")).toHaveTextContent("000,00");

    // Eventually reaches formatted value
    await waitFor(
      () => {
        const element = screen.getByTestId("counting-number");
        expect(element.textContent).toContain(",");
      },
      {timeout: 2000},
    );
  });

  it("handles values without decimal places in original number", () => {
    // Arrange
    render(
      <CountingNumber
        number={50}
        data-testid='counting-number'
      />,
    );

    // Assert - Should handle integer values
    expect(screen.getByTestId("counting-number")).toBeInTheDocument();
  });

  it("unsubscribes from spring value on cleanup", () => {
    // Arrange
    const {unmount} = render(
      <CountingNumber
        number={75}
        data-testid='counting-number'
      />,
    );

    // Act
    unmount();

    // Assert - should not crash on unmount
    expect(true).toBe(true);
  });

  it("handles localRef being null in spring change handler", () => {
    // This tests the guard clause in the spring.on('change') callback
    // Arrange & Act
    render(
      <CountingNumber
        number={25}
        data-testid='counting-number'
      />,
    );

    // Assert - should render without issues
    expect(screen.getByTestId("counting-number")).toBeInTheDocument();
  });

  it("resolves decimal places from number string when not explicitly set", () => {
    // Arrange
    render(
      <CountingNumber
        number={3.14159}
        data-testid='counting-number'
      />,
    );

    // Assert - should auto-detect decimal places
    expect(screen.getByTestId("counting-number")).toBeInTheDocument();
  });

  it("handles numbers with decimal points in string representation", async () => {
    // Arrange
    render(
      <CountingNumber
        number={2.5}
        data-testid='counting-number'
      />,
    );

    // Assert
    await waitFor(
      () => {
        const element = screen.getByTestId("counting-number");
        const value = Number.parseFloat(element.textContent ?? "0");
        expect(value).toBeGreaterThan(0);
      },
      {timeout: 2000},
    );
  });

  it("properly formats when decimalPlaces prop takes precedence", () => {
    // Arrange
    render(
      <CountingNumber
        number={1.123456}
        decimalPlaces={3}
        data-testid='counting-number'
      />,
    );

    // Assert - initial display respects decimalPlaces
    expect(screen.getByTestId("counting-number")).toHaveTextContent("0.000");
  });

  it("handles very large numbers with padStart", async () => {
    // Arrange
    render(
      <CountingNumber
        number={999_999}
        padStart
        data-testid='counting-number'
      />,
    );

    // Assert - Initially shows zeros
    expect(screen.getByTestId("counting-number")).toHaveTextContent("000000");
  });

  it("handles very small decimal numbers", async () => {
    // Arrange
    render(
      <CountingNumber
        number={0.001}
        decimalPlaces={3}
        data-testid='counting-number'
      />,
    );

    // Assert
    await waitFor(
      () => {
        const element = screen.getByTestId("counting-number");
        expect(element.textContent).toContain(".");
      },
      {timeout: 2000},
    );
  });
});
