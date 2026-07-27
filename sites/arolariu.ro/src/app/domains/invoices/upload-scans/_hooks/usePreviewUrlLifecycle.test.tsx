/**
 * @fileoverview Unit tests for upload preview URL lifecycle.
 * @module app/domains/invoices/upload-scans/_hooks/usePreviewUrlLifecycle.test
 */

import {renderHook} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {usePreviewUrlLifecycle} from "./usePreviewUrlLifecycle";
import type {PendingUpload} from "../_types";

/**
 * Creates a pending upload with a configurable preview URL.
 *
 * @param id - Upload identifier.
 * @param preview - Preview URL to expose to the hook.
 * @returns Pending upload fixture.
 */
function createUpload(id: string, preview: string): PendingUpload {
  const file = new File(["data"], `${id}.jpg`, {type: "image/jpeg"});
  return {
    id,
    name: `${id}.jpg`,
    file,
    mimeType: "image/jpeg",
    size: file.size,
    preview,
    status: "idle",
    progress: 0,
    attempts: 0,
  };
}

describe("usePreviewUrlLifecycle", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("revokes blob URLs once and ignores non-blob previews", () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const {result, unmount} = renderHook(() => usePreviewUrlLifecycle([createUpload("one", "blob:one")]));

    result.current.revokePreviewUrl("blob:one");
    result.current.revokePreviewUrl("blob:one");
    result.current.revokePreviewUrl("https://storage/one.jpg");

    expect(revoke).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalledWith("blob:one");

    unmount();
  });

  it("revokes current upload previews on unmount", () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const {unmount} = renderHook(() => usePreviewUrlLifecycle([createUpload("one", "blob:one"), createUpload("two", "blob:two")]));

    unmount();

    expect(revoke).toHaveBeenCalledWith("blob:one");
    expect(revoke).toHaveBeenCalledWith("blob:two");
  });
});
