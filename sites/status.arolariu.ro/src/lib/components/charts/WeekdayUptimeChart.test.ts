import {render, screen} from "@testing-library/svelte";
import {describe, expect, it} from "vitest";
import type {ServiceSeries} from "../../types/status";
import WeekdayUptimeChart from "./WeekdayUptimeChart.svelte";

describe("weekday uptime", () => {
  it("distinguishes partial Monday uptime and a Tuesday outage from weekdays without recorded failures", () => {
    const services: ServiceSeries[] = [
      {
        service: "api.arolariu.ro",
        buckets: [
          {t: "2026-04-20T14:00:00Z", status: "Degraded", probes: {healthy: 99, total: 100}, latency: {p50: 100, p99: 200}},
          {t: "2026-04-21T14:00:00Z", status: "Unhealthy", probes: {healthy: 0, total: 20}, latency: {p50: 100, p99: 200}},
        ],
      },
    ];

    render(WeekdayUptimeChart, {props: {services}});

    const chart = screen.getByRole("img", {name: "Uptime by weekday bar chart"});
    expect(chart.querySelector("desc")).toHaveTextContent("Mon 99%, Tue 0%, Wed 100%");
    const [monday, tuesday, wednesday] = chart.querySelectorAll("rect");
    expect(monday).toHaveAttribute("fill", "var(--status-deg)");
    expect(tuesday).toHaveAttribute("fill", "var(--status-down)");
    expect(tuesday).toHaveAttribute("height", "2");
    expect(wednesday).toHaveAttribute("fill", "var(--status-up)");
  });
});
