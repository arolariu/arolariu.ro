import {describe, it, expect, vi} from "vitest";
import {render, fireEvent, screen} from "@testing-library/svelte";
import type {Bucket} from "../types/status";
import UptimeBar from "./UptimeBar.svelte";

function mkBucket(t: string, status: "Healthy" | "Degraded" | "Unhealthy"): Bucket {
  return {t, status, probes: {healthy: 1, total: 1}, latency: {p50: 100, p99: 200}};
}

describe("UptimeBar", () => {
  it("renders one button per bucket", () => {
    const buckets = [
      mkBucket("2026-04-19T14:00:00Z", "Healthy"),
      mkBucket("2026-04-19T14:30:00Z", "Degraded"),
    ];
    render(UptimeBar, {props: {buckets, onSegmentHover: vi.fn()}});
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("emits onSegmentHover on mouseenter", async () => {
    const onSegmentHover = vi.fn();
    const buckets = [mkBucket("2026-04-19T14:00:00Z", "Degraded")];
    render(UptimeBar, {props: {buckets, onSegmentHover}});
    const segs = screen.getAllByRole("button");
    await fireEvent.mouseEnter(segs[0]);
    expect(onSegmentHover).toHaveBeenCalledWith(buckets[0], expect.any(HTMLElement));
  });

  it("emits onSegmentHover(null, null) on mouseleave", async () => {
    const onSegmentHover = vi.fn();
    const buckets = [mkBucket("2026-04-19T14:00:00Z", "Healthy")];
    render(UptimeBar, {props: {buckets, onSegmentHover}});
    await fireEvent.mouseLeave(screen.getByRole("button"));
    expect(onSegmentHover).toHaveBeenCalledWith(null, null);
  });

  it("populates aria-label with timestamp and status", () => {
    const buckets = [mkBucket("2026-04-19T14:00:00Z", "Degraded")];
    render(UptimeBar, {props: {buckets, onSegmentHover: vi.fn()}});
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-label")).toMatch(/Degraded/);
    expect(btn.getAttribute("aria-label")).toMatch(/2026/);
  });
});
