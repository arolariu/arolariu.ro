/**
 * @fileoverview Unit tests for DeleteScanDialog component.
 * @module app/domains/invoices/_dialogs/DeleteScanDialog.test
 */

import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {useScanDelete} from "../_hooks/useScanDelete";
import DeleteScanDialog from "./DeleteScanDialog";

// Mock dependencies
vi.mock("../_hooks/useScanDelete", () => ({
  useScanDelete: vi.fn(() => ({
    isDeleting: false,
    performDelete: vi.fn(),
  })),
}));

vi.mock("../_contexts/DialogContext", () => ({
  useDialog: vi.fn(() => ({
    isOpen: true,
    close: vi.fn(),
    currentDialog: {
      payload: {
        scan: {
          id: "scan-123",
          name: "receipt-001.jpg",
        },
      },
    },
  })),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, vars?: Record<string, string | number>) => {
    const translations: Record<string, string> = {
      title: "Delete Scan",
      description: "Are you sure you want to delete {name}?",
      cancel: "Cancel",
      delete: "Delete",
      deleting: "Deleting...",
    };
    const raw = translations[key.split(".").pop()!] || key;
    if (!vars) return raw;
    return Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)), raw);
  },
}));

describe("DeleteScanDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useScanDelete).mockReturnValue({
      isDeleting: false,
      performDelete: vi.fn(),
    });
  });

  it("should render with scan name", () => {
    render(<DeleteScanDialog />);

    expect(screen.getByText("Delete Scan")).toBeInTheDocument();
    expect(screen.getByText(/receipt-001.jpg/)).toBeInTheDocument();
  });

  it("should display cancel and delete buttons", () => {
    render(<DeleteScanDialog />);

    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("should call performDelete when confirm button is clicked", async () => {
    const mockPerformDelete = vi.fn();
    vi.mocked(useScanDelete).mockReturnValue({
      isDeleting: false,
      performDelete: mockPerformDelete,
    });

    render(<DeleteScanDialog />);

    const deleteButton = screen.getByText("Delete");
    await userEvent.click(deleteButton);

    expect(mockPerformDelete).toHaveBeenCalledOnce();
  });

  it("should disable buttons during deletion", () => {
    vi.mocked(useScanDelete).mockReturnValue({
      isDeleting: true,
      performDelete: vi.fn(),
    });

    render(<DeleteScanDialog />);

    const cancelButton = screen.getByText("Cancel");
    const deleteButton = screen.getByText("Deleting...");

    expect(cancelButton).toBeDisabled();
    expect(deleteButton).toBeDisabled();
  });
});
