import {act, fireEvent, render, screen, within} from "@testing-library/svelte";
import {afterEach, describe, expect, it, vi} from "vitest";
import {invalidateAllCaches} from "../lib/api/fetchStatusData";
import type {AggregateFile, IncidentsFile} from "../lib/types/status";
import StatusPage from "./+page.svelte";

describe("status dashboard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState(null, "", "/");
    invalidateAllCaches();
  });

  it("clears the error and enables refresh after a successful retry", async () => {
    const now = "2026-04-19T14:00:00Z";
    const aggregate: AggregateFile = {
      generatedAt: now,
      windowDays: 14,
      bucketSize: "30m",
      services: [{service: "api.arolariu.ro", buckets: []}],
    };
    vi.spyOn(Date, "now").mockReturnValue(Date.parse(now));
    window.history.replaceState(null, "", "/?mocks=off");
    const retry = Promise.withResolvers<Response>();
    let aggregateRequests = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (url) => {
        if (String(url).endsWith("/incidents.json")) return Response.json({generatedAt: now, incidents: []});
        if (!String(url).endsWith("/fine.json")) throw new Error("Unexpected aggregate request");
        aggregateRequests++;
        return aggregateRequests === 1 ? new Response("", {status: 503}) : retry.promise;
      }),
    );
    render(StatusPage);
    const error = await screen.findByRole("alert");
    const refresh = screen.getByRole("button", {name: "Refresh status data"});
    expect(error).toHaveTextContent("Status data unreachable");

    await fireEvent.click(within(error).getByRole("button", {name: "retry"}));

    try {
      expect(refresh).toBeDisabled();
      expect(refresh).toHaveAttribute("aria-busy", "true");
      expect(aggregateRequests).toBe(2);
    } finally {
      retry.resolve(Response.json(aggregate));
    }

    expect(await screen.findByRole("button", {name: "api.arolariu.ro"})).toBeInTheDocument();
    expect(screen.getByText("All systems operational")).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(refresh).toBeEnabled();
    expect(refresh).toHaveAttribute("aria-busy", "false");
  });

  it("reuses fine-grained data and resets the incident filter when the window changes", async () => {
    const now = "2026-04-19T14:00:00Z";
    const aggregate: AggregateFile = {
      generatedAt: now,
      windowDays: 14,
      bucketSize: "30m",
      services: [{service: "api.arolariu.ro", buckets: []}],
    };
    const incidents: IncidentsFile = {
      generatedAt: now,
      incidents: [
        {
          id: "database",
          service: "api.arolariu.ro",
          subCheck: "mssql",
          startedAt: "2026-04-19T13:40:00Z",
          severity: "Unhealthy",
          reason: "Connection failed",
          probeCount: 2,
          status: "open",
        },
        {
          id: "website",
          service: "arolariu.ro",
          startedAt: "2026-04-17T10:00:00Z",
          resolvedAt: "2026-04-17T10:30:00Z",
          durationMs: 1_800_000,
          severity: "Degraded",
          reason: "Slow responses",
          probeCount: 1,
          status: "resolved",
        },
      ],
    };
    vi.spyOn(Date, "now").mockReturnValue(Date.parse(now));
    window.history.replaceState(null, "", "/?mocks=off");
    const fetch = vi.fn<typeof globalThis.fetch>(async (url) => {
      if (String(url).endsWith("/incidents.json")) return Response.json(incidents);
      if (String(url).endsWith("/fine.json")) return Response.json(aggregate);
      throw new Error("Unexpected status request");
    });
    vi.stubGlobal("fetch", fetch);
    render(StatusPage);
    const open = await screen.findByRole("button", {name: /mssql.*ongoing/i});
    const filters = within(screen.getByRole("radiogroup", {name: "Filter incidents by service"}));
    expect(screen.queryByRole("button", {name: /arolariu.ro.*resolved/i})).not.toBeInTheDocument();

    await fireEvent.click(open);
    expect(screen.getByRole("region", {name: "Incident detail"})).toHaveTextContent("Connection failed");
    await fireEvent.click(filters.getByRole("radio", {name: "arolariu.ro"}));
    expect(screen.getByText(/no incidents in this window/i)).toBeInTheDocument();
    await fireEvent.click(screen.getByRole("radio", {name: "14d"}));

    expect(filters.getByRole("radio", {name: "All"})).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("button", {name: /mssql.*ongoing/i})).toBeInTheDocument();
    expect(screen.getByRole("button", {name: /arolariu.ro.*resolved/i})).toBeInTheDocument();
    expect(screen.getByRole("img", {name: "Uptime by weekday bar chart"})).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("expands and collapses service detail by keyboard and gives focused sub-checks the shared tooltip", async () => {
    const now = "2026-04-19T14:00:00Z";
    const aggregate: AggregateFile = {
      generatedAt: now,
      windowDays: 14,
      bucketSize: "30m",
      services: [
        {
          service: "api.arolariu.ro",
          buckets: [{t: "2026-04-19T13:30:00Z", status: "Degraded", probes: {healthy: 2, total: 3}, latency: {p50: 100, p99: 200}}],
          subSeries: {
            Database: [
              {
                t: "2026-04-19T13:00:00Z",
                status: "Unhealthy",
                probes: {healthy: 0, total: 3},
                latency: {p50: 250, p99: 800},
                httpStatus: 503,
                worstSubCheck: {name: "Database", status: "Unhealthy", description: "Timed out"},
              },
            ],
            Queue: [],
          },
        },
        {service: "arolariu.ro", buckets: []},
      ],
    };
    vi.spyOn(Date, "now").mockReturnValue(Date.parse(now));
    window.history.replaceState(null, "", "/?mocks=off");
    const fetch = vi.fn<typeof globalThis.fetch>(async (url) => {
      if (String(url).endsWith("/incidents.json")) return Response.json({generatedAt: now, incidents: []});
      if (String(url).endsWith("/fine.json")) return Response.json(aggregate);
      throw new Error("Unexpected status request");
    });
    vi.stubGlobal("fetch", fetch);
    render(StatusPage);
    const api = await screen.findByRole("button", {name: "api.arolariu.ro"});
    expect(api).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Some systems degraded")).toBeVisible();

    await fireEvent.keyDown(api, {key: "Enter"});

    const detail = screen.getByRole("region", {name: "Detail for api.arolariu.ro"});
    expect(api).toHaveAttribute("aria-expanded", "true");
    expect(within(detail).getByText(/Queue/)).toBeVisible();
    const bucket = within(detail).getByRole("button", {name: /13:00 UTC, Unhealthy, Database Timed out/});
    expect(bucket).not.toHaveAttribute("aria-describedby");

    await act(() => bucket.focus());

    const tooltip = screen.getByRole("tooltip");
    expect(bucket).toHaveAccessibleDescription(/503/);
    expect(tooltip).toHaveTextContent("2026-04-19 · 13:30 UTC");
    expect(tooltip).toHaveTextContent("Timed out");
    expect(within(detail).getByRole("button")).toHaveFocus();

    await act(() => bucket.blur());

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    const website = screen.getByRole("button", {name: "arolariu.ro"});
    await fireEvent.keyDown(website, {key: " "});

    expect(api).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("region", {name: "Detail for api.arolariu.ro"})).not.toBeInTheDocument();
    expect(screen.getByRole("region", {name: "Detail for arolariu.ro"})).toBeInTheDocument();

    await fireEvent.keyDown(document.body, {key: "Escape"});

    expect(website).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("region", {name: "Detail for arolariu.ro"})).not.toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("loads hourly history on keyboard selection and restores cached fine history when switching back", async () => {
    const now = "2026-04-19T14:00:00Z";
    const fine: AggregateFile = {
      generatedAt: now,
      windowDays: 14,
      bucketSize: "30m",
      services: [{service: "api.arolariu.ro", buckets: []}],
    };
    const hourly: AggregateFile = {generatedAt: now, windowDays: 90, bucketSize: "1h", services: []};
    const requests: string[] = [];
    vi.spyOn(Date, "now").mockReturnValue(Date.parse(now));
    window.history.replaceState(null, "", "/?mocks=off");
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (url) => {
        const file = String(url).split("/").at(-1);
        if (file === "incidents.json") return Response.json({generatedAt: now, incidents: []});
        if (file !== "fine.json" && file !== "hourly.json") throw new Error("Unexpected aggregate request");
        requests.push(file);
        return Response.json(file === "fine.json" ? fine : hourly);
      }),
    );
    render(StatusPage);
    await screen.findByRole("button", {name: "api.arolariu.ro"});

    await fireEvent.keyDown(document.body, {key: "5"});

    expect(screen.getByRole("radio", {name: "30d"})).toHaveAttribute("aria-checked", "true");
    expect(await screen.findByText(/No probes recorded yet/)).toBeVisible();
    expect(screen.queryByRole("button", {name: "api.arolariu.ro"})).not.toBeInTheDocument();

    await fireEvent.keyDown(document.body, {key: "1"});

    expect(screen.getByRole("radio", {name: "1d"})).toHaveAttribute("aria-checked", "true");
    expect(await screen.findByRole("button", {name: "api.arolariu.ro"})).toBeVisible();
    expect(requests).toEqual(["fine.json", "hourly.json"]);
  });

  it("toggles shortcut help and refreshes the selected history without treating a failed incidents request as fatal", async () => {
    const now = "2026-04-19T14:00:00Z";
    const before: AggregateFile = {
      generatedAt: now,
      windowDays: 14,
      bucketSize: "30m",
      services: [{service: "api.arolariu.ro", buckets: []}],
    };
    const after: AggregateFile = {...before, services: [{service: "arolariu.ro", buckets: []}]};
    vi.spyOn(Date, "now").mockReturnValue(Date.parse(now));
    window.history.replaceState(null, "", "/?mocks=off");
    const requests: string[] = [];
    let fineRequests = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (url) => {
        const file = String(url).split("/").at(-1) ?? "";
        requests.push(file);
        if (file === "incidents.json") return new Response("", {status: 503});
        if (file === "fine.json") return Response.json(fineRequests++ === 0 ? before : after);
        throw new Error("Unexpected status request");
      }),
    );
    render(StatusPage);
    const service = await screen.findByRole("button", {name: "api.arolariu.ro"});
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await fireEvent.keyDown(service, {key: "?"});

    const help = screen.getByRole("dialog", {name: "Keyboard shortcuts"});
    expect(help).toHaveFocus();
    expect(within(help).getByText("Refresh data")).toBeVisible();

    await fireEvent.keyDown(help, {key: "Escape"});
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(requests.toSorted()).toEqual(["fine.json", "incidents.json"]);

    await fireEvent.keyDown(service, {key: "R"});

    expect(await screen.findByRole("button", {name: "arolariu.ro"})).toBeVisible();
    expect(screen.queryByRole("button", {name: "api.arolariu.ro"})).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(requests.toSorted()).toEqual(["fine.json", "fine.json", "incidents.json", "incidents.json"]);
  });
});
