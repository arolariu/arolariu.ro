import {render, screen} from "@testing-library/react";
import {fr} from "date-fns/locale";
import {describe, expect, it} from "vitest";

import {Calendar} from "./calendar";

describe("Calendar", () => {
  it("renders without crashing", () => {
    // Arrange
    render(<Calendar />);

    // Assert
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("merges the root className", () => {
    // Arrange
    const {container} = render(<Calendar className='custom-calendar' />);

    // Assert
    expect(container.firstElementChild).toHaveClass("custom-calendar");
  });

  it("renders footer content", () => {
    // Arrange
    render(<Calendar footer={<div>Calendar footer content</div>} />);

    // Assert
    expect(screen.getByText("Calendar footer content")).toBeInTheDocument();
  });

  it("renders calendar day children from the date grid", () => {
    // Arrange
    render(<Calendar defaultMonth={new Date(2024, 0, 1)} />);

    // Assert
    expect(screen.getByRole("grid")).toBeInTheDocument();
    expect(screen.getAllByText("15")[0]).toBeInTheDocument();
  });

  it("preserves unhandled day picker classNames keys", () => {
    // Arrange
    render(
      <Calendar
        classNames={{
          month_grid: "custom-month-grid",
        }}
      />,
    );

    // Assert
    expect(screen.getByRole("grid")).toHaveClass("custom-month-grid");
  });

  it("uses the provided locale when formatting the month dropdown", () => {
    // Arrange
    render(
      <Calendar
        captionLayout='dropdown'
        defaultMonth={new Date(2024, 0, 1)}
        locale={fr}
      />,
    );

    // Assert
    expect(screen.getByRole("option", {name: /janv/i})).toBeInTheDocument();
  });

  it("does not leak the week prop onto the week number table cell", () => {
    // Arrange
    const {container} = render(
      <Calendar
        defaultMonth={new Date(2024, 0, 1)}
        showWeekNumber
      />,
    );

    // Assert
    expect(container.querySelector("td[week]")).not.toBeInTheDocument();
  });
});
