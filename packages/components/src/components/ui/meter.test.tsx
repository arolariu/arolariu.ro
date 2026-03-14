import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {Meter, MeterIndicator, MeterLabel, MeterTrack} from "./meter";

describe("Meter", () => {
  function renderMeter(className?: string): void {
    render(
      <Meter
        aria-label='Storage usage'
        className={className}
        max={100}
        min={0}
        value={70}>
        <MeterLabel>Storage usage</MeterLabel>
        <MeterTrack>
          <MeterIndicator />
        </MeterTrack>
      </Meter>,
    );
  }

  it("renders without crashing", () => {
    // Arrange
    renderMeter();

    // Assert
    expect(screen.getByRole("meter", {name: "Storage usage"})).toBeInTheDocument();
  });

  it("exposes the current value", () => {
    // Arrange
    renderMeter();

    // Assert
    expect(screen.getByRole("meter", {name: "Storage usage"})).toHaveAttribute("aria-valuenow", "70");
  });

  it("merges the root className", () => {
    // Arrange
    renderMeter("custom-meter");

    // Assert
    expect(screen.getByRole("meter", {name: "Storage usage"})).toHaveClass("custom-meter");
  });

  it("renders label children", () => {
    // Arrange
    renderMeter();

    // Assert
    expect(screen.getByText("Storage usage")).toBeInTheDocument();
  });
});
