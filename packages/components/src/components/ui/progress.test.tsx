import {render, screen} from "@testing-library/react";
import * as React from "react";
import {describe, expect, it} from "vitest";

import {Progress} from "./progress";

describe("Progress", () => {
  it("renders without crashing", () => {
    // Arrange
    render(
      <Progress
        aria-label='Profile completion'
        value={25}
      />,
    );

    // Assert
    expect(screen.getByRole("progressbar", {name: "Profile completion"})).toBeInTheDocument();
  });

  it("forwards its ref to the progress root DOM element", () => {
    // Arrange
    const ref = React.createRef<HTMLDivElement>();

    render(
      <Progress
        ref={ref}
        aria-label='Forwarded progress'
        value={35}
      />,
    );

    // Assert
    expect(ref.current).toBe(screen.getByRole("progressbar", {name: "Forwarded progress"}));
  });

  it("merges custom class names onto the progress track", () => {
    // Arrange
    const {container} = render(
      <Progress
        aria-label='Styled progress'
        value={45}
        className='custom-progress-track'
      />,
    );

    // Assert
    expect(container.querySelector(".custom-progress-track")).toBeInTheDocument();
  });

  it("updates its value when rerendered", () => {
    // Arrange
    const {rerender} = render(
      <Progress
        aria-label='Upload progress'
        value={10}
      />,
    );

    const progressbar = screen.getByRole("progressbar", {name: "Upload progress"});

    // Assert
    expect(progressbar).toHaveAttribute("aria-valuenow", "10");

    // Act
    rerender(
      <Progress
        aria-label='Upload progress'
        value={65}
      />,
    );

    // Assert
    expect(progressbar).toHaveAttribute("aria-valuenow", "65");
  });

  it("exposes accessible progressbar semantics", () => {
    // Arrange
    render(
      <Progress
        aria-label='Accessible progress'
        value={80}
      />,
    );

    // Assert
    const progressbar = screen.getByRole("progressbar", {name: "Accessible progress"});
    expect(progressbar).toHaveAttribute("aria-valuemin", "0");
    expect(progressbar).toHaveAttribute("aria-valuemax", "100");
    expect(progressbar).toHaveAttribute("aria-valuenow", "80");
  });
});
