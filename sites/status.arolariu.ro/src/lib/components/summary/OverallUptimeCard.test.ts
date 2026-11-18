import {act, render, screen} from "@testing-library/svelte";
import {afterEach, describe, expect, it, vi} from "vitest";
import type {ServiceSeries} from "../../types/status";
import OverallUptimeCard from "./OverallUptimeCard.svelte";

describe("OverallUptimeCard", () => {
  afterEach(() => vi.useRealTimers());

  it("weights by probe count and only calls out a service below the overall uptime", async () => {
    const time = "2026-04-19T13:30:00Z";
    const services: ServiceSeries[] = [
      {
        service: "api.arolariu.ro",
        buckets: [{t: time, status: "Degraded", probes: {healthy: 2, total: 3}, latency: {p50: 100, p99: 200}}],
      },
      {
        service: "arolariu.ro",
        buckets: [{t: time, status: "Healthy", probes: {healthy: 7, total: 7}, latency: {p50: 80, p99: 125}}],
      },
    ];
    vi.useFakeTimers({toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance"]});
    const {rerender} = render(OverallUptimeCard, {props: {services, windowFilter: "7d"}});

    await act(() => vi.advanceTimersByTimeAsync(450));

    expect(screen.getByText("90.000%")).toBeInTheDocument();
    expect(screen.getByText("weighted \u00b7 last 7d")).toBeInTheDocument();
    expect(screen.getByText(/^worst:/)).toHaveTextContent("worst: api.arolariu.ro \u00b7 66.7%");

    await rerender({services: services.filter(({service}) => service === "arolariu.ro"), windowFilter: "1d"});
    await act(() => vi.advanceTimersByTimeAsync(450));

    expect(screen.getByText("100.000%")).toBeInTheDocument();
    expect(screen.getByText("weighted \u00b7 last 1d")).toBeInTheDocument();
    expect(screen.queryByText(/^worst:/)).not.toBeInTheDocument();
  });
});
