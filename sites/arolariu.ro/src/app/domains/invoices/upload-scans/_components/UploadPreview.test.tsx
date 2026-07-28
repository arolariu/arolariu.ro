/**
 * @fileoverview Smoke test for the pending uploads preview grid.
 * @module app/domains/invoices/upload-scans/_components/UploadPreview.test
 */

import {render, screen} from "@testing-library/react";
import type {ReactNode} from "react";
import {describe, expect, it, vi} from "vitest";
import {useScanUpload} from "../_context/ScanUploadContext";
import type {PendingUpload} from "../_types";
import UploadPreview from "./UploadPreview";

vi.mock("../_context/ScanUploadContext", () => ({useScanUpload: vi.fn()}));
vi.mock("../../_cards/ScanCard", () => ({default: ({title}: {title: string}) => <div data-testid='scan-card'>{title}</div>}));
vi.mock("../../_components/StaggerContainer", () => ({
  StaggerContainer: ({children}: {children: ReactNode}) => <div>{children}</div>,
  StaggerItem: ({children}: {children: ReactNode}) => <div>{children}</div>,
}));
vi.mock("@arolariu/components", () => ({
  Badge: ({children}: {children: ReactNode}) => <span>{children}</span>,
  Button: ({children}: {children: ReactNode}) => <button type='button'>{children}</button>,
  useIsMobile: () => false,
}));

function upload(id: string): PendingUpload {
  return {
    id,
    name: `${id}.jpg`,
    file: null,
    mimeType: "image/jpeg",
    size: 4,
    preview: `blob:${id}`,
    status: "idle",
    progress: 0,
    attempts: 0,
  };
}

describe("UploadPreview", () => {
  it("renders one card per pending upload and no pagination below the page size", () => {
    vi.mocked(useScanUpload).mockReturnValue({
      pendingUploads: [upload("a"), upload("b"), upload("c")],
      removeFiles: vi.fn(),
      renameFile: vi.fn(),
      rotateFile: vi.fn(),
    } as unknown as ReturnType<typeof useScanUpload>);

    render(<UploadPreview />);

    expect(screen.getAllByTestId("scan-card")).toHaveLength(3);
    expect(screen.queryByText(/pagination\.pageInfo/)).toBeNull();
  });
});
