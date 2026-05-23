/**
 * @fileoverview Unit tests for ScanCard component (presentation contract).
 * @module app/domains/invoices/_cards/ScanCard.test
 */

import type {CachedScan} from "@/types/scans";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {useScanRotation} from "../_hooks/useScanRotation";
import {useDialogs} from "../_contexts/DialogContext";
import ScanCard from "./ScanCard";

// Mock dependencies
vi.mock("../_hooks/useScanRename", () => ({
  useScanRename: vi.fn(() => ({
    value: "receipt-001.jpg",
    isEditing: false,
    isCommitting: false,
    justRenamed: false,
    inputRef: {current: null},
    start: vi.fn(),
    cancel: vi.fn(),
    change: vi.fn(),
    commit: vi.fn(),
  })),
}));

vi.mock("../_hooks/useScanRotation", () => ({
  useScanRotation: vi.fn(() => ({
    isRotating: false,
    rotate: vi.fn(),
  })),
}));

vi.mock("../_contexts/DialogContext", () => ({
  useDialogs: vi.fn(() => ({
    openDialog: vi.fn(),
    closeDialog: vi.fn(),
    isOpen: vi.fn(() => false),
    currentDialog: {type: null, mode: null, payload: null},
  })),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      loading: "Loading...",
      rename: "Rename",
      rotateCW: "Rotate Right",
      rotateCCW: "Rotate Left",
      delete: "Delete",
      rotating: "Rotating...",
      linked: "Linked to invoice",
    };
    return translations[key.split(".").pop()!] || key;
  },
}));

const mockScan: CachedScan = {
  id: "scan-123",
  userIdentifier: "user_abc",
  name: "receipt-001.jpg",
  blobUrl: "https://cdn.arolariu.ro/scans/user_abc/scan-123.jpg",
  mimeType: "image/jpeg",
  sizeInBytes: 1048576,
  scanType: "JPEG",
  uploadedAt: new Date("2024-01-15"),
  status: "ready",
  metadata: {},
  cachedAt: new Date(),
};

describe("ScanCard", () => {
  const mockOnToggleSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render scan name", () => {
    render(
      <ScanCard
        scan={mockScan}
        isSelected={false}
        onToggleSelect={mockOnToggleSelect}
      />,
    );

    expect(screen.getByText("receipt-001.jpg")).toBeInTheDocument();
  });

  it("should render image preview", () => {
    render(
      <ScanCard
        scan={mockScan}
        isSelected={false}
        onToggleSelect={mockOnToggleSelect}
      />,
    );

    const image = screen.getByAltText("receipt-001.jpg");
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute("src", mockScan.blobUrl);
  });

  it("should trigger preview dialog when image is clicked", async () => {
    const mockOpenDialog = vi.fn();
    vi.mocked(useDialogs).mockReturnValue({
      openDialog: mockOpenDialog,
      closeDialog: vi.fn(),
      isOpen: vi.fn(() => false),
      currentDialog: {type: null, mode: null, payload: null},
    });

    render(
      <ScanCard
        scan={mockScan}
        isSelected={false}
        onToggleSelect={mockOnToggleSelect}
      />,
    );

    const previewArea = screen.getAllByRole("button")[0]!;
    await userEvent.click(previewArea);

    expect(mockOpenDialog).toHaveBeenCalledWith("SHARED__SCAN_PREVIEW", "view", {scan: mockScan});
  });

  it("should show selected state when isSelected is true", () => {
    const {container} = render(
      <ScanCard
        scan={mockScan}
        isSelected={true}
        onToggleSelect={mockOnToggleSelect}
      />,
    );

    const card = container.querySelector('[class*="cardSelected"]');
    expect(card).toBeInTheDocument();
  });

  it("should render PDF placeholder for PDF scans", () => {
    const pdfScan: CachedScan = {
      ...mockScan,
      mimeType: "application/pdf",
      scanType: "PDF",
    };

    render(
      <ScanCard
        scan={pdfScan}
        isSelected={false}
        onToggleSelect={mockOnToggleSelect}
      />,
    );

    // PDF icon should be present (no image preview rendered)
    expect(screen.queryByAltText("receipt-001.jpg")).not.toBeInTheDocument();
  });

  it("should show linked badge when scan is used by invoice", () => {
    const linkedScan: CachedScan = {
      ...mockScan,
      metadata: {usedByInvoice: "true"},
    };

    render(
      <ScanCard
        scan={linkedScan}
        isSelected={false}
        onToggleSelect={mockOnToggleSelect}
      />,
    );

    expect(screen.getByText("Linked to invoice")).toBeInTheDocument();
  });

  it("should show rotating overlay when rotation is in progress", () => {
    vi.mocked(useScanRotation).mockReturnValue({
      isRotating: true,
      rotate: vi.fn(),
    });

    render(
      <ScanCard
        scan={mockScan}
        isSelected={false}
        onToggleSelect={mockOnToggleSelect}
      />,
    );

    expect(screen.getByText("Rotating...")).toBeInTheDocument();
  });
});
