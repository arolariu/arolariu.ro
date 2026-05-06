import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {SingleStat} from "./SingleStat";

describe("SingleStat", () => {
  it("renders label and value", () => {
    render(<SingleStat label="Total" value="385.50 EUR" />);
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("385.50 EUR")).toBeInTheDocument();
    expect(screen.getByTestId("viz-single-stat")).toBeInTheDocument();
  });
});