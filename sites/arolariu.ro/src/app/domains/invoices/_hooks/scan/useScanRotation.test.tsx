/**
 * @fileoverview Unit tests for useScanRotation client hook.
 * @module app/domains/invoices/_hooks/scan/useScanRotation.test
 */

import {act, renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import type {ServerActionResult} from "@/lib/utils.server";
import {ScanType} from "@/types/scans";
import {buildCachedScan} from "../../../../../../tests/helpers/invoiceDomain";
import {useScanRotation} from "./useScanRotation";

vi.mock("@/stores", () => ({
  useScansStore: vi.fn(),
}));

vi.mock("../../_actions/scans", () => ({
  updateScan: vi.fn(),
}));

vi.mock("@arolariu/components", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("next-intl-selector", () => ({
  useTranslations: vi.fn(() => (fn: (m: {
    pages: {
      invoices: {
        viewScans: {
          scanCard: {
            actions: {
              rotateUnsupported: string;
              rotateSuccess: string;
              rotateError: string;
            };
          };
        };
      };
    };
  }) => string) => fn({
    pages: {
      invoices: {
        viewScans: {
          scanCard: {
            actions: {
              rotateUnsupported: "Rotation unsupported",
              rotateSuccess: "Scan rotated",
              rotateError: "Scan rotation failed",
            },
          },
        },
      },
    },
  })),
}));

const {useScansStore} = await import("@/stores");
const {updateScan} = await import("../../_actions/scans");
const {toast} = await import("@arolariu/components");

const mockUseScansStore = vi.mocked(useScansStore);
const mockUpdateScan = vi.mocked(updateScan);
const mockToast = vi.mocked(toast);

type CanvasHarness = Readonly<{
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  toBlob: ReturnType<typeof vi.fn>;
  getContext: ReturnType<typeof vi.fn>;
}>;

function dispatchStoredListener(listener: EventListenerOrEventListenerObject | undefined, event: Event): void {
  if (typeof listener === "function") {
    listener(event);
    return;
  }
  listener?.handleEvent(event);
}

function stubImageLoad(mode: "load" | "error" = "load"): void {
  class MockImage {
    public width = 640;
    public height = 480;
    private readonly listeners = new Map<string, EventListenerOrEventListenerObject>();

    public addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
      this.listeners.set(type, listener);
    }

    public set src(_value: string) {
      queueMicrotask(() => {
        dispatchStoredListener(this.listeners.get(mode), new Event(mode));
      });
    }
  }

  vi.stubGlobal("Image", MockImage as unknown as typeof Image);
}

function stubFileReader(mode: "loadend" | "error" = "loadend"): void {
  class MockFileReader {
    public result: string | ArrayBuffer | null = mode === "loadend" ? "data:image/jpeg;base64,cm90YXRlZA==" : null;
    private readonly listeners = new Map<string, EventListenerOrEventListenerObject>();

    public addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
      this.listeners.set(type, listener);
    }

    public readAsDataURL(): void {
      queueMicrotask(() => {
        dispatchStoredListener(this.listeners.get(mode), new Event(mode));
      });
    }
  }

  vi.stubGlobal("FileReader", MockFileReader as unknown as typeof FileReader);
}

