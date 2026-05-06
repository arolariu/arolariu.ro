import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {AssistantMessage} from "./AssistantMessage";

describe("AssistantMessage", () => {
  it("renders prose + bar viz", () => {
    render(
      <AssistantMessage
        question="top merchants"
        prose="Top: Lidl, Mega"
        viz="bar-chart-horizontal"
        payload={{buckets: [{merchantName: "Lidl", visitCount: 5}, {merchantName: "Mega", visitCount: 3}]}}
      />,
    );
    expect(screen.getByTestId("assistant-prose")).toHaveTextContent("Top: Lidl, Mega");
    expect(screen.getByTestId("viz-bar-chart-horizontal")).toBeInTheDocument();
  });

  it("renders single-stat viz", () => {
    render(
      <AssistantMessage
        question="total spend"
        prose="385.50 EUR"
        viz="single-stat"
        payload={{timeframe: "last-month", buckets: [{totalSpend: 385.5, currency: "EUR"}]}}
      />,
    );
    expect(screen.getByTestId("viz-single-stat")).toBeInTheDocument();
  });

  it("renders donut viz", () => {
    render(
      <AssistantMessage
        question="breakdown"
        prose="Grocery 60%, Fast food 40%"
        viz="donut"
        payload={{buckets: [{category: 100, spend: 60}, {category: 200, spend: 40}]}}
      />,
    );
    expect(screen.getByTestId("viz-donut")).toBeInTheDocument();
  });
});