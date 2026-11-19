import {act, render, screen, within} from "@testing-library/svelte";
import {afterEach, describe, expect, it, vi} from "vitest";
import StatusBanner from "./StatusBanner.svelte";

describe("StatusBanner", () => {
  afterEach(() => vi.useRealTimers());

  it("announces an outage immediately but hides the probe age until a future timestamp becomes current", async () => {
    vi.useFakeTimers({toFake: ["Date", "setInterval", "clearInterval"]});
    vi.setSystemTime(new Date("2026-04-19T14:00:00Z"));
    render(StatusBanner, {props: {overallStatus: "Unhealthy", lastProbeAt: "2026-04-19T14:00:30Z"}});
    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent("Major service outage");
    expect(within(banner).queryByText(/Last probe/)).not.toBeInTheDocument();

    await act(() => vi.advanceTimersByTimeAsync(60_000));

    expect(within(banner).getByText("Last probe \u00b7 just now")).toBeInTheDocument();
    expect(banner).toHaveTextContent("Major service outage");
  });
});
