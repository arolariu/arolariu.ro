import {render, screen, within} from "@testing-library/svelte";
import {describe, expect, it, vi} from "vitest";
import type {Bucket} from "../../types/status";
import SegmentTooltip from "./SegmentTooltip.svelte";

describe("uptime segment tooltip", () => {
  const timestamp = "2026-04-19T13:00:00Z";
  const bucketDurationMs = 30 * 60_000;

  it("reports the true span, percentiles and failing sub-check of a merged bucket", () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-04-19T14:15:00Z"));
    const bucket = {
      t: timestamp,
      spanMs: 2 * bucketDurationMs,
      status: "Unhealthy",
      httpStatus: 503,
      probes: {healthy: 2, total: 4},
      latency: {p50: 120, p75: 250, p95: 400, p99: 750},
      worstSubCheck: {name: "mssql", status: "Unhealthy", description: "Connection failed"},
    } satisfies Bucket;

    render(SegmentTooltip, {props: {bucket, anchor: null, id: "uptime-details", bucketDurationMs}});

    const tooltip = screen.getByRole("tooltip");
    const details = within(tooltip);
    expect(tooltip).toHaveAttribute("id", "uptime-details");
    expect(tooltip).toHaveTextContent("2026-04-19 · 13:00 UTC");
    expect(tooltip).toHaveTextContent("2026-04-19 · 14:00 UTC");
    expect(tooltip).not.toHaveTextContent("2026-04-19 · 13:30 UTC");
    expect(details.getByText("503")).toBeInTheDocument();
    expect(details.getByText("1 h ago")).toBeInTheDocument();
    expect(tooltip).toHaveTextContent("2 / 4 · samples");
    expect(details.getByText("250 ms")).toBeInTheDocument();
    expect(details.getByText("400 ms")).toBeInTheDocument();
    expect(tooltip).toHaveTextContent("mssql Unhealthy — Connection failed");
  });

  it("uses the base duration for a sparse historical bucket and discards the tooltip on clear", async () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-04-19T14:15:00Z"));
    const bucket = {
      t: timestamp,
      status: "Healthy",
      probes: {healthy: 0, total: 0},
      latency: {p50: 0, p99: 0},
    } satisfies Bucket;
    const {rerender} = render(SegmentTooltip, {props: {bucket, anchor: null, bucketDurationMs}});

    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent("2026-04-19 · 13:30 UTC");
    expect(within(tooltip).getAllByText("—")).toHaveLength(3);
    expect(tooltip).not.toHaveTextContent("samples");

    await rerender({bucket: null});

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("uses a default span and keeps the failed check visible without inventing a description", () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-04-19T13:15:00Z"));
    const bucket = {
      t: timestamp,
      status: "Degraded",
      probes: {healthy: 1, total: 2},
      latency: {p50: 100, p99: 300},
      worstSubCheck: {name: "storage", status: "Degraded"},
    } satisfies Bucket;
    const anchor = document.createElement("button");
    vi.spyOn(anchor, "getBoundingClientRect").mockReturnValue(new DOMRect(100, 200, 30, 20));

    render(SegmentTooltip, {props: {bucket, anchor}});

    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.id).toMatch(/^tooltip-/u);
    expect(tooltip).toHaveTextContent("2026-04-19 · 13:30 UTC");
    expect(tooltip).toHaveTextContent("storage Degraded");
    expect(tooltip).not.toHaveTextContent(/storage Degraded\s*—/u);
    expect(tooltip).toHaveStyle({top: "192px", left: "115px"});
  });
});
