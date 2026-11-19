import {fireEvent, render, screen} from "@testing-library/svelte";
import {describe, expect, it, vi} from "vitest";
import type {Bucket} from "../../types/status";
import LatencyChart from "./LatencyChart.svelte";

const service = "api.arolariu.ro";
const bucketDurationMs = 30 * 60_000;

function measuredBucket(t: string, latency: Bucket["latency"]): Bucket {
  return {t, latency, status: "Healthy", probes: {healthy: 2, total: 2}};
}

describe("LatencyChart", () => {
  it("reports no data instead of showing latency for an empty window", async () => {
    render(LatencyChart, {props: {service, buckets: [], bucketDurationMs}});
    const chart = screen.getByRole("img", {name: "Latency trend chart"});

    await fireEvent.pointerMove(chart, {clientX: 250});

    expect(chart.querySelector("desc")).toHaveTextContent(`Latency trend for ${service}: no data.`);
    expect(chart.querySelector("polyline")).not.toBeInTheDocument();
    expect(screen.queryByText(/UTC$/u)).not.toBeInTheDocument();
  });

  it("snaps to the nearest measurement and clears the displayed percentiles off the plot", async () => {
    const first = measuredBucket("2026-04-19T13:00:00Z", {p50: 100, p75: 200, p95: 400, p99: 800});
    const second = measuredBucket("2026-04-19T13:30:00Z", {p50: 200, p75: 300, p95: 600, p99: 1500});
    render(LatencyChart, {props: {service, buckets: [first, second], bucketDurationMs}});
    const chart = screen.getByRole("img", {name: "Latency trend chart"});
    vi.spyOn(chart, "getBoundingClientRect").mockReturnValue(new DOMRect(100, 0, 500, 140));
    expect(screen.queryByText("2026-04-19 13:30 UTC")).not.toBeInTheDocument();

    await fireEvent.pointerMove(chart, {clientX: 550});

    expect(chart.querySelector("desc")).toHaveTextContent("p50 100-200ms, p75 peaks at 300ms, p95 peaks at 600ms, p99 peaks at 1500ms");
    expect(chart.querySelectorAll("polygon")).toHaveLength(3);
    expect(screen.getByText("1.5s")).toBeInTheDocument();
    expect(screen.getByText("2026-04-19 13:30 UTC")).toBeInTheDocument();
    expect(screen.queryByText("2026-04-19 13:00 UTC")).not.toBeInTheDocument();
    expect(screen.getByText("600 ms")).toBeInTheDocument();
    expect(screen.getByText("1500 ms")).toBeInTheDocument();

    await fireEvent.pointerMove(chart, {clientX: 105});

    expect(screen.queryByText("2026-04-19 13:30 UTC")).not.toBeInTheDocument();
  });

  it("falls back to the median and tail when a historical measurement lacks middle percentiles", async () => {
    const bucket = measuredBucket("2026-04-19T13:00:00Z", {p50: 100, p99: 800});
    render(LatencyChart, {props: {service, buckets: [bucket], bucketDurationMs}});
    const chart = screen.getByRole("img", {name: "Latency trend chart"});
    vi.spyOn(chart, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 500, 140));

    await fireEvent.pointerMove(chart, {clientX: 250});

    expect(chart.querySelector("desc")).toHaveTextContent("p50 ranges 100-100ms. p99 peaks at 800ms.");
    expect(screen.getByText(/p99.*tail/i)).toBeInTheDocument();
    expect(screen.getByText("100 ms")).toBeInTheDocument();
    expect(screen.getByText("800 ms")).toBeInTheDocument();
    expect(screen.getAllByText("\u2014")).toHaveLength(2);

    await fireEvent.pointerLeave(chart);

    expect(screen.queryByText("800 ms")).not.toBeInTheDocument();
  });

  it("uses the fallback envelope for mixed history but retains the available percentiles on hover", async () => {
    const current = measuredBucket("2026-04-19T13:00:00Z", {p50: 100, p75: 200, p95: 400, p99: 800});
    const partial = measuredBucket("2026-04-19T13:30:00Z", {p50: 110, p75: 240, p99: 900});
    render(LatencyChart, {props: {service, buckets: [current, partial], bucketDurationMs}});
    const chart = screen.getByRole("img", {name: "Latency trend chart"});
    vi.spyOn(chart, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 500, 140));
    expect(chart.querySelectorAll("polygon")).toHaveLength(1);
    expect(chart.querySelector("desc")).toHaveTextContent("p50 ranges 100-110ms. p99 peaks at 900ms.");

    await fireEvent.pointerMove(chart, {clientX: 450});

    expect(screen.getByText("2026-04-19 13:30 UTC")).toBeInTheDocument();
    expect(screen.getByText("240 ms")).toBeInTheDocument();
    expect(screen.getByText("\u2014")).toBeInTheDocument();
    expect(screen.queryByText("400 ms")).not.toBeInTheDocument();
  });
});
