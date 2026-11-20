import {render} from "@testing-library/svelte";
import {describe, expect, it} from "vitest";
import type {Bucket} from "../../types/status";
import LatencySparkline from "./LatencySparkline.svelte";

function bucket(t: string, p50: number): Bucket {
  return {t, status: "Healthy", probes: {healthy: 2, total: 2}, latency: {p50, p99: p50 + 10}};
}

describe("latency sparkline", () => {
  it("draws the p50 trend left to right and classifies it by the newest bucket", () => {
    const buckets = [bucket("2026-04-19T13:00:00Z", 50), bucket("2026-04-19T13:30:00Z", 850), bucket("2026-04-19T14:00:00Z", 450)];

    const {container} = render(LatencySparkline, {props: {buckets, width: 100, height: 20}});

    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    const path = container.querySelector("polyline");
    expect(path).toHaveAttribute("points", "0.0,19.0 50.0,1.0 100.0,10.0");
    expect(path).toHaveClass("tier-ok");
  });

  it("distinguishes no data from a single measurement and a flat trend", async () => {
    const first = bucket("2026-04-19T13:00:00Z", 50);
    const second = bucket("2026-04-19T13:30:00Z", 50);
    const {container, rerender} = render(LatencySparkline, {props: {buckets: []}});
    expect(container.querySelector("polyline")).not.toBeInTheDocument();

    await rerender({buckets: [first]});
    expect(container.querySelector("polyline")).toHaveAttribute("points", "0.0,15.2");

    await rerender({buckets: [first, second]});
    expect(container.querySelector("polyline")).toHaveAttribute("points", "0.0,15.2 60.0,15.2");
  });
});
