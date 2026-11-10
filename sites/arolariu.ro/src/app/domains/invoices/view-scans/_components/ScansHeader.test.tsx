/**
 * @fileoverview Tests for the view-scans header navigation actions.
 * @module app/domains/invoices/view-scans/_components/ScansHeader.test
 */

import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {useScansStore} from "@/stores";
import {act, render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach, describe, expect, it, vi} from "vitest";
import {TestDataBuilder} from "../../../../../../tests/helpers";
import ScansHeader from "./ScansHeader";

describe("ScansHeader", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    act(() => {
      useScansStore.setState({hasHydrated: false, isSyncing: false, lastSyncTimestamp: null});
    });
  });

  // Base UI logs each development warning once per module, so this must run before other renders.
  it("does not report a Base UI native button mismatch", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<ScansHeader />);

    const messages = consoleError.mock.calls.map((call) => call.map(String).join(" "));
    expect(messages.filter((message) => message.includes("expected a native <button>"))).toEqual([]);
  });

  it.each([
    [/header\.uploadMore/, "/domains/invoices/upload-scans"],
    [/header\.myInvoices/, "/domains/invoices/view-invoices"],
  ])("renders the %s action as a native navigation link", (name, href) => {
    render(<ScansHeader />);

    const link = screen.getByRole("link", {name});
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", href);
    expect(link).not.toHaveAttribute("role");
    expect(link).not.toHaveAttribute("type");
  });

  it("shows the last-synced paragraph only once a sync timestamp exists", () => {
    const {unmount} = render(<ScansHeader />);
    expect(screen.queryByText(/header\.lastSynced/)).not.toBeInTheDocument();
    unmount();

    act(() => {
      useScansStore.setState({lastSyncTimestamp: new Date()});
    });
    render(<ScansHeader />);

    expect(screen.getByText(/header\.lastSynced/)).toBeInTheDocument();
  });

  it("forces a sync when the sync button is clicked and re-enables it afterwards", async () => {
    const user = userEvent.setup();
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(fetchBFFUserFromAuthService).mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-001"}));
    render(<ScansHeader />);
    const syncButton = screen.getByRole("button", {name: /header\.sync(?!ing)/});
    expect(fetchBFFUserFromAuthService).not.toHaveBeenCalled();

    await user.click(syncButton);

    await waitFor(() => expect(fetchBFFUserFromAuthService).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(syncButton).toBeEnabled());
    expect(useScansStore.getState().isSyncing).toBe(false);
  });
});
