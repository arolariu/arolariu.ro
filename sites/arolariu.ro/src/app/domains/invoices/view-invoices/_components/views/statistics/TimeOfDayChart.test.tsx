/**
 * @fileoverview Unit tests for the TimeOfDayChart radar chart and its custom tooltip.
 * @module app/domains/invoices/view-invoices/_components/views/statistics/TimeOfDayChart.test
 */

import {render, screen} from "@testing-library/react";
import {beforeEach, describe, expect, it} from "vitest";
import {hoverChart, installChartLayout} from "../../../../../../../../tests/helpers";
import type {TimeOfDaySegment} from "../../../_utils/statistics";
import {TimeOfDayChart} from "./TimeOfDayChart";

const TOOLTIP_COUNT_KEY = "cards.invoices.statistics.timeOfDay.tooltip.invoiceCount";

function makeSegment(segment: string, invoiceCount: number): TimeOfDaySegment {
  return {segment, invoiceCount, totalAmount: invoiceCount * 10, averageAmount: 10};
}

const segments: TimeOfDaySegment[] = [
  makeSegment("Morning", 4),
  makeSegment("Afternoon", 7),
  makeSegment("Evening", 2),
  makeSegment("Night", 1),
];

describe("TimeOfDayChart", () => {
  beforeEach(() => {
    installChartLayout();
  });

  it("renders the translated card title and description", () => {
    render(<TimeOfDayChart data={segments} />);

    expect(screen.getByText("cards.invoices.statistics.timeOfDay.title")).toBeInTheDocument();
    expect(screen.getByText("cards.invoices.statistics.timeOfDay.description")).toBeInTheDocument();
  });

  it("renders one angle-axis tick per time segment", () => {
    const {container} = render(<TimeOfDayChart data={segments} />);

    expect(container.querySelector(".recharts-wrapper")).not.toBeNull();
    for (const {segment} of segments) {
      expect(screen.getByText(segment)).toBeInTheDocument();
    }
  });

  it("does not render tooltip content before the pointer enters the chart", () => {
    render(<TimeOfDayChart data={segments} />);

    expect(screen.queryByText(TOOLTIP_COUNT_KEY)).not.toBeInTheDocument();
  });

  it("shows the hovered segment and its invoice count in the tooltip", async () => {
    const {container} = render(<TimeOfDayChart data={segments} />);

    await hoverChart(container);

    expect(screen.getByText(TOOLTIP_COUNT_KEY)).toBeInTheDocument();
    expect(screen.getAllByText(/^(Morning|Afternoon|Evening|Night)$/u).length).toBeGreaterThan(segments.length);
  });
});
