/**
 * @fileoverview Unit tests for the slim scan upload provider.
 * @module app/domains/invoices/upload-scans/_context/ScanUploadContext.test
 */

import {act, renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {notify} from "@/lib/notify";
import {createScan, createScanUploadTarget} from "../../_actions/scans";
import {ScanUploadProvider, useScanUpload} from "./ScanUploadContext";

vi.mock("@/lib/notify", async () => ({notify: (await import("@arolariu/components")).toast}));
vi.mock("@arolariu/components", () => ({
  toast: {success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn()},
}));

vi.mock("../../_actions/scans", () => ({
  createScan: vi.fn(),
  createScanUploadTarget: vi.fn(),
}));

describe("ScanUploadProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("toasts a localized message when uploading with an empty queue", async () => {
    const {result} = renderHook(() => useScanUpload(), {wrapper: ScanUploadProvider});

    await act(async () => {
      await result.current.uploadAll();
    });

    expect(notify.info).toHaveBeenCalledTimes(1);
    expect(String(vi.mocked(notify.info).mock.calls[0]?.[0])).toContain("noFilesToUpload");
  });

  it("rejects an oversized file with a localized error toast and adds nothing", async () => {
    const {result} = renderHook(() => useScanUpload(), {wrapper: ScanUploadProvider});
    const oversized = new File([new Uint8Array(11 * 1024 * 1024)], "big.jpg", {type: "image/jpeg"});

    await act(async () => {
      await result.current.addFiles([oversized]);
    });

    expect(notify.error).toHaveBeenCalledTimes(1);
    expect(String(vi.mocked(notify.error).mock.calls[0]?.[0])).toContain("tooLarge");
    expect(result.current.pendingUploads).toHaveLength(0);
  });
});

type UploadTarget = Awaited<ReturnType<typeof createScanUploadTarget>>;

const successfulTarget: UploadTarget = {
  success: true,
  data: {
    sasUrl: "https://storage/upload?sas=1",
    blobName: "scans/user-1/scan-1.jpg",
    blobUrl: "https://storage/scans/scan-1.jpg",
    scanId: "scan-1",
    requiredHeaders: {"x-ms-blob-type": "BlockBlob"},
    metadata: {
      scanId: "scan-1",
      ownerId: "user-1",
      documentKind: "receipt",
      documentRole: "primary",
      status: "ready",
      uploadedAt: new Date("2026-05-26T00:00:00.000Z"),
      uploadedBy: "user-1",
    },
  },
};

const failedTarget: UploadTarget = {success: false, error: {code: "SERVER_ERROR", message: "target unavailable"}};

const jpeg = (name = "receipt.jpg", type = "image/jpeg"): File => new File([new Uint8Array([1, 2, 3])], name, {type});

/** Class double whose `load` event fires on the next microtask after `src` is set. */
class LoadingImage {
  public width = 20;
  public height = 10;
  private readonly listeners = new Map<string, () => void>();

  public addEventListener(type: string, listener: () => void): void {
    this.listeners.set(type, listener);
  }

  public set src(_value: string) {
    queueMicrotask(() => this.listeners.get("load")?.());
  }
}

