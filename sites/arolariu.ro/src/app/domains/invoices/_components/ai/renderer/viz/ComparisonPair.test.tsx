import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {ComparisonPair} from "./ComparisonPair";

describe("ComparisonPair", () => {
  it("renders two values plus delta", () => {
    render(<ComparisonPair labelA="last month" valueA="100 EUR" labelB="this month" valueB="130 EUR" delta="30%" direction="more" />);
    expect(screen.getByText("100 EUR")).toBeInTheDocument();
    expect(screen.getByText("130 EUR")).toBeInTheDocument();
    expect(screen.getByText("30%")).toBeInTheDocument();
  });
});