function stubCanvas(options: Readonly<{
  hasContext?: boolean;
  emitsBlob?: boolean;
}> = {}): CanvasHarness {
  const context = {
    translate: vi.fn(),
    rotate: vi.fn(),
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
  const toBlob = vi.fn((callback: BlobCallback) => {
    callback(options.emitsBlob === false ? null : new Blob(["rotated"], {type: "image/jpeg"}));
  });
  const getContext = vi.fn(() => (options.hasContext === false ? null : context));
  const canvas = {
    width: 0,
    height: 0,
    getContext,
    toBlob,
  } as unknown as HTMLCanvasElement;
  vi.spyOn(document, "createElement").mockImplementation((tagName: string): HTMLElement => {
    if (tagName === "canvas") {
      return canvas;
    }
    return Document.prototype.createElement.call(document, tagName);
  });

  return {canvas, context, toBlob, getContext};
}

describe("useScanRotation", () => {
  const rotatedUrl = "https://storage.test/invoices/scans/user-1/receipt-rotated.jpg";
  const testScan = buildCachedScan({
    id: "scan-rotate",
    blobUrl: "https://storage.test/invoices/scans/user-1/receipt.jpg",
    mimeType: "image/jpeg",
    scanType: ScanType.JPEG,
  });
  const mockUpdateScanBlobUrl = vi.fn();
  const mockFetch = vi.fn<(...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>>();
  const mockCreateObjectURL = vi.fn(() => "blob:scan-object");
  const mockRevokeObjectURL = vi.fn();
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", mockFetch);
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: mockCreateObjectURL,
      revokeObjectURL: mockRevokeObjectURL,
    });
    vi.spyOn(Date, "now").mockReturnValue(123_456);
    stubImageLoad();
    stubFileReader();
    stubCanvas();
    mockFetch.mockResolvedValue({
      blob: vi.fn(async () => new Blob(["source"], {type: "image/jpeg"})),
    } as unknown as Response);
    mockUseScansStore.mockImplementation(((selector: (state: {
      updateScanBlobUrl: typeof mockUpdateScanBlobUrl;
    }) => typeof mockUpdateScanBlobUrl) => selector({
      updateScanBlobUrl: mockUpdateScanBlobUrl,
    })) as never);
    mockUpdateScan.mockResolvedValue({
      success: true,
      data: {blobUrl: rotatedUrl},
    } satisfies ServerActionResult<{blobUrl: string}>);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns idle state and callback", () => {
    const {result} = renderHook(() => useScanRotation(testScan));

    expect(result.current.isRotating).toBe(false);
    expect(typeof result.current.rotateScanCallback).toBe("function");
  });

  it("rejects scans without blob URLs before starting rotation", async () => {
    const {result} = renderHook(() => useScanRotation(buildCachedScan({blobUrl: ""})));

    await act(async () => {
      await result.current.rotateScanCallback("cw");
    });

    expect(mockToast.error).toHaveBeenCalledWith("Rotation unsupported");
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.isRotating).toBe(false);
  });

  it("rejects PDF scans before starting rotation", async () => {
    const pdfScan = buildCachedScan({
      mimeType: "application/pdf",
      scanType: ScanType.PDF,
    });
    const {result} = renderHook(() => useScanRotation(pdfScan));

    await act(async () => {
      await result.current.rotateScanCallback("ccw");
    });

    expect(mockToast.error).toHaveBeenCalledWith("Rotation unsupported");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("rotates clockwise, uploads the JPEG, and cache-busts the local scan URL", async () => {
    const harness = stubCanvas();
    const {result} = renderHook(() => useScanRotation(testScan));

    await act(async () => {
      await result.current.rotateScanCallback("cw");
    });

    expect(mockFetch).toHaveBeenCalledWith(testScan.blobUrl);
    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(harness.canvas.width).toBe(480);
    expect(harness.canvas.height).toBe(640);
    expect(harness.context.translate).toHaveBeenCalledWith(240, 320);
    expect(harness.context.rotate).toHaveBeenCalledWith(Math.PI / 2);
    expect(harness.context.drawImage).toHaveBeenCalled();
    expect(harness.toBlob).toHaveBeenCalledWith(expect.any(Function), "image/jpeg", 0.92);
    expect(mockUpdateScan).toHaveBeenCalledWith({
      base64Data: "cm90YXRlZA==",
      blobName: "scans/user-1/receipt.jpg",
      mimeType: "image/jpeg",
      metadata: {rotated: "true"},
    });
    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:scan-object");
    expect(mockUpdateScanBlobUrl).toHaveBeenCalledWith(testScan.id, `${rotatedUrl}?t=123456`);
    expect(mockToast.success).toHaveBeenCalledWith("Scan rotated");
    expect(result.current.isRotating).toBe(false);
  });

  it("rotates counterclockwise with a negative right-angle rotation", async () => {
    const harness = stubCanvas();
    const {result} = renderHook(() => useScanRotation(testScan));

    await act(async () => {
      await result.current.rotateScanCallback("ccw");
    });

    expect(harness.context.rotate).toHaveBeenCalledWith(-Math.PI / 2);
    expect(mockUpdateScanBlobUrl).toHaveBeenCalledWith(testScan.id, `${rotatedUrl}?t=123456`);
  });

  it("sets isRotating true while fetch is pending", async () => {
    let resolveFetch: ((value: Response) => void) | undefined;
    mockFetch.mockReturnValue(new Promise((resolve) => {
      resolveFetch = resolve;
    }));
    const {result} = renderHook(() => useScanRotation(testScan));

    let pendingRotation: Promise<void> | undefined;
    act(() => {
      pendingRotation = result.current.rotateScanCallback("cw");
    });

    await waitFor(() => {
      expect(result.current.isRotating).toBe(true);
    });

    await act(async () => {
      resolveFetch?.({
        blob: vi.fn(async () => new Blob(["source"], {type: "image/jpeg"})),
      } as unknown as Response);
      await pendingRotation;
    });

    expect(result.current.isRotating).toBe(false);
  });

  it("shows an error and skips store updates when upload returns failure", async () => {
    mockUpdateScan.mockResolvedValue({
      success: false,
      error: {message: "upload failed"},
    });
    const {result} = renderHook(() => useScanRotation(testScan));

    await act(async () => {
      await result.current.rotateScanCallback("cw");
    });

    expect(mockToast.error).toHaveBeenCalledWith("Scan rotation failed");
    expect(mockUpdateScanBlobUrl).not.toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:scan-object");
  });

  it("handles fetch failures", async () => {
    const fetchError = new Error("fetch failed");
    mockFetch.mockRejectedValue(fetchError);
    const {result} = renderHook(() => useScanRotation(testScan));

    await act(async () => {
      await result.current.rotateScanCallback("cw");
    });

    expect(mockToast.error).toHaveBeenCalledWith("Scan rotation failed");
    expect(consoleErrorSpy).toHaveBeenCalledWith("Error rotating scan:", fetchError);
    expect(mockUpdateScanBlobUrl).not.toHaveBeenCalled();
    expect(result.current.isRotating).toBe(false);
  });

  it("handles image load failures", async () => {
    stubImageLoad("error");
    const {result} = renderHook(() => useScanRotation(testScan));

    await act(async () => {
      await result.current.rotateScanCallback("cw");
    });

    expect(mockToast.error).toHaveBeenCalledWith("Scan rotation failed");
    expect(consoleErrorSpy).toHaveBeenCalledWith("Error rotating scan:", expect.any(Error));
    expect(mockUpdateScan).not.toHaveBeenCalled();
  });

  it("handles missing canvas context", async () => {
    stubCanvas({hasContext: false});
    const {result} = renderHook(() => useScanRotation(testScan));

    await act(async () => {
      await result.current.rotateScanCallback("cw");
    });

    expect(mockToast.error).toHaveBeenCalledWith("Scan rotation failed");
    expect(mockUpdateScan).not.toHaveBeenCalled();
  });

  it("handles canvas blob conversion failures", async () => {
    stubCanvas({emitsBlob: false});
    const {result} = renderHook(() => useScanRotation(testScan));

    await act(async () => {
      await result.current.rotateScanCallback("cw");
    });

    expect(mockToast.error).toHaveBeenCalledWith("Scan rotation failed");
    expect(mockUpdateScan).not.toHaveBeenCalled();
  });

  it("handles FileReader failures while encoding the rotated blob", async () => {
    stubFileReader("error");
    const {result} = renderHook(() => useScanRotation(testScan));

    await act(async () => {
      await result.current.rotateScanCallback("cw");
    });

    expect(mockToast.error).toHaveBeenCalledWith("Scan rotation failed");
    expect(mockUpdateScan).not.toHaveBeenCalled();
  });
});
