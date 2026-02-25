import {fireEvent, render, screen} from "@testing-library/react";
import type {ReactNode} from "react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import UploadArea from "./UploadArea";

const mockAddFiles = vi.fn();
const mockClearAll = vi.fn();
const mockUploadAll = vi.fn();

const mockContext = {
  pendingUploads: [] as Array<{id: string}>,
  isUploading: false,
  addFiles: mockAddFiles,
  clearAll: mockClearAll,
  uploadAll: mockUploadAll,
};

vi.mock("../_context/ScanUploadContext", () => ({
  useScanUpload: () => mockContext,
}));

vi.mock("motion/react", () => ({
  motion: {
    div: ({children}: Readonly<{children: ReactNode}>) => <div>{children}</div>,
  },
}));

vi.mock("@arolariu/components", () => ({
  Button: ({children, onClick, disabled}: Readonly<{children: ReactNode; onClick?: () => void; disabled?: boolean}>) => (
    <button
      type='button'
      onClick={onClick}
      disabled={disabled}>
      {children}
    </button>
  ),
  TooltipProvider: ({children}: Readonly<{children: ReactNode}>) => <>{children}</>,
  Tooltip: ({children}: Readonly<{children: ReactNode}>) => <>{children}</>,
  TooltipTrigger: ({children}: Readonly<{children: ReactNode}>) => <>{children}</>,
  TooltipContent: ({children}: Readonly<{children: ReactNode}>) => <span>{children}</span>,
}));

describe("UploadArea", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockContext.pendingUploads = [];
    mockContext.isUploading = false;
  });

  it("renders the empty-state i18n copy when no files are queued", () => {
    render(<UploadArea />);
    expect(screen.getByText("uploadArea.empty.title")).toBeInTheDocument();
    expect(screen.getByText("uploadArea.empty.chooseFiles")).toBeInTheDocument();
  });

  it("renders compact actions and invokes handlers when queue has files", () => {
    mockContext.pendingUploads = [{id: "queued-1"}];
    render(<UploadArea />);

    const clearButton = screen.getByText("uploadArea.actions.clearAll");
    const uploadButton = screen.getByText("uploadArea.actions.uploadScans");

    fireEvent.click(clearButton);
    fireEvent.click(uploadButton);

    expect(mockClearAll).toHaveBeenCalledTimes(1);
    expect(mockUploadAll).toHaveBeenCalledTimes(1);
  });

  it("shows uploading label and disables upload action while uploading", () => {
    mockContext.pendingUploads = [{id: "queued-1"}];
    mockContext.isUploading = true;
    render(<UploadArea />);

    const uploadButton = screen.getByRole("button", {
      name: "uploadArea.actions.uploading",
    });

    expect(uploadButton).toBeDisabled();
  });
});