describe("ScanUploadProvider intake and queue management", () => {
  const originalCreateObjectUrl = URL.createObjectURL;
  const originalRevokeObjectUrl = URL.revokeObjectURL;
  const originalImage = globalThis.Image;
  let urlCounter = 0;

  beforeEach(() => {
    vi.clearAllMocks();
    urlCounter = 0;
    URL.createObjectURL = vi.fn(() => `blob:preview-${(urlCounter += 1)}`);
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectUrl;
    URL.revokeObjectURL = originalRevokeObjectUrl;
    globalThis.Image = originalImage;
    vi.restoreAllMocks();
  });

  const renderProvider = () => renderHook(() => useScanUpload(), {wrapper: ScanUploadProvider});

  it("throws a descriptive error when the hook is used outside the provider", () => {
    expect(() => renderHook(() => useScanUpload())).toThrow("useScanUpload must be used within a ScanUploadProvider");
  });

  it("rejects a jpg whose browser MIME type is unsupported with an unsupported-type toast", async () => {
    const {result} = renderProvider();

    await act(async () => {
      await result.current.addFiles([jpeg("scan.jpg", "application/octet-stream")]);
    });

    expect(notify.error).toHaveBeenCalledTimes(1);
    expect(String(vi.mocked(notify.error).mock.calls[0]?.[0])).toContain("unsupportedType");
    expect(notify.success).not.toHaveBeenCalled();
    expect(result.current.pendingUploads).toHaveLength(0);
  });

  it("rejects a file with an unsupported extension and toasts with a per-file id", async () => {
    const {result} = renderProvider();

    await act(async () => {
      await result.current.addFiles([jpeg("notes.txt", "text/plain")]);
    });

    expect(notify.error).toHaveBeenCalledTimes(1);
    expect(String(vi.mocked(notify.error).mock.calls[0]?.[0])).toContain("unsupportedExtension");
    expect(vi.mocked(notify.error).mock.calls[0]?.[1]).toEqual({
      id: "scan-upload-rejected:unsupported-extension:notes.txt",
    });
    expect(result.current.pendingUploads).toHaveLength(0);
  });

  it("accepts valid files, creates previews and toasts, while still rejecting the invalid sibling", async () => {
    const {result} = renderProvider();

    await act(async () => {
      await result.current.addFiles([jpeg("a.jpg"), jpeg("bad.txt", "text/plain")], "drop");
    });

    expect(result.current.pendingUploads).toHaveLength(1);
    expect(result.current.pendingUploads[0]).toMatchObject({
      name: "a.jpg",
      mimeType: "image/jpeg",
      status: "idle",
      preview: "blob:preview-1",
    });
    expect(notify.success).toHaveBeenCalledTimes(1);
    expect(String(vi.mocked(notify.success).mock.calls[0]?.[0])).toContain("filesAdded");
    expect(notify.error).toHaveBeenCalledTimes(1);
  });

  it("removes only the requested idle file and revokes its preview", async () => {
    const {result} = renderProvider();
    await act(async () => {
      await result.current.addFiles([jpeg("a.jpg"), jpeg("b.jpg")]);
    });
    const [first, second] = result.current.pendingUploads;

    act(() => {
      result.current.removeFiles([first!.id]);
    });

    expect(result.current.pendingUploads.map((upload) => upload.id)).toEqual([second!.id]);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(first!.preview);
  });

  it("does not revoke previews for ids that are not in the queue", async () => {
    const {result} = renderProvider();
    await act(async () => {
      await result.current.addFiles([jpeg("a.jpg")]);
    });

    act(() => {
      result.current.removeFiles(["missing-id"]);
    });

    expect(result.current.pendingUploads).toHaveLength(1);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });

  it("clears every removable file, revokes previews and toasts", async () => {
    const {result} = renderProvider();
    await act(async () => {
      await result.current.addFiles([jpeg("a.jpg"), jpeg("b.jpg")]);
    });
    const previews = result.current.pendingUploads.map((upload) => upload.preview);

    act(() => {
      result.current.clearAll();
    });

    expect(result.current.pendingUploads).toHaveLength(0);
    expect(vi.mocked(URL.revokeObjectURL).mock.calls.map((call) => call[0])).toEqual(previews);
    expect(notify.info).toHaveBeenCalledTimes(1);
    expect(String(vi.mocked(notify.info).mock.calls[0]?.[0])).toContain("allFilesCleared");
  });

  it("renames only the targeted file", async () => {
    const {result} = renderProvider();
    await act(async () => {
      await result.current.addFiles([jpeg("a.jpg"), jpeg("b.jpg")]);
    });
    const [first, second] = result.current.pendingUploads;

    act(() => {
      result.current.renameFile(first!.id, "renamed.jpg");
    });

    expect(result.current.pendingUploads.find((upload) => upload.id === first!.id)?.name).toBe("renamed.jpg");
    expect(result.current.pendingUploads.find((upload) => upload.id === second!.id)?.name).toBe("b.jpg");
  });

  it("ignores a rotate request for an unknown id without toasting", async () => {
    const {result} = renderProvider();
    await act(async () => {
      await result.current.addFiles([jpeg("a.jpg")]);
    });
    const before = result.current.pendingUploads[0];

    await act(async () => {
      await result.current.rotateFile("missing-id", "cw");
    });

    expect(notify.error).not.toHaveBeenCalled();
    expect(result.current.pendingUploads[0]).toBe(before);
  });

  it("toasts a rotate failure for an idle PDF and leaves the file untouched", async () => {
    const {result} = renderProvider();
    await act(async () => {
      await result.current.addFiles([new File([new Uint8Array([1])], "doc.pdf", {type: "application/pdf"})]);
    });
    const before = result.current.pendingUploads[0];

    await act(async () => {
      await result.current.rotateFile(before!.id, "cw");
    });

    expect(notify.error).toHaveBeenCalledTimes(1);
    expect(String(vi.mocked(notify.error).mock.calls[0]?.[0])).toContain("rotateFailed");
    expect(result.current.pendingUploads[0]).toBe(before);
  });

  it("replaces the file, preview and size after rotating an idle image", async () => {
    globalThis.Image = LoadingImage as unknown as typeof Image; // happy-dom Image never fires load
    const drawImage = vi.fn();
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({drawImage, rotate: vi.fn(), translate: vi.fn()})),
      toBlob: vi.fn((callback: BlobCallback) => callback(new Blob([new Uint8Array([9, 9, 9, 9, 9])], {type: "image/jpeg"}))),
    } as unknown as HTMLCanvasElement; // documented cast: only the members the rotate helper touches
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string, options?: ElementCreationOptions) =>
      tag === "canvas" ? canvas : originalCreateElement(tag, options),
    );
    const {result} = renderProvider();
    await act(async () => {
      await result.current.addFiles([jpeg("a.jpg")]);
    });
    const before = result.current.pendingUploads[0];

    await act(async () => {
      await result.current.rotateFile(before!.id, "ccw");
    });

    const after = result.current.pendingUploads[0];
    expect(drawImage).toHaveBeenCalledTimes(1);
    expect(after?.id).toBe(before?.id);
    expect(after?.size).toBe(5);
    expect(after?.preview).not.toBe(before?.preview);
    expect(after?.file).not.toBe(before?.file);
    expect(notify.error).not.toHaveBeenCalled();
  });
});

