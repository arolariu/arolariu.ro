/**
 * @fileoverview Privacy tests for structured telemetry-log serialization.
 * @module lib/telemetry/logSanitizer.test
 */

import {describe, expect, it} from "vitest";
import {sanitizeLogAttributes, sanitizeLogMessage} from "./logSanitizer";

describe("telemetry log sanitizer", () => {
  it("retains bounded, low-cardinality operational attributes", () => {
    expect(
      sanitizeLogAttributes({
        count: 3,
        httpStatus: 503,
        errorCode: "SERVER_ERROR",
        status: "rejected",
        "user.authenticated": true,
      }),
    ).toEqual({
      count: 3,
      httpStatus: 503,
      errorCode: "SERVER_ERROR",
      status: "rejected",
      "user.authenticated": true,
    });
  });

  it("drops a non-code error value even when the key is allowlisted", () => {
    expect(sanitizeLogAttributes({errorCode: "provider exception included a SAS URL"})).toEqual({});
  });

  it("removes sensitive keys and unsafe values before serialization", () => {
    const attributes = sanitizeLogAttributes({
      userIdentifier: "user-123",
      scanId: "scan-123",
      ownerId: "owner-123",
      blobName: "scans/user-123/private.jpg",
      location: "https://storage.example.test/invoices/private.jpg?sig=secret",
      error: new Error("provider response with private details"),
      errorCode: "NETWORK_ERROR",
    });

    const serialized = JSON.stringify(attributes);
    for (const sensitiveValue of [
      "user-123",
      "scan-123",
      "owner-123",
      "private.jpg",
      "storage.example.test",
      "secret",
      "provider response",
    ]) {
      expect(serialized).not.toContain(sensitiveValue);
    }
    expect(attributes).toEqual({errorCode: "NETWORK_ERROR"});
  });

  it("redacts raw exception, URL, and token content from messages", () => {
    expect(sanitizeLogMessage("failed https://storage.example.test/blob?sig=secret")).toBe("telemetry.event.redacted");
    expect(sanitizeLogMessage("token bearer secret")).toBe("telemetry.event.redacted");
    expect(sanitizeLogMessage("scan.fetch.complete")).toBe("scan.fetch.complete");
  });
});
