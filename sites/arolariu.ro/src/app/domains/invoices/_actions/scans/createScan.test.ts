import {installAnalysisFetchHandler} from "@/../tests/helpers/analysisBoundary";
import {ScanType} from "@/types/scans";
import {describe, expect, it, vi} from "vitest";
import {createScan} from "./createScan";

describe("createScan", () => {
  it("accepts HEIF through the native auth/config and platform-storage boundaries", async () => {
    installAnalysisFetchHandler(() => new Response(null, {status: 500}));

    const result = await createScan({base64Data: "dGVzdA==", fileName: "receipt.heif", mimeType: "image/heif"});

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.scan.scanType).toBe(ScanType.HEIF);
  });

  it("rejects HEIC before auth, storage configuration, or blob upload", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    installAnalysisFetchHandler(() => new Response(null, {status: 500}));

    const result = await createScan({base64Data: "dGVzdA==", fileName: "receipt.heic", mimeType: "image/heic"});

    expect(result).toMatchObject({success: false, error: {code: "VALIDATION_ERROR"}});
    expect(JSON.stringify([result, ...consoleError.mock.calls])).not.toContain("dGVzdA==");
  });
});
