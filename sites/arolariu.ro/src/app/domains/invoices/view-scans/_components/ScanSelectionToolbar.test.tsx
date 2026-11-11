import {useScansStore} from "@/stores";
import {act, cleanup, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {MotionGlobalConfig} from "motion/react";
import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {buildCachedScan} from "../../../../../../tests/helpers/invoiceDomain";
import ScanSelectionToolbar from "./ScanSelectionToolbar";

function selectScans(count: number): void {
  const scans = Array.from({length: count}, (_unused, index) => buildCachedScan({id: `scan-${index + 1}`}));
  act(() => {
    useScansStore.setState({scans, selectedScans: scans});
  });
}

describe("ScanSelectionToolbar", () => {
  // happy-dom leaves cancelled Web Animations promises unhandled on unmount.
  beforeAll(() => {
    MotionGlobalConfig.skipAnimations = true;
  });

  afterAll(() => {
    MotionGlobalConfig.skipAnimations = false;
  });

  beforeEach(async () => {
    await useScansStore.persist.rehydrate();
    useScansStore.setState({scans: [], selectedScans: [], hasHydrated: false, isSyncing: false, lastSyncTimestamp: null});
  });

  afterEach(() => {
    cleanup();
    useScansStore.getState().clearScans();
  });

  it("does not render actions without a selection", () => {
    render(<ScanSelectionToolbar onCreateInvoice={vi.fn()} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("announces the selected count when the selection changes", () => {
    selectScans(1);
    render(<ScanSelectionToolbar onCreateInvoice={vi.fn()} />);

    expect(screen.getByRole("status")).toHaveTextContent(/^1 /u);
    expect(screen.getByRole("status")).toHaveAttribute("aria-atomic", "true");

    selectScans(2);

    expect(screen.getByRole("status")).toHaveTextContent(/^2 /u);
  });

  it.each([
    [1, "pages.invoices.viewScans.toolbar.createInvoice"],
    [2, "pages.invoices.viewScans.toolbar.createInvoices"],
  ])("keeps the complete accessible creation label for %s selected scans", async (count, label) => {
    const user = userEvent.setup();
    const onCreateInvoice = vi.fn();
    selectScans(count);
    render(<ScanSelectionToolbar onCreateInvoice={onCreateInvoice} />);

    await user.click(screen.getByRole("button", {name: label}));

    expect(onCreateInvoice).toHaveBeenCalledOnce();
    expect(useScansStore.getState().selectedScans).toHaveLength(count);
  });

  it("allows keyboard users to clear the selection without deleting scans", async () => {
    const user = userEvent.setup();
    selectScans(2);
    render(<ScanSelectionToolbar onCreateInvoice={vi.fn()} />);

    await user.tab();
    expect(screen.getByRole("button", {name: "pages.invoices.viewScans.toolbar.clearSelection"})).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(useScansStore.getState().selectedScans).toEqual([]);
    expect(useScansStore.getState().scans).toHaveLength(2);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("requires confirmation before deleting scans and preserves the selection when cancelled", async () => {
    const user = userEvent.setup();
    selectScans(2);
    render(<ScanSelectionToolbar onCreateInvoice={vi.fn()} />);
    const deleteButton = screen.getByRole("button", {name: /toolbar\.delete\.button/u});

    await user.click(deleteButton);

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(useScansStore.getState().scans).toHaveLength(2);

    await user.click(screen.getByRole("button", {name: "pages.invoices.viewScans.toolbar.delete.cancel"}));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(useScansStore.getState().selectedScans).toHaveLength(2);
    expect(useScansStore.getState().scans).toHaveLength(2);
    expect(deleteButton).toHaveFocus();
  });
});
