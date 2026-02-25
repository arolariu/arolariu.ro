import type {CachedScan, Scan} from "@/types/scans";
import {ScanStatus, ScanType} from "@/types/scans";
import {act, renderHook} from "@testing-library/react";
import type {ReactNode} from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {ScanUploadProvider, useScanUpload} from "./ScanUploadContext";

type PrepareScanUploadResult = Readonly<{
  status: number;
  uploadUrl: string;
  metadata: Record<string, string>;
  scan: Scan;
}>;

const mockPrepareScanUpload = vi.fn();
const mockUploadScan = vi.fn();
const mockRecordBulkUploadTelemetry = vi.fn();
const mockAddScan = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
const mockToastInfo = vi.fn();
const mockUuid = vi.fn();

type UploadProgressEvent = Readonly<{
  lengthComputable: boolean;
  loaded: number;
  total: number;
}>;

type UploadProgressListener = (event: UploadProgressEvent) => void;
type RequestListener = () => void;

type XhrPlan = Readonly<{type: "success"; status: number; progress: number[]}> | Readonly<{type: "error"}> | Readonly<{type: "abort"}>;

const xhrPlans: XhrPlan[] = [];

vi.mock("@/lib/actions/scans", () => ({
  prepareScanUpload: (...arguments_: unknown[]) => mockPrepareScanUpload(...arguments_),
  recordBulkUploadTelemetry: (...arguments_: unknown[]) => mockRecordBulkUploadTelemetry(...arguments_),
  uploadScan: (...arguments_: unknown[]) => mockUploadScan(...arguments_),
}));

vi.mock("@/stores", () => ({
  useScansStore: (selector: (state: {addScan: (scan: CachedScan) => void}) => unknown) =>
    selector({
      addScan: mockAddScan,
    }),
}));

vi.mock("@arolariu/components", () => ({
  toast: {
    success: (...arguments_: unknown[]) => mockToastSuccess(...arguments_),
    error: (...arguments_: unknown[]) => mockToastError(...arguments_),
    info: (...arguments_: unknown[]) => mockToastInfo(...arguments_),
  },
}));

vi.mock("uuid", () => ({
  v4: () => mockUuid(),
}));

class MockXMLHttpRequest {
  public status = 0;

  public upload = {
    addEventListener: (type: "progress", listener: UploadProgressListener): void => {
      if (type === "progress") {
        this.uploadProgressListeners.push(listener);
      }
    },
  };

  private readonly uploadProgressListeners: UploadProgressListener[] = [];
  private readonly loadListeners: RequestListener[] = [];
  private readonly errorListeners: RequestListener[] = [];
  private readonly abortListeners: RequestListener[] = [];

  public open(): void {
    // no-op for tests
  }

  public setRequestHeader(): void {
    // no-op for tests
  }

  public addEventListener(type: "load" | "error" | "abort", listener: RequestListener): void {
    if (type === "load") {
      this.loadListeners.push(listener);
      return;
    }

    if (type === "error") {
      this.errorListeners.push(listener);
      return;
    }

    this.abortListeners.push(listener);
  }

  public send(): void {
    const plan = xhrPlans.shift();
    if (!plan) {
      throw new Error("No XMLHttpRequest plan configured");
    }

    if (plan.type === "success") {
      for (const progress of plan.progress) {
        for (const progressListener of this.uploadProgressListeners) {
          progressListener({
            lengthComputable: true,
            loaded: progress,
            total: 100,
          });
        }
      }

      this.status = plan.status;
      for (const listener of this.loadListeners) {
        listener();
      }
      return;
    }

    if (plan.type === "error") {
      for (const listener of this.errorListeners) {
        listener();
      }
      return;
    }

    for (const listener of this.abortListeners) {
      listener();
    }
  }
}

function createFileList(files: File[]): FileList {
  const fileList = {
    length: files.length,
    item: (index: number) => files[index] ?? null,
    [Symbol.iterator]: function* () {
      for (const file of files) {
        yield file;
      }
    },
  } as FileList;

  for (const [index, file] of files.entries()) {
    Object.defineProperty(fileList, index, {
      configurable: true,
      enumerable: true,
      value: file,
      writable: false,
    });
  }

  return fileList;
}

function createPreparedScanUploadResult(index: number): PrepareScanUploadResult {
  return {
    status: 200,
    uploadUrl: `https://blob.test/upload-${index}?sig=test`,
    metadata: {
      userIdentifier: "user-123",
      scanId: `scan-${index}`,
      uploadedAt: new Date("2026-02-02T10:00:00.000Z").toISOString(),
      originalFileName: `file-${index}.jpg`,
      status: "ready",
    },
    scan: {
      id: `scan-${index}`,
      userIdentifier: "user-123",
      name: `file-${index}.jpg`,
      blobUrl: `https://blob.test/file-${index}.jpg`,
      mimeType: "image/jpeg",
      sizeInBytes: 1200,
      scanType: ScanType.JPEG,
      uploadedAt: new Date("2026-02-02T10:00:00.000Z"),
      status: ScanStatus.READY,
      metadata: {},
    },
  };
}

const wrapper = ({children}: Readonly<{children: ReactNode}>): React.JSX.Element => <ScanUploadProvider>{children}</ScanUploadProvider>;