describe("ScanUploadProvider uploadAll", () => {
  const originalCreateObjectUrl = URL.createObjectURL;
  const originalRevokeObjectUrl = URL.revokeObjectURL;

  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => "blob:upload-preview");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectUrl;
    URL.revokeObjectURL = originalRevokeObjectUrl;
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const renderProvider = () => renderHook(() => useScanUpload(), {wrapper: ScanUploadProvider});

  it("marks the file failed, toasts the failure and lets the failed file be removed", async () => {
    vi.mocked(createScanUploadTarget).mockResolvedValue(failedTarget);
    vi.mocked(createScan).mockResolvedValue({success: false, error: {code: "SERVER_ERROR", message: "fallback failed"}});
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const {result} = renderProvider();
    await act(async () => {
      await result.current.addFiles([jpeg("a.jpg")]);
    });
    vi.mocked(notify.success).mockClear();

    await act(async () => {
      await result.current.uploadAll();
    });

    expect(createScanUploadTarget).toHaveBeenCalledTimes(3);
    expect(createScan).toHaveBeenCalledTimes(3);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.pendingUploads).toHaveLength(1);
    expect(result.current.pendingUploads[0]?.status).toBe("failed");
    expect(notify.error).toHaveBeenCalledTimes(1);
    expect(String(vi.mocked(notify.error).mock.calls[0]?.[0])).toContain("uploadFailed");
    expect(notify.success).not.toHaveBeenCalled();

    act(() => {
      result.current.removeFiles([result.current.pendingUploads[0]!.id]);
    });

    expect(result.current.pendingUploads).toHaveLength(0);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:upload-preview");
  });

  it("uploads directly, toasts success and removes the completed card after the delay", async () => {
    vi.mocked(createScanUploadTarget).mockResolvedValue(successfulTarget);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, {status: 201})));
    vi.useFakeTimers({toFake: ["setTimeout", "clearTimeout"]});
    const {result} = renderProvider();
    await act(async () => {
      await result.current.addFiles([jpeg("a.jpg")]);
    });
    vi.mocked(notify.success).mockClear();

    await act(async () => {
      await result.current.uploadAll();
    });

    expect(createScan).not.toHaveBeenCalled();
    expect(notify.error).not.toHaveBeenCalled();
    expect(notify.success).toHaveBeenCalledTimes(1);
    expect(String(vi.mocked(notify.success).mock.calls[0]?.[0])).toContain("uploadSucceeded");
    expect(result.current.pendingUploads[0]?.status).toBe("completed");
    expect(result.current.completedBatch).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(1);

    await act(async () => {
      await result.current.rotateFile(result.current.pendingUploads[0]!.id, "cw");
    });
    expect(notify.error).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.pendingUploads).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("resets session statistics and clears the completed batch after a successful upload", async () => {
    vi.mocked(createScanUploadTarget).mockResolvedValue(successfulTarget);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, {status: 201})));
    vi.useFakeTimers({toFake: ["setTimeout", "clearTimeout"]});
    const {result} = renderProvider();
    await act(async () => {
      await result.current.addFiles([jpeg("a.jpg")]);
    });
    await act(async () => {
      await result.current.uploadAll();
    });
    expect(result.current.sessionStats.totalCompleted).toBe(1);
    expect(result.current.completedBatch).toHaveLength(1);

    act(() => {
      result.current.clearCompletedBatch();
    });
    expect(result.current.completedBatch).toEqual([]);
    expect(result.current.sessionStats.totalCompleted).toBe(1);

    act(() => {
      result.current.resetSessionStats();
    });
    expect(result.current.sessionStats.totalCompleted).toBe(0);
    expect(result.current.sessionStats.totalAdded).toBe(0);
  });

  it("cancels pending removal timers when the provider unmounts", async () => {
    vi.mocked(createScanUploadTarget).mockResolvedValue(successfulTarget);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, {status: 201})));
    vi.useFakeTimers({toFake: ["setTimeout", "clearTimeout"]});
    const {result, unmount} = renderProvider();
    await act(async () => {
      await result.current.addFiles([jpeg("a.jpg")]);
    });
    await act(async () => {
      await result.current.uploadAll();
    });
    expect(vi.getTimerCount()).toBe(1);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });

  it("ignores rotate requests while the file is uploading", async () => {
    let releaseTarget: (value: UploadTarget) => void = () => undefined;
    vi.mocked(createScanUploadTarget).mockReturnValue(
      new Promise<UploadTarget>((resolve) => {
        releaseTarget = resolve;
      }),
    );
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, {status: 201})));
    const {result} = renderProvider();
    await act(async () => {
      await result.current.addFiles([jpeg("a.jpg")]);
    });

    let upload: Promise<void> = Promise.resolve();
    act(() => {
      upload = result.current.uploadAll();
    });
    await waitFor(() => expect(result.current.pendingUploads[0]?.status).toBe("uploading"));

    await act(async () => {
      await result.current.rotateFile(result.current.pendingUploads[0]!.id, "cw");
    });
    expect(notify.error).not.toHaveBeenCalled();

    await act(async () => {
      releaseTarget(successfulTarget);
      await upload;
    });
    expect(result.current.pendingUploads[0]?.status).toBe("completed");
  });
});
