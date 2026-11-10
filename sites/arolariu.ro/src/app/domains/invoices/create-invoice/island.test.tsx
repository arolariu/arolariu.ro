/**
 * @fileoverview Tests for the create-invoice island scan availability gate and wizard step flow.
 * @module app/domains/invoices/create-invoice/island.test
 *
 * @remarks
 * Only the client-to-server boundary (scan server actions) and the Next.js router are mocked.
 * The real IndexedDB-persisted scans store runs against `fake-indexeddb`.
 */

import {useScansStore} from "@/stores";
import {type CachedScan, type Scan, ScanDocumentKind, ScanDocumentRole, ScanMetadataStatus, ScanStatus, ScanType} from "@/types/scans";
import {act, render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {MotionGlobalConfig} from "motion/react";
import {afterAll, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";

const {mockFetchScans, mockReplace, mockRouter} = vi.hoisted(() => {
  const replace = vi.fn();
  return {
    mockFetchScans: vi.fn(),
    mockReplace: replace,
    mockRouter: {push: vi.fn(), replace, back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn()},
  };
});

vi.mock("../_actions/scans", () => ({
  fetchScans: mockFetchScans,
  updateScan: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  usePathname: () => "/domains/invoices/create-invoice",
  useSearchParams: () => new URLSearchParams(),
}));

import RenderCreateInvoiceScreen from "./island";

const UPLOAD_SCANS_PATH = "/domains/invoices/upload-scans";
const WIZARD_HEADING = /createInvoice\.header\.title/;
const NEXT_BUTTON = /createInvoice\.navigation\.next/;

function buildScan(id: string, status: ScanStatus = ScanStatus.READY): Scan {
  return {
    id,
    userIdentifier: "user-001",
    name: `Scan ${id}`,
    blobUrl: `https://storage.blob.core.windows.net/invoices/scans/user-001/${id}.jpg`,
    mimeType: "image/jpeg",
    sizeInBytes: 1024,
    scanType: ScanType.JPEG,
    uploadedAt: new Date("2024-01-01"),
    status,
    metadata: {
      scanId: id,
      ownerId: "user-001",
      displayName: `Scan ${id}`,
      documentKind: ScanDocumentKind.RECEIPT,
      documentRole: ScanDocumentRole.PRIMARY,
      status: ScanMetadataStatus.READY,
      uploadedAt: new Date("2024-01-01"),
      uploadedBy: "user-001",
    },
  };
}

function buildCachedScan(id: string, status: ScanStatus = ScanStatus.READY): CachedScan {
  return {...buildScan(id, status), cachedAt: new Date("2024-01-02")};
}

function seedStore(scans: ReadonlyArray<CachedScan>, hasHydrated = true): void {
  act(() => {
    useScansStore.setState({scans, selectedScans: [], hasHydrated});
  });
}

describe("RenderCreateInvoiceScreen scan availability gate", () => {
  // happy-dom leaves cancelled Web Animations `finished` promises unhandled when the wizard unmounts.
  beforeAll(() => {
    MotionGlobalConfig.skipAnimations = true;
  });

  afterAll(() => {
    MotionGlobalConfig.skipAnimations = false;
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    await act(async () => {
      await useScansStore.persist.rehydrate();
    });
    seedStore([]);
  });

  it("holds on the loading skeleton until the scans fetch settles", () => {
    mockFetchScans.mockReturnValue(new Promise(() => {}));

    const {container} = render(<RenderCreateInvoiceScreen />);

    expect(mockFetchScans).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-slot="skeleton"]')).not.toBeNull();
    expect(screen.queryByRole("heading", {name: WIZARD_HEADING})).not.toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("waits for IndexedDB hydration before fetching scans", async () => {
    seedStore([], false);
    mockFetchScans.mockResolvedValue({success: true, data: [buildScan("scan-ready")]});

    render(<RenderCreateInvoiceScreen />);
    expect(mockFetchScans).not.toHaveBeenCalled();

    act(() => {
      useScansStore.getState().setHasHydrated(true);
    });

    expect(await screen.findByRole("heading", {name: WIZARD_HEADING})).toBeInTheDocument();
    expect(mockFetchScans).toHaveBeenCalledTimes(1);
  });

  it("redirects to upload-scans when the fetched scans contain no READY scan", async () => {
    mockFetchScans.mockResolvedValue({success: true, data: [buildScan("scan-detached", ScanStatus.DETACHED)]});

    render(<RenderCreateInvoiceScreen />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith(UPLOAD_SCANS_PATH));
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("heading", {name: WIZARD_HEADING})).not.toBeInTheDocument();
  });

  it("redirects using freshly fetched scans even when the cache has a stale READY scan", async () => {
    seedStore([buildCachedScan("scan-stale")]);
    mockFetchScans.mockResolvedValue({success: true, data: []});

    render(<RenderCreateInvoiceScreen />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith(UPLOAD_SCANS_PATH));
    expect(useScansStore.getState().scans).toEqual([]);
    expect(screen.queryByRole("heading", {name: WIZARD_HEADING})).not.toBeInTheDocument();
  });

  it("caches the fetched scans and renders the wizard when a READY scan exists", async () => {
    mockFetchScans.mockResolvedValue({success: true, data: [buildScan("scan-ready")]});

    render(<RenderCreateInvoiceScreen />);

    expect(await screen.findByRole("heading", {name: WIZARD_HEADING})).toBeInTheDocument();
    expect(useScansStore.getState().scans.map((scan) => scan.id)).toEqual(["scan-ready"]);
    expect(useScansStore.getState().scans[0]?.cachedAt).toBeInstanceOf(Date);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("advances a selected READY scan through the details and review steps", async () => {
    const user = userEvent.setup();
    mockFetchScans.mockResolvedValue({success: true, data: [buildScan("scan-ready")]});

    render(<RenderCreateInvoiceScreen />);
    expect(await screen.findByRole("heading", {name: WIZARD_HEADING})).toBeInTheDocument();

    const nextButton = screen.getByRole("button", {name: NEXT_BUTTON});
    expect(nextButton).toBeDisabled();

    await user.click(screen.getByRole("button", {name: /createInvoice\.scanSelector\.selectAll/}));
    expect(nextButton).toBeEnabled();
    await user.click(nextButton);

    expect(await screen.findByRole("heading", {name: /createInvoice\.detailsForm\.title/})).toBeInTheDocument();
    expect(screen.getByLabelText(/createInvoice\.detailsForm\.fields\.name\.label/)).toHaveValue("Scan scan-ready");
    await user.type(screen.getByLabelText(/createInvoice\.detailsForm\.fields\.description\.label/), "Weekly groceries");
    await user.click(screen.getByRole("button", {name: NEXT_BUTTON}));

    expect(await screen.findByRole("heading", {name: /createInvoice\.reviewStep\.title/})).toBeInTheDocument();
    expect(screen.getByText("Weekly groceries")).toBeInTheDocument();
    expect(screen.getByRole("button", {name: /createInvoice\.reviewStep\.actions\.create/})).toBeEnabled();
    expect(screen.queryByRole("button", {name: NEXT_BUTTON})).not.toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("falls back to cached READY scans when the fetch is unsuccessful", async () => {
    seedStore([buildCachedScan("scan-cached")]);
    mockFetchScans.mockResolvedValue({success: false, error: {code: "SERVER_ERROR", message: "Unavailable"}});

    render(<RenderCreateInvoiceScreen />);

    expect(await screen.findByRole("heading", {name: WIZARD_HEADING})).toBeInTheDocument();
    expect(useScansStore.getState().scans.map((scan) => scan.id)).toEqual(["scan-cached"]);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("redirects when the fetch throws and no READY scan is cached", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const failure = new Error("network down");
    mockFetchScans.mockRejectedValue(failure);

    render(<RenderCreateInvoiceScreen />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith(UPLOAD_SCANS_PATH));
    expect(consoleError).toHaveBeenCalledWith(expect.any(String), failure);
    consoleError.mockRestore();
  });

  it("keeps the wizard mounted when READY scans are consumed after the initial check", async () => {
    mockFetchScans.mockResolvedValue({success: true, data: [buildScan("scan-ready")]});

    render(<RenderCreateInvoiceScreen />);
    expect(await screen.findByRole("heading", {name: WIZARD_HEADING})).toBeInTheDocument();

    act(() => {
      useScansStore.getState().setScans([buildCachedScan("scan-ready", ScanStatus.ATTACHED)]);
    });

    expect(screen.getByRole("heading", {name: WIZARD_HEADING})).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
