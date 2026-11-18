import {fireEvent, render, screen, within} from "@testing-library/svelte";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import type {IncidentsFile} from "../../types/status";
import IncidentList from "./IncidentList.svelte";

const now = new Date("2026-05-15T12:00:00Z");
const incidents = {
  generatedAt: now.toISOString(),
  incidents: [
    {
      id: "api-april",
      service: "api.arolariu.ro",
      startedAt: "2026-04-23T12:00:00Z",
      status: "resolved",
      resolvedAt: "2026-04-23T14:00:00Z",
      durationMs: 7_200_000,
      reason: "Upstream was slow",
      severity: "Degraded",
      probeCount: 4,
    },
    {
      id: "website-previous",
      service: "arolariu.ro",
      startedAt: "2026-05-12T12:00:00Z",
      status: "open",
      reason: "",
      severity: "Degraded",
      probeCount: 2,
    },
    {
      id: "api-now",
      service: "api.arolariu.ro",
      subCheck: "Database",
      startedAt: "2026-05-15T11:45:00Z",
      status: "open",
      reason: "Connection unavailable",
      severity: "Unhealthy",
      probeCount: 3,
    },
  ],
} satisfies IncidentsFile;

describe("IncidentList", () => {
  beforeEach(() => {
    vi.useFakeTimers({toFake: ["Date"]});
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("orders the timeline by month and expands only the selected incident's details", async () => {
    render(IncidentList, {props: {incidents, windowFilter: "30d"}});
    const monthHeadings = screen.getAllByRole("heading", {level: 3});
    const ongoing = screen.getByRole("button", {name: /Database Ongoing.*15 minutes ago/i});
    const recovered = screen.getByRole("button", {name: /api\.arolariu\.ro Resolved/i});
    expect(monthHeadings.map((heading) => heading.textContent)).toEqual(["May 2026", "April 2026"]);
    expect(screen.getAllByRole("article").map((article) => within(article).getByRole("button"))).toEqual([
      ongoing,
      screen.getByRole("button", {name: /^arolariu\.ro Ongoing/i}),
      recovered,
    ]);

    await fireEvent.click(ongoing);

    const detail = screen.getByRole("region", {name: "Incident detail"});
    expect(ongoing).toHaveAttribute("aria-expanded", "true");
    expect(within(detail).getByText("ongoing")).toBeVisible();
    expect(within(detail).getByText("Database")).toBeVisible();
    expect(within(detail).queryByText("Resolved")).not.toBeInTheDocument();

    await fireEvent.click(recovered);

    expect(ongoing).toHaveAttribute("aria-expanded", "false");
    const restoredDetail = screen.getByRole("region", {name: "Incident detail"});
    expect(within(restoredDetail).getByText("2026-04-23 14:00 UTC")).toBeVisible();
    expect(within(restoredDetail).queryByText("Sub-check")).not.toBeInTheDocument();

    await fireEvent.click(recovered);

    expect(screen.queryByRole("region", {name: "Incident detail"})).not.toBeInTheDocument();
  });

  it("keeps arrow focus and filtering in sync, then resets service selection on a window change", async () => {
    const {rerender} = render(IncidentList, {props: {incidents, windowFilter: "30d"}});
    const group = screen.getByRole("radiogroup", {name: "Filter incidents by service"});
    const all = within(group).getByRole("radio", {name: "All"});
    const website = within(group).getByRole("radio", {name: "arolariu.ro"});
    const api = within(group).getByRole("radio", {name: "api.arolariu.ro"});
    all.focus();

    await fireEvent.keyDown(all, {key: "ArrowLeft"});

    expect(website).toHaveFocus();
    expect(website).toBeChecked();
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.queryByText("Connection unavailable")).not.toBeInTheDocument();

    await fireEvent.keyDown(website, {key: "ArrowRight"});

    expect(all).toHaveFocus();
    expect(all).toBeChecked();
    expect(screen.getAllByRole("article")).toHaveLength(3);

    await fireEvent.keyDown(all, {key: "End"});
    expect(website).toHaveFocus();
    await fireEvent.keyDown(website, {key: "Home"});
    expect(all).toHaveFocus();
    await fireEvent.click(api);

    expect(api).toBeChecked();
    expect(screen.getAllByRole("article")).toHaveLength(2);

    await fireEvent.click(website);
    await rerender({incidents, windowFilter: "1d"});

    expect(all).toBeChecked();
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByText("Connection unavailable")).toBeVisible();
  });

  it("distinguishes loading from a successfully loaded empty timeline", async () => {
    const {rerender} = render(IncidentList, {props: {incidents: null, windowFilter: "1d"}});
    expect(screen.getByText(/Loading incidents/)).toBeVisible();

    await rerender({incidents: {generatedAt: now.toISOString(), incidents: []}, windowFilter: "1d"});

    expect(screen.getByText(/No incidents in this window/)).toBeVisible();
    expect(screen.queryByText(/Loading incidents/)).not.toBeInTheDocument();
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
  });

  it("distinguishes hours-old incidents from a probe timestamp ahead of the browser clock", () => {
    const feed: IncidentsFile = {
      generatedAt: now.toISOString(),
      incidents: [
        {
          id: "resolved-api",
          service: "api.arolariu.ro",
          startedAt: "2026-05-15T10:00:00Z",
          resolvedAt: "2026-05-15T11:00:00Z",
          status: "resolved",
          durationMs: 3_600_000,
          reason: "",
          severity: "Unhealthy",
          probeCount: 2,
        },
        {
          id: "open-api",
          service: "api.arolariu.ro",
          subCheck: "Database",
          startedAt: "2026-05-15T12:05:00Z",
          status: "open",
          reason: "Connection unavailable",
          severity: "Unhealthy",
          probeCount: 2,
        },
      ],
    };

    render(IncidentList, {props: {incidents: feed, windowFilter: "1d"}});

    expect(screen.getByRole("button", {name: /Resolved.*Started 2 hours ago.*lasted 1 h/i})).toBeVisible();
    const ongoing = screen.getByRole("button", {name: /Database Ongoing.*Started in 5 minutes/i});
    expect(ongoing).not.toHaveTextContent("lasted");
  });
});
