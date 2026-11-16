import {withSpan} from "@/instrumentation.server";
import fetchConfigurationValue from "@/lib/actions/storage/fetchConfig";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {type BlobObject, deleteBlobObject, resolveBlobObjectByMetadata} from "@/lib/azure/storageClient";
import {useScansStore} from "@/stores";
import {Toaster} from "@arolariu/components";
import {act, cleanup, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {MotionGlobalConfig} from "motion/react";
import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {TestDataBuilder} from "../../../../../../tests/helpers";
import {buildCachedScan} from "../../../../../../tests/helpers/invoiceDomain";
import {writeBlobMetadata} from "../../_utils/metadataUtilities";
import ScanSelectionToolbar from "./ScanSelectionToolbar";

const {mockRouter} = vi.hoisted(() => ({
  mockRouter: {push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), prefetch: vi.fn()},
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

const OWNER_ID = "user-1";

function selectScans(count: number): void {
  const scans = Array.from({length: count}, (_unused, index) => buildCachedScan({id: `scan-${index + 1}`}));
  act(() => {
    useScansStore.setState({scans, selectedScans: scans});
  });
}

/**
 * Arranges the storage seams behind the real `deleteScan` server action so only `storedScanIds` resolve to an
 * owned blob; every other scan resolves to "not found" and fails its deletion.
 */
function arrangeStoredScans(storedScanIds: ReadonlyArray<string>): void {
  const blobs: BlobObject[] = storedScanIds.map((scanId) => ({
    name: `scans/${OWNER_ID}/${scanId}.jpg`,
    url: `https://storage.test/invoices/scans/${OWNER_ID}/${scanId}.jpg`,
    metadata: writeBlobMetadata({...buildCachedScan().metadata, scanId, ownerId: OWNER_ID}),
    contentType: "image/jpeg",
    contentLength: 1024,
  }));
  vi.mocked(fetchBFFUserFromAuthService).mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: OWNER_ID}));
  vi.mocked(fetchConfigurationValue).mockResolvedValue("https://storage.test");
  vi.mocked(resolveBlobObjectByMetadata).mockImplementation(async ({predicate}) => blobs.find((blob) => predicate(blob)) ?? null);
  vi.mocked(deleteBlobObject).mockResolvedValue({succeeded: true});
}

function renderToolbarWithNotifications(): void {
  render(
    <>
      <ScanSelectionToolbar onCreateInvoice={vi.fn()} />
      <Toaster />
    </>,
  );
}

async function confirmDeletion(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.click(screen.getByRole("button", {name: /toolbar\.delete\.button/u}));
  await user.click(screen.getByRole("button", {name: "pages.invoices.viewScans.toolbar.delete.confirm"}));
}

function storedScanIds(): string[] {
  return useScansStore.getState().scans.map((scan) => scan.id);
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

  it("deletes every confirmed scan, confirms the deletion and refreshes the scan list", async () => {
    // Arrange
    const user = userEvent.setup();
    arrangeStoredScans(["scan-1", "scan-2"]);
    selectScans(2);
    renderToolbarWithNotifications();

    // Act
    await confirmDeletion(user);

    // Assert
    const notification = await screen.findByRole("dialog", {name: "pages.invoices.viewScans.toolbar.delete.success"});
    expect(notification).toHaveAttribute("data-type", "success");
    expect(vi.mocked(deleteBlobObject).mock.calls.map(([request]) => request.blobName)).toEqual([
      `scans/${OWNER_ID}/scan-1.jpg`,
      `scans/${OWNER_ID}/scan-2.jpg`,
    ]);
    expect(storedScanIds()).toEqual([]);
    expect(useScansStore.getState().selectedScans).toEqual([]);
    expect(mockRouter.refresh).toHaveBeenCalledOnce();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("keeps scans that could not be deleted and warns about the partial deletion", async () => {
    // Arrange
    const user = userEvent.setup();
    arrangeStoredScans(["scan-1"]);
    selectScans(2);
    renderToolbarWithNotifications();

    // Act
    await confirmDeletion(user);

    // Assert
    const notification = await screen.findByRole("dialog", {name: "pages.invoices.viewScans.toolbar.delete.partial"});
    expect(notification).toHaveAttribute("data-type", "warning");
    expect(screen.queryByRole("dialog", {name: "pages.invoices.viewScans.toolbar.delete.success"})).not.toBeInTheDocument();
    expect(storedScanIds()).toEqual(["scan-2"]);
    expect(useScansStore.getState().selectedScans).toEqual([]);
    expect(mockRouter.refresh).toHaveBeenCalledOnce();
  });

  it("reports a failed deletion without removing any scan when every request fails or rejects", async () => {
    // Arrange
    const user = userEvent.setup();
    arrangeStoredScans([]);
    vi.mocked(withSpan).mockRejectedValueOnce(new Error("Server action transport failed"));
    selectScans(2);
    renderToolbarWithNotifications();

    // Act
    await confirmDeletion(user);

    // Assert
    const notification = await screen.findByRole("dialog", {name: "pages.invoices.viewScans.toolbar.delete.failed"});
    expect(notification).toHaveAttribute("data-type", "error");
    expect(vi.mocked(deleteBlobObject)).not.toHaveBeenCalled();
    expect(storedScanIds()).toEqual(["scan-1", "scan-2"]);
    expect(useScansStore.getState().selectedScans).toEqual([]);
    expect(mockRouter.refresh).toHaveBeenCalledOnce();
  });

  it("keeps the success notification when refreshing the scan list fails after a deletion", async () => {
    // Arrange
    const user = userEvent.setup();
    const refreshError = new Error("Router unavailable");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    arrangeStoredScans(["scan-1"]);
    mockRouter.refresh.mockImplementationOnce(() => {
      throw refreshError;
    });
    selectScans(1);
    renderToolbarWithNotifications();

    // Act
    await confirmDeletion(user);

    // Assert
    const notification = await screen.findByRole("dialog", {name: "pages.invoices.viewScans.toolbar.delete.success"});
    expect(notification).toHaveAttribute("data-type", "success");
    expect(screen.queryByRole("dialog", {name: "pages.invoices.viewScans.toolbar.delete.error"})).not.toBeInTheDocument();
    expect(consoleError).toHaveBeenCalledWith("Failed to refresh the scan list after deleting scans:", refreshError);
    expect(consoleError).not.toHaveBeenCalledWith("Failed to delete scans:", refreshError);
    expect(storedScanIds()).toEqual([]);

    selectScans(1);

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", {name: /toolbar\.delete\.button/u})).toBeEnabled();
  });

  it("keeps the confirmation open and disabled while the deletion is pending", async () => {
    // Arrange
    const user = userEvent.setup();
    let resolveLookup: (blob: BlobObject | null) => void = () => undefined;
    arrangeStoredScans([]);
    vi.mocked(resolveBlobObjectByMetadata).mockImplementationOnce(
      async () =>
        new Promise<BlobObject | null>((resolve) => {
          resolveLookup = resolve;
        }),
    );
    selectScans(1);
    renderToolbarWithNotifications();

    // Act
    await confirmDeletion(user);

    // Assert
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "pages.invoices.viewScans.toolbar.delete.confirm"})).toBeDisabled();
    expect(mockRouter.refresh).not.toHaveBeenCalled();

    await act(async () => {
      resolveLookup(null);
    });

    expect(await screen.findByRole("dialog", {name: "pages.invoices.viewScans.toolbar.delete.failed"})).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(mockRouter.refresh).toHaveBeenCalledOnce();
  });
});
