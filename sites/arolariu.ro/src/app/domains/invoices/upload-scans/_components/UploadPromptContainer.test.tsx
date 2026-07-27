/**
 * @fileoverview Tests for the post-upload prompt container navigation.
 * @module app/domains/invoices/upload-scans/_components/UploadPromptContainer.test
 */

import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {useScanUpload} from "../_context/ScanUploadContext";
import {usePostUploadPrompt} from "../_hooks/usePostUploadPrompt";
import UploadPromptContainer from "./UploadPromptContainer";

const pushMock = vi.fn();
const dismissMock = vi.fn();

vi.mock("next/navigation", () => ({useRouter: () => ({push: pushMock})}));
vi.mock("../_context/ScanUploadContext", () => ({useScanUpload: vi.fn()}));
vi.mock("../_hooks/usePostUploadPrompt", () => ({usePostUploadPrompt: vi.fn()}));
vi.mock("./PostUploadPrompt", () => ({
  default: ({onCreateInvoice, onViewScans}: {onCreateInvoice: () => void; onViewScans: () => void}) => (
    <div>
      <button type='button' onClick={onCreateInvoice}>
        create
      </button>
      <button type='button' onClick={onViewScans}>
        view
      </button>
    </div>
  ),
}));

describe("UploadPromptContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useScanUpload).mockReturnValue({
      pendingUploads: [],
      sessionStats: {totalAdded: 0, totalCompleted: 1, totalFailed: 0},
      completedBatch: [],
      clearCompletedBatch: vi.fn(),
    } as unknown as ReturnType<typeof useScanUpload>);
    vi.mocked(usePostUploadPrompt).mockReturnValue({isVisible: true, completedScans: [], dismissPrompt: dismissMock});
  });

  it("dismisses then navigates to create-invoice", async () => {
    render(<UploadPromptContainer />);
    await userEvent.click(screen.getByText("create"));
    expect(dismissMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith("/domains/invoices/create-invoice");
  });

  it("dismisses then navigates to view-scans", async () => {
    render(<UploadPromptContainer />);
    await userEvent.click(screen.getByText("view"));
    expect(dismissMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith("/domains/invoices/view-scans");
  });
});
