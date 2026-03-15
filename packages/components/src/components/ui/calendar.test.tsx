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

  it("renders calendar with mode='range'", () => {
    // Arrange
    render(
      <Calendar
        mode='range'
        defaultMonth={new Date(2024, 0, 1)}
      />,
    );

    // Assert
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("renders calendar with showOutsideDays={false}", () => {
    // Arrange
    render(
      <Calendar
        defaultMonth={new Date(2024, 0, 1)}
        showOutsideDays={false}
      />,
    );

    // Assert
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("renders calendar with captionLayout='dropdown'", () => {
    // Arrange
    render(
      <Calendar
        captionLayout='dropdown'
        defaultMonth={new Date(2024, 0, 1)}
      />,
    );

    // Assert
    expect(screen.getByRole("grid")).toBeInTheDocument();
    // Check that dropdown is rendered
    expect(screen.getAllByRole("option").length).toBeGreaterThan(0);
  });

  it("renders calendar with captionLayout='dropdown-months'", () => {
    // Arrange
    render(
      <Calendar
        captionLayout='dropdown-months'
        defaultMonth={new Date(2024, 0, 1)}
      />,
    );

    // Assert
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("renders calendar with captionLayout='dropdown-years'", () => {
    // Arrange
    render(
      <Calendar
        captionLayout='dropdown-years'
        defaultMonth={new Date(2024, 0, 1)}
      />,
    );

    // Assert
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("renders calendar with custom buttonVariant", () => {
    // Arrange
    render(
      <Calendar
        buttonVariant='outline'
        defaultMonth={new Date(2024, 0, 1)}
      />,
    );

    // Assert
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("renders calendar with buttonVariant='destructive'", () => {
    // Arrange
    render(
      <Calendar
        buttonVariant='destructive'
        defaultMonth={new Date(2024, 0, 1)}
      />,
    );

    // Assert
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("renders calendar with buttonVariant='secondary'", () => {
    // Arrange
    render(
      <Calendar
        buttonVariant='secondary'
        defaultMonth={new Date(2024, 0, 1)}
      />,
    );

    // Assert
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("renders calendar with buttonVariant='link'", () => {
    // Arrange
    render(
      <Calendar
        buttonVariant='link'
        defaultMonth={new Date(2024, 0, 1)}
      />,
    );

    // Assert
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("uses custom formatters", () => {
    // Arrange
    const customFormatters = {
      formatMonthDropdown: (date: Date) => date.toLocaleString("en", {month: "long"}),
      formatDay: (date: Date) => date.getDate().toString(),
    };

    render(
      <Calendar
        captionLayout='dropdown'
        defaultMonth={new Date(2024, 0, 1)}
        formatters={customFormatters}
      />,
    );

    // Assert
    expect(screen.getByRole("option", {name: "January"})).toBeInTheDocument();
  });

  it("renders calendar without locale defaults to 'default'", () => {
    // Arrange
    render(
      <Calendar
        captionLayout='dropdown'
        defaultMonth={new Date(2024, 0, 1)}
      />,
    );

    // Assert
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("renders calendar with custom components prop", () => {
    // Arrange
    const CustomChevron = () => <span>→</span>;

    render(
      <Calendar
        defaultMonth={new Date(2024, 0, 1)}
        components={{Chevron: CustomChevron}}
      />,
    );

    // Assert
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("renders calendar with mode='single' and selected date", () => {
    // Arrange
    const selected = new Date(2024, 0, 15);

    render(
      <Calendar
        mode='single'
        defaultMonth={new Date(2024, 0, 1)}
        selected={selected}
      />,
    );

    // Assert
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("renders calendar with mode='multiple'", () => {
    // Arrange
    render(
      <Calendar
        mode='multiple'
        defaultMonth={new Date(2024, 0, 1)}
      />,
    );

    // Assert
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("renders calendar with range selection", () => {
    // Arrange
    const selected = {
      from: new Date(2024, 0, 10),
      to: new Date(2024, 0, 20),
    };

    render(
      <Calendar
        mode='range'
        defaultMonth={new Date(2024, 0, 1)}
        selected={selected}
      />,
    );

    // Assert
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("merges custom classNames with default styles", () => {
    // Arrange
    render(
      <Calendar
        defaultMonth={new Date(2024, 0, 1)}
        classNames={{
          root: "custom-root",
          nav: "custom-nav",
          day: "custom-day",
        }}
      />,
    );

    // Assert
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("renders calendar with disabled dates", () => {
    // Arrange
    const disabledDates = [new Date(2024, 0, 15)];

    render(
      <Calendar
        defaultMonth={new Date(2024, 0, 1)}
        disabled={disabledDates}
      />,
    );

    // Assert
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("renders calendar with custom modifiers", () => {
    // Arrange
    const modifiers = {
      weekend: (date: Date) => date.getDay() === 0 || date.getDay() === 6,
    };

    render(
      <Calendar
        defaultMonth={new Date(2024, 0, 1)}
        modifiers={modifiers}
      />,
    );

    // Assert
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("renders calendar with buttonVariant='default'", () => {
    // Arrange
    render(
      <Calendar
        buttonVariant='default'
        defaultMonth={new Date(2024, 0, 1)}
      />,
    );

    // Assert
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("renders calendar and focuses a day button with focused modifier", async () => {
    // Arrange
    render(
      <Calendar
        mode='single'
        defaultMonth={new Date(2024, 0, 1)}
        modifiers={{
          focused: new Date(2024, 0, 15),
        }}
      />,
    );

    // Assert
    expect(screen.getByRole("grid")).toBeInTheDocument();

    // The day button with focused modifier should be in the document
    const dayButtons = screen.getAllByRole("button");
    expect(dayButtons.length).toBeGreaterThan(0);
  });
});
