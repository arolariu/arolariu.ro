import {act, renderHook} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {attachInvoiceScan} from "@/lib/actions/invoices/attachInvoiceScan";
import {createInvoiceScan} from "@/lib/actions/invoices/createInvoiceScan";
import {InvoiceScanType} from "@/types/invoices";
import {toast} from "@arolariu/components";
import {useScanAdd} from "./useScanAdd";

vi.mock("@/lib/actions/invoices/createInvoiceScan", () => ({
  createInvoiceScan: vi.fn(),
}));

vi.mock("@/lib/actions/invoices/attachInvoiceScan", () => ({
  attachInvoiceScan: vi.fn(),
}));

vi.mock("@arolariu/components", () => ({
  toast: {success: vi.fn(), error: vi.fn()},
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Readonly<Record<string, string | number>>): string =>
    values ? `${key}:${JSON.stringify(values)}` : key,
}));

const scanFile = new Blob(["fake"], {type: "image/png"});
const scanArgs = {
  file: scanFile,
  fileName: "receipt.png",
  userIdentifier: "user-1",
  type: InvoiceScanType.PNG,
} as const;

describe("useScanAdd", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uploads the file, attaches the scan, and shows a success toast", async () => {
    vi.mocked(createInvoiceScan).mockResolvedValueOnce({status: 201, blobUrl: "blob://x"});
    vi.mocked(attachInvoiceScan).mockResolvedValueOnce(undefined);

    const {result} = renderHook(() => useScanAdd("inv-1"));

    await act(async () => {
      await result.current.performAdd(scanArgs);
    });

    expect(createInvoiceScan).toHaveBeenCalledWith({
      base64Data: "data:image/png;base64,ZmFrZQ==",
      blobName: expect.stringMatching(/^user-1\/inv-1\/.+\.png$/),
      metadata: {
        invoiceId: "inv-1",
        uploadedAt: expect.any(String),
      },
    });
    expect(attachInvoiceScan).toHaveBeenCalledWith({
      invoiceId: "inv-1",
      payload: {
        type: InvoiceScanType.PNG,
        location: "blob://x",
        additionalMetadata: {
          originalFileName: "receipt.png",
          uploadedAt: expect.any(String),
        },
      },
    });
    expect(toast.success).toHaveBeenCalledWith("addSuccess");
  });

  it("does not attach the scan and reports an error when upload returns non-201", async () => {
    vi.mocked(createInvoiceScan).mockResolvedValueOnce({status: 500, blobUrl: ""});

    const {result} = renderHook(() => useScanAdd("inv-1"));

    let caught: unknown;
    await act(async () => {
      try {
        await result.current.performAdd(scanArgs);
      } catch (error) {
        caught = error;
      }
    });

    expect(caught).toBeInstanceOf(Error);
    expect(caught).toMatchObject({message: 'uploadFailed:{"status":500}'});
    expect(attachInvoiceScan).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("addError", {description: 'uploadFailed:{"status":500}'});
  });

  it("reports and rethrows attach failures", async () => {
    vi.mocked(createInvoiceScan).mockResolvedValueOnce({status: 201, blobUrl: "blob://x"});
    vi.mocked(attachInvoiceScan).mockRejectedValueOnce(new Error("attach failed"));

    const {result} = renderHook(() => useScanAdd("inv-1"));

    let caught: unknown;
    await act(async () => {
      try {
        await result.current.performAdd(scanArgs);
      } catch (error) {
        caught = error;
      }
    });

    expect(caught).toBeInstanceOf(Error);
    expect(caught).toMatchObject({message: "attach failed"});
    expect(toast.error).toHaveBeenCalledWith("addError", {description: "attach failed"});
  });

  it("uses jpg as the fallback blob extension when the file name has no extension", async () => {
    vi.mocked(createInvoiceScan).mockResolvedValueOnce({status: 201, blobUrl: "blob://x"});
    vi.mocked(attachInvoiceScan).mockResolvedValueOnce(undefined);

    const {result} = renderHook(() => useScanAdd("inv-1"));

    await act(async () => {
      await result.current.performAdd({...scanArgs, fileName: ""});
    });

    expect(createInvoiceScan).toHaveBeenCalledWith(
      expect.objectContaining({
        blobName: expect.stringMatching(/^user-1\/inv-1\/.+\.jpg$/),
      }),
    );
  });

  it("reports FileReader failures", async () => {
    vi.spyOn(FileReader.prototype, "readAsDataURL").mockImplementationOnce(function readAsDataURL(this: FileReader): void {
      this.dispatchEvent(new ProgressEvent("error"));
    });

    const {result} = renderHook(() => useScanAdd("inv-1"));

    let caught: unknown;
    await act(async () => {
      try {
        await result.current.performAdd(scanArgs);
      } catch (error) {
        caught = error;
      }
    });

    expect(caught).toBeNull();
    expect(createInvoiceScan).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("addError", {description: "null"});
  });
});
