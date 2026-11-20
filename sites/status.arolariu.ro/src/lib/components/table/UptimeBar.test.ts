import {act, fireEvent, render, screen} from "@testing-library/svelte";
import {afterEach, describe, expect, it, vi} from "vitest";
import type {Bucket} from "../../types/status";
import UptimeBar from "./UptimeBar.svelte";

function mkBucket(t: string, status: "Healthy" | "Degraded" | "Unhealthy"): Bucket {
  return {t, status, probes: {healthy: 1, total: 1}, latency: {p50: 100, p99: 200}};
}

describe("UptimeBar", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.documentElement.style.removeProperty("--segment-target-px");
  });

  it("renders one button per bucket", () => {
    const buckets = [mkBucket("2026-04-19T14:00:00Z", "Healthy"), mkBucket("2026-04-19T14:30:00Z", "Degraded")];
    render(UptimeBar, {props: {buckets, onSegmentHover: vi.fn()}});
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("emits onSegmentHover on mouseenter", async () => {
    const onSegmentHover = vi.fn();
    const buckets = [mkBucket("2026-04-19T14:00:00Z", "Degraded")];
    render(UptimeBar, {props: {buckets, onSegmentHover}});
    const segs = screen.getAllByRole("button");
    await fireEvent.mouseEnter(segs[0]!);
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

  it("only describes the focused bucket and clears hover when it loses focus", async () => {
    const onSegmentHover = vi.fn();
    const first = mkBucket("2026-04-19T14:00:00Z", "Healthy");
    const second = {
      ...mkBucket("2026-04-19T14:30:00Z", "Degraded"),
      worstSubCheck: {name: "Database", status: "Degraded"},
    } satisfies Bucket;
    const props = {buckets: [first, second], onSegmentHover, tooltipId: "uptime-detail"};
    const {rerender} = render(UptimeBar, {props});
    const target = screen.getByRole("button", {name: /14:30 UTC, Degraded, Database/});
    expect(target).not.toHaveAttribute("aria-describedby");

    await act(() => target.focus());
    await rerender({...props, hoveredBucketT: second.t});

    expect(target).toHaveFocus();
    expect(onSegmentHover).toHaveBeenLastCalledWith(second, target);
    expect(target).toHaveAttribute("aria-describedby", "uptime-detail");
    expect(screen.getByRole("button", {name: /14:00 UTC, Healthy/})).not.toHaveAttribute("aria-describedby");

    await act(() => target.blur());
    await rerender({...props, hoveredBucketT: null});

    expect(onSegmentHover).toHaveBeenLastCalledWith(null, null);
    expect(target).not.toHaveAttribute("aria-describedby");
  });

  it("merges narrow time ranges with worst status, total probes, latency and the actual span", async () => {
    const halfHour = 30 * 60_000;
    const start = Date.UTC(2026, 3, 19, 12);
    const buckets = Array.from({length: 24}, (_, index) => mkBucket(new Date(start + index * halfHour).toISOString(), "Healthy"));
    const reason = {name: "Database", status: "Unhealthy", description: "Unavailable"} as const;
    buckets[1] = {
      ...mkBucket(new Date(start + halfHour).toISOString(), "Unhealthy"),
      worstSubCheck: reason,
      httpStatus: 503,
      probes: {healthy: 0, total: 3},
      latency: {p50: 300, p99: 600},
    };
    const disconnect = vi.fn();
    let reportWidth: ((width: number) => void) | undefined;
    vi.stubGlobal(
      "ResizeObserver",
      class {
        private readonly notify: (entries: ResizeObserverEntry[]) => void;
        readonly disconnect = disconnect;

        constructor(notify: (entries: ResizeObserverEntry[]) => void) {
          this.notify = notify;
        }

        observe(target: Element): void {
          reportWidth = (width) => {
            this.notify([
              {
                target,
                contentRect: new DOMRectReadOnly(0, 0, width, 16),
                borderBoxSize: [],
                contentBoxSize: [],
                devicePixelContentBoxSize: [],
              },
            ]);
          };
        }
      },
    );
    document.documentElement.style.setProperty("--segment-target-px", "8px");
    const onSegmentHover = vi.fn();
    const {unmount} = render(UptimeBar, {props: {buckets, bucketDurationMs: halfHour, onSegmentHover, variant: "sub"}});
    expect(screen.getAllByRole("button")).toHaveLength(24);
    if (!reportWidth) throw new Error("The uptime bar did not observe its width");

    await act(() => reportWidth?.(0));
    expect(screen.getAllByRole("button")).toHaveLength(24);
    await act(() => reportWidth?.(96));

    expect(screen.getAllByRole("button")).toHaveLength(12);
    const target = screen.getByRole("button", {name: "2026-04-19 12:00 UTC, Unhealthy, Database Unavailable"});
    await fireEvent.mouseEnter(target);

    expect(onSegmentHover).toHaveBeenLastCalledWith(
      {
        t: new Date(start).toISOString(),
        status: "Unhealthy",
        probes: {healthy: 1, total: 4},
        latency: {p50: 200, p99: 400},
        worstSubCheck: reason,
        httpStatus: 503,
        spanMs: 2 * halfHour,
      },
      target,
    );

    unmount();
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
