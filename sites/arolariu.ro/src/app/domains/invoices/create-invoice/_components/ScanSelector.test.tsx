/**
 * @fileoverview Tests for the create-invoice scan selector.
 * @module app/domains/invoices/create-invoice/_components/ScanSelector.test
 *
 * @remarks
 * Uses the real wizard provider and the real IndexedDB-backed scans store (fake-indexeddb).
 */

import {useScansStore} from "@/stores";
import {type CachedScan, ScanDocumentKind, ScanDocumentRole, ScanMetadataStatus, ScanStatus, ScanType} from "@/types/scans";
import {act, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {MotionGlobalConfig} from "motion/react";
import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it} from "vitest";
import {CreateInvoiceProvider} from "../_context/CreateInvoiceContext";
import ScanSelector from "./ScanSelector";

function buildScan(id: string, overrides: Partial<CachedScan> = {}): CachedScan {
  return {
    id,
    userIdentifier: "user-001",
    name: `Scan ${id}`,
    blobUrl: `https://storage.blob.core.windows.net/invoices/scans/user-001/${id}.jpg`,
    mimeType: "image/jpeg",
    sizeInBytes: 1024,
    scanType: ScanType.JPEG,
    uploadedAt: new Date("2024-01-01"),
    status: ScanStatus.READY,
    cachedAt: new Date("2024-01-02"),
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
    ...overrides,
  };
}

function seedStore(scans: ReadonlyArray<CachedScan>): void {
  act(() => {
    useScansStore.setState({scans, selectedScans: [], hasHydrated: true});
  });
}

function setViewportWidth(width: number): void {
  Object.defineProperty(window, "innerWidth", {configurable: true, writable: true, value: width});
}

function renderSelector(): ReturnType<typeof render> {
  return render(
    <CreateInvoiceProvider>
      <ScanSelector />
    </CreateInvoiceProvider>,
  );
}

describe("ScanSelector", () => {
  const originalWidth = window.innerWidth;

  // happy-dom leaves cancelled Web Animations `finished` promises unhandled when the tree unmounts.
  beforeAll(() => {
    MotionGlobalConfig.skipAnimations = true;
  });

  afterAll(() => {
    MotionGlobalConfig.skipAnimations = false;
  });

  beforeEach(async () => {
    setViewportWidth(1280);
    await act(async () => {
      await useScansStore.persist.rehydrate();
    });
    seedStore([]);
  });

  afterEach(() => {
    setViewportWidth(originalWidth);
  });

  it("shows the empty state and no selection actions when there are no READY scans", () => {
    seedStore([buildScan("detached", {status: ScanStatus.DETACHED})]);

    renderSelector();

    expect(screen.getByText(/scanSelector\.noScans/)).toBeInTheDocument();
    expect(screen.queryByRole("button", {name: /scanSelector\.selectAll/})).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("toggles a scan through its card checkbox while keeping the select-all action for a partial selection", async () => {
    const user = userEvent.setup();
    seedStore([buildScan("a"), buildScan("b")]);
    renderSelector();
    expect(screen.queryByText(/scanSelector\.selectedCount/)).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("checkbox")[0] as HTMLElement);

    expect(screen.getByText(/scanSelector\.selectedCount/)).toBeInTheDocument();
    expect(screen.getByRole("button", {name: /scanSelector\.selectAll/})).toBeInTheDocument();

    await user.click(screen.getAllByRole("checkbox")[0] as HTMLElement);

    expect(screen.queryByText(/scanSelector\.selectedCount/)).not.toBeInTheDocument();
  });

  it("selects every scan and then clears the selection", async () => {
    const user = userEvent.setup();
    seedStore([buildScan("a"), buildScan("b")]);
    renderSelector();

    await user.click(screen.getByRole("button", {name: /scanSelector\.selectAll/}));

    expect(screen.getByRole("button", {name: /scanSelector\.clearAll/})).toBeInTheDocument();
    for (const checkbox of screen.getAllByRole("checkbox")) {
      expect(checkbox).toBeChecked();
    }

    await user.click(screen.getByRole("button", {name: /scanSelector\.clearAll/}));

    expect(screen.getByRole("button", {name: /scanSelector\.selectAll/})).toBeInTheDocument();
    for (const checkbox of screen.getAllByRole("checkbox")) {
      expect(checkbox).not.toBeChecked();
    }
  });

  it("renders a PDF placeholder for PDF scans and an image for other scans", () => {
    seedStore([
      buildScan("doc", {mimeType: "application/pdf", scanType: ScanType.PDF, name: "doc.pdf"}),
      buildScan("pic", {name: "pic.jpg"}),
    ]);

    const {container} = renderSelector();

    expect(screen.getByText("PDF")).toBeInTheDocument();
    const images = container.querySelectorAll("img");
    expect(images).toHaveLength(1);
    expect(images[0]).toHaveAttribute("alt", "pic.jpg");
  });

  it("paginates 21 READY scans on a mobile viewport with 20 per page", async () => {
    const user = userEvent.setup();
    setViewportWidth(500);
    seedStore(Array.from({length: 21}, (_, index) => buildScan(`scan-${String(index).padStart(2, "0")}`)));

    renderSelector();

    expect(screen.getAllByRole("checkbox")).toHaveLength(20);
    expect(screen.getByText(/1 \/ 2 \(21/)).toBeInTheDocument();
    const previous = screen.getByRole("button", {name: /scanSelector\.previous/});
    const next = screen.getByRole("button", {name: /scanSelector\.next/});
    expect(previous).toBeDisabled();

    await user.click(next);

    expect(screen.getAllByRole("checkbox")).toHaveLength(1);
    expect(screen.getByText(/2 \/ 2 \(21/)).toBeInTheDocument();
    expect(next).toBeDisabled();

    await user.click(previous);

    expect(screen.getAllByRole("checkbox")).toHaveLength(20);
    expect(screen.getByText(/1 \/ 2 \(21/)).toBeInTheDocument();
  });

  it("returns to the first page when the number of READY scans changes", async () => {
    const user = userEvent.setup();
    setViewportWidth(500);
    const scans = Array.from({length: 22}, (_, index) => buildScan(`scan-${String(index).padStart(2, "0")}`));
    seedStore(scans);
    renderSelector();

    await user.click(screen.getByRole("button", {name: /scanSelector\.next/}));
    expect(screen.getByText(/2 \/ 2 \(22/)).toBeInTheDocument();

    seedStore(scans.slice(0, 21));

    expect(screen.getByText(/1 \/ 2 \(21/)).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(20);
  });

  it("shows all 21 READY scans without pagination on a desktop viewport", () => {
    seedStore(Array.from({length: 21}, (_, index) => buildScan(`scan-${String(index).padStart(2, "0")}`)));

    renderSelector();

    expect(screen.getAllByRole("checkbox")).toHaveLength(21);
    expect(screen.queryByRole("button", {name: /scanSelector\.next/})).not.toBeInTheDocument();
  });
});
