/**
 * @fileoverview Unit tests for upload status presentation descriptors.
 * @module app/domains/invoices/upload-scans/_components/statusDescriptors.test
 */

import {describe, expect, it} from "vitest";
import {describeUploadStatus} from "./statusDescriptors";

describe("describeUploadStatus", () => {
  it("maps idle to a pending, unlocked, no-overlay descriptor", () => {
    expect(describeUploadStatus("idle")).toEqual({badgeStatusKey: "pending", isLocked: false, showProgress: false, overlay: null});
  });

  it("locks and shows progress + spinner while uploading and retrying", () => {
    expect(describeUploadStatus("uploading")).toEqual({badgeStatusKey: "uploading", isLocked: true, showProgress: true, overlay: "spinner"});
    expect(describeUploadStatus("retrying")).toEqual({badgeStatusKey: "retrying", isLocked: true, showProgress: true, overlay: "spinner"});
  });

  it("locks completed with a success overlay and no progress", () => {
    expect(describeUploadStatus("completed")).toEqual({badgeStatusKey: "completed", isLocked: true, showProgress: false, overlay: "success"});
  });

  it("leaves failed unlocked with an error overlay", () => {
    expect(describeUploadStatus("failed")).toEqual({badgeStatusKey: "failed", isLocked: false, showProgress: false, overlay: "error"});
  });
});