describe("ScanUploadContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.unstubAllEnvs();

    xhrPlans.length = 0;
    mockUploadScan.mockResolvedValue({status: 201, scan: createPreparedScanUploadResult(999).scan});
    mockRecordBulkUploadTelemetry.mockResolvedValue({status: 202});

    let identifierCounter = 0;
    mockUuid.mockImplementation(() => {
      identifierCounter += 1;
      return `test-uuid-${identifierCounter}`;
    });
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:test-preview"),
      writable: true,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
      writable: true,
    });

    vi.stubGlobal("XMLHttpRequest", MockXMLHttpRequest);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("processes the upload queue with bounded concurrency", async () => {
    const {result} = renderHook(() => useScanUpload(), {wrapper});
    const files = Array.from({length: 5}, (_, index) => new File([`file-${index}`], `file-${index}.jpg`, {type: "image/jpeg"}));

    await act(async () => {
      result.current.addFiles(createFileList(files));
    });

    for (let index = 0; index < files.length; index += 1) {
      xhrPlans.push({type: "success", status: 201, progress: [100]});
    }

    let activePrepares = 0;
    let maxParallelPrepares = 0;
    let releaseGate: (() => void) | undefined;
    const gatePromise = new Promise<void>((resolve) => {
      releaseGate = resolve;
    });
    let preparedUploadIndex = 1;

    mockPrepareScanUpload.mockImplementation(async () => {
      activePrepares += 1;
      maxParallelPrepares = Math.max(maxParallelPrepares, activePrepares);
      await gatePromise;
      activePrepares -= 1;
      const resultForUpload = createPreparedScanUploadResult(preparedUploadIndex);
      preparedUploadIndex += 1;
      return resultForUpload;
    });

    let uploadAllPromise: Promise<void> | undefined;
    act(() => {
      uploadAllPromise = result.current.uploadAll();
    });

    await Promise.resolve();
    expect(mockPrepareScanUpload).toHaveBeenCalledTimes(3);

    releaseGate?.();

    await act(async () => {
      await uploadAllPromise;
    });

    expect(maxParallelPrepares).toBe(3);
    expect(mockPrepareScanUpload).toHaveBeenCalledTimes(5);
    expect(result.current.sessionStats.totalCompleted).toBe(5);
    expect(result.current.sessionStats.totalFailed).toBe(0);
  });

  it("retries transient errors, reports progress, and removes completed uploads", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);

    const {result} = renderHook(() => useScanUpload(), {wrapper});
    const file = new File(["file-1"], "file-1.jpg", {type: "image/jpeg"});

    await act(async () => {
      result.current.addFiles(createFileList([file]));
    });

    mockPrepareScanUpload
      .mockRejectedValueOnce(new Error("Network error while uploading scan"))
      .mockResolvedValueOnce(createPreparedScanUploadResult(1));

    xhrPlans.push({type: "success", status: 201, progress: [50, 100]});

    let uploadAllPromise: Promise<void> | undefined;
    await act(async () => {
      uploadAllPromise = result.current.uploadAll();
      await Promise.resolve();
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.pendingUploads[0]?.status).toBe("retrying");
    expect(result.current.pendingUploads[0]?.attempts).toBe(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(750);
    });

    await act(async () => {
      await uploadAllPromise;
    });

    expect(mockPrepareScanUpload).toHaveBeenCalledTimes(2);
    expect(result.current.pendingUploads[0]?.status).toBe("completed");
    expect(result.current.pendingUploads[0]?.progress).toBe(100);
    expect(result.current.sessionStats.totalCompleted).toBe(1);
    expect(result.current.sessionStats.totalFailed).toBe(0);
    expect(mockUploadScan).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(result.current.pendingUploads).toHaveLength(0);
  });

  it("uses compatibility upload path when direct upload is rollout-disabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_SCAN_UPLOAD_DIRECT_ENABLED", "false");
    const {result} = renderHook(() => useScanUpload(), {wrapper});
    const file = new File(["legacy-file"], "legacy-file.jpg", {type: "image/jpeg"});

    await act(async () => {
      result.current.addFiles(createFileList([file]));
    });

    await act(async () => {
      await result.current.uploadAll();
    });

    expect(mockPrepareScanUpload).not.toHaveBeenCalled();
    expect(mockUploadScan).toHaveBeenCalledTimes(1);
    expect(result.current.sessionStats.totalCompleted).toBe(1);
    expect(result.current.sessionStats.totalFailed).toBe(0);
  });

  it("fails fast when compatibility fallback mode is disabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_SCAN_UPLOAD_COMPATIBILITY_FALLBACK_MODE", "never");
    const {result} = renderHook(() => useScanUpload(), {wrapper});
    const file = new File(["direct-only"], "direct-only.jpg", {type: "image/jpeg"});

    await act(async () => {
      result.current.addFiles(createFileList([file]));
    });

    mockPrepareScanUpload.mockRejectedValueOnce(new Error("Direct upload failed with status 400"));

    await act(async () => {
      await result.current.uploadAll();
    });

    expect(mockPrepareScanUpload).toHaveBeenCalledTimes(1);
    expect(mockUploadScan).not.toHaveBeenCalled();
    expect(result.current.sessionStats.totalCompleted).toBe(0);
    expect(result.current.sessionStats.totalFailed).toBe(1);
    expect(result.current.pendingUploads[0]?.status).toBe("failed");
  });
});
