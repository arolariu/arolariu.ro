import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {Stepper} from "./stepper";

describe("Stepper", () => {
  it("renders all step labels", () => {
    render(
      <Stepper
        steps={["One", "Two", "Three"]}
        activeStep={0}
      />,
    );

    expect(screen.getByText("One")).toBeInTheDocument();
    expect(screen.getByText("Two")).toBeInTheDocument();
    expect(screen.getByText("Three")).toBeInTheDocument();
  });

  it("marks active step correctly", () => {
    render(
      <Stepper
        steps={["One", "Two"]}
        activeStep={1}
      />,
    );

    const items = screen.getAllByRole("listitem");

    expect(items[0]).toHaveAttribute("data-state", "completed");
    expect(items[1]).toHaveAttribute("data-state", "active");
  });

  it("forwards ref", () => {
    const ref = {current: null as HTMLDivElement | null};

    render(
      <Stepper
        ref={ref}
        steps={["One"]}
        activeStep={0}
      />,
    );

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("renders stepper with vertical orientation", () => {
    // Arrange & Act
    render(
      <Stepper
        steps={["One", "Two", "Three"]}
        activeStep={1}
        orientation='vertical'
        data-testid='stepper-vertical'
      />,
    );

    // Assert
    const stepper = screen.getByTestId("stepper-vertical");
    expect(stepper).toHaveAttribute("data-orientation", "vertical");
    expect(screen.getByText("One")).toBeInTheDocument();
    expect(screen.getByText("Two")).toBeInTheDocument();
    expect(screen.getByText("Three")).toBeInTheDocument();
  });

  it("marks all step states correctly (completed, active, upcoming)", () => {
    // Arrange & Act
    render(
      <Stepper
        steps={["First", "Second", "Third", "Fourth"]}
        activeStep={2}
      />,
    );

    // Assert
    const items = screen.getAllByRole("listitem");

    expect(items[0]).toHaveAttribute("data-state", "completed");
    expect(items[1]).toHaveAttribute("data-state", "completed");
    expect(items[2]).toHaveAttribute("data-state", "active");
    expect(items[3]).toHaveAttribute("data-state", "upcoming");
  });

  it("shows checkmark for completed steps", () => {
    // Arrange & Act
    render(
      <Stepper
        steps={["One", "Two"]}
        activeStep={1}
      />,
    );

    // Assert
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("✓");
    expect(items[1]).toHaveTextContent("2");
  });

  it("renders stepper with custom className", () => {
    // Arrange & Act
    render(
      <Stepper
        steps={["One", "Two"]}
        activeStep={0}
        className='custom-stepper'
        data-testid='stepper'
      />,
    );

    // Assert
    const stepper = screen.getByTestId("stepper");
    expect(stepper).toHaveClass("custom-stepper");
  });

  it("does not render connector after last step", () => {
    // Arrange & Act
    render(
      <Stepper
        steps={["One", "Two", "Three"]}
        activeStep={0}
      />,
    );

    // Assert
    const items = screen.getAllByRole("listitem");
    // Check that the last item doesn't have a connector
    const lastItem = items[items.length - 1];
    expect(lastItem.querySelector('[aria-hidden="true"].connector')).not.toBeInTheDocument();
  });

  it("renders with activeStep at 0", () => {
    // Arrange & Act
    render(
      <Stepper
        steps={["First", "Second"]}
        activeStep={0}
      />,
    );

    // Assert
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveAttribute("data-state", "active");
    expect(items[1]).toHaveAttribute("data-state", "upcoming");
  });

  it("renders with activeStep at last index", () => {
    // Arrange & Act
    render(
      <Stepper
        steps={["First", "Second", "Third"]}
        activeStep={2}
      />,
    );

    // Assert
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveAttribute("data-state", "completed");
    expect(items[1]).toHaveAttribute("data-state", "completed");
    expect(items[2]).toHaveAttribute("data-state", "active");
  });
});
