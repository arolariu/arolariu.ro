import {fireEvent, render, screen} from "@testing-library/react";
import type {ReactNode} from "react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import UploadPreview from "./UploadPreview";

const mockRemoveFiles = vi.fn();

type UploadStatus = "idle" | "uploading" | "retrying" | "completed" | "failed";

type PendingUploadMock = Readonly<{
  id: string;
  name: string;
  mimeType: string;
  size: number;
  preview: string;
  status: UploadStatus;
  progress: number;
  attempts: number;
  error?: string;
}>;

const mockContext = {
  pendingUploads: [] as PendingUploadMock[],
  removeFiles: mockRemoveFiles,
};

vi.mock("../_context/ScanUploadContext", () => ({
  useScanUpload: () => mockContext,
}));

vi.mock("next/image", () => ({
  default: ({src, alt, className}: {src: string; alt: string; className?: string}) => (
    <img
      src={src}
      alt={alt}
      className={className}
    />
  ),
}));

vi.mock("@arolariu/components", () => ({
  Badge: ({children}: Readonly<{children: ReactNode}>) => <span>{children}</span>,
  Button: ({children, onClick}: Readonly<{children: ReactNode; onClick?: () => void}>) => (
    <button
      type='button'
      onClick={onClick}>
      {children}
    </button>
  ),
  Card: ({children}: Readonly<{children: ReactNode}>) => <div>{children}</div>,
  CardContent: ({children}: Readonly<{children: ReactNode}>) => <div>{children}</div>,
  TooltipProvider: ({children}: Readonly<{children: ReactNode}>) => <>{children}</>,
  Tooltip: ({children}: Readonly<{children: ReactNode}>) => <>{children}</>,
  TooltipTrigger: ({children}: Readonly<{children: ReactNode}>) => <>{children}</>,
  TooltipContent: ({children}: Readonly<{children: ReactNode}>) => <span>{children}</span>,
}));

describe("UploadPreview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockContext.pendingUploads = [];
  });

  it("returns null when queue is empty", () => {
    const {container} = render(<UploadPreview />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders retrying upload with progress and attempt details", () => {
    mockContext.pendingUploads = [
      {
        id: "upload-1",
        name: "receipt.jpg",
        mimeType: "image/jpeg",
        size: 1536,
        preview: "blob:preview-receipt",
        status: "retrying",
        progress: 67,
        attempts: 2,
        error: "temporary network issue",
      },
    ];

    render(<UploadPreview />);

    expect(screen.getByText("preview.status.retrying")).toBeInTheDocument();
    expect(screen.getByText(/67\s*%/u)).toBeInTheDocument();
    expect(screen.getByText("preview.retryAttempt")).toBeInTheDocument();
    expect(screen.getByText("temporary network issue")).toBeInTheDocument();
  });

  it("allows removing failed uploads", () => {
    mockContext.pendingUploads = [
      {
        id: "upload-failed",
        name: "invoice.pdf",
        mimeType: "application/pdf",
        size: 2048,
        preview: "blob:preview-pdf",
        status: "failed",
        progress: 0,
        attempts: 3,
        error: "permanent failure",
      },
    ];

    render(<UploadPreview />);

    const removeButton = screen.getByRole("button");
    fireEvent.click(removeButton);

    expect(mockRemoveFiles).toHaveBeenCalledWith(["upload-failed"]);
  });
});
