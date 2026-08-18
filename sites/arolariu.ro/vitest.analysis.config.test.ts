/**
 * @fileoverview Guard tests for real-module analysis Vitest configuration.
 * @module sites/arolariu.ro/vitest.analysis.config.test
 */

import {readFile} from "node:fs/promises";
import {resolve} from "node:path";
import {describe, expect, it} from "vitest";

const configPath = resolve(process.cwd(), "sites/arolariu.ro/vitest.analysis.config.ts");

describe("vitest.analysis.config", () => {
  it("does not alias website-owned analysis modules to test stubs", async () => {
    // Arrange
    const source = await readFile(configPath, "utf8");

    // Assert
    expect(source).not.toContain("@/instrumentation.server");
    expect(source).not.toContain("@/lib/config/configProxy");
    expect(source).not.toContain("@/lib/utils.server");
    expect(source).not.toContain("@/lib/actions/user/fetchUser");
    expect(source).not.toContain("@/lib/azure/storageClient");
    expect(source).not.toContain("@/lib/actions/storage/fetchConfig");
  });
});
