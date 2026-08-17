/**
 * @fileoverview Regression sentinels for honest create-invoice dialog state.
 * @module app/domains/invoices/view-scans/_dialogs/CreateInvoiceDialog.test
 */

import {readFile} from "node:fs/promises";
import {resolve} from "node:path";
import {describe, expect, it} from "vitest";

const workspaceRoot = process.cwd().endsWith("sites\\arolariu.ro") ? resolve(process.cwd(), "..", "..") : process.cwd();
const dialogPath = resolve(workspaceRoot, "sites/arolariu.ro/src/app/domains/invoices/view-scans/_dialogs/CreateInvoiceDialog.tsx");

describe("CreateInvoiceDialog honest async state", () => {
  it("does not synthesize progress, completion stages, or render returned error strings", async () => {
    // Arrange
    const source = await readFile(dialogPath, "utf8");

    // Assert
    expect(source).not.toMatch(/\bprogress\b/iu);
    expect(source).not.toContain("ProcessStep");
    expect(source).not.toMatch(/step[123](Title|Description)/u);
    expect(source).not.toMatch(/error\.(message|error)/u);
    expect(source).not.toContain("err.error");
    expect(source).toContain("aria-busy='true'");
    expect(source).toContain("aria-live='polite'");
    expect(source).toContain("complete.analysisQueued");
    expect(source).toContain('status === "not_queued"');
  });
});
