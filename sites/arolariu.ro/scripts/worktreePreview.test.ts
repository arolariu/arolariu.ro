// @vitest-environment node

import {mkdirSync, mkdtempSync, rmdirSync, unlinkSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach, describe, expect, it, vi} from "vitest";

import {getBaseURL, getEnvironmentConfig} from "../tests/config/environment";
import {createWorktreeWebServer} from "./worktreePreview";

afterEach(() => vi.unstubAllEnvs());

describe("website worktree preview", () => {
  function setLocalEnvironment(port: string | undefined): void {
    vi.stubEnv("E2E_WORKTREE_PORT", port);
    vi.stubEnv("BASE_URL", undefined);
    vi.stubEnv("TEST_ENV", undefined);
    vi.stubEnv("CI", undefined);
    vi.stubEnv("E2E_USE_PROD", undefined);
  }

  it("uses the owned loopback origin instead of the default website server", () => {
    setLocalEnvironment("3101");

    expect(getBaseURL()).toBe("https://127.0.0.1:3101");
    expect(getEnvironmentConfig().reuseExistingServer).toBe(false);
  });

  it.each(["", " 3101", "3101x", "3101\n", "0", "1023", "65536"])("rejects invalid port %j", (port) => {
    setLocalEnvironment(port);

    expect(() => getBaseURL()).toThrow(/E2E_WORKTREE_PORT/u);
  });

  it.each([
    ["CI", "true"],
    ["E2E_USE_PROD", "true"],
    ["TEST_ENV", "production"],
    ["TEST_ENV", "typo"],
    ["BASE_URL", "https://example.test"],
  ])("rejects an owned preview with %s=%s", (key, value) => {
    setLocalEnvironment("3101");
    vi.stubEnv(key, value);

    expect(() => getBaseURL()).toThrow(/E2E_WORKTREE_PORT/u);
  });

  it("preserves the existing local URL and server reuse when not opted in", () => {
    setLocalEnvironment(undefined);

    expect(getBaseURL()).toBe("https://localhost:3000");
    expect(getEnvironmentConfig().reuseExistingServer).toBe(true);
  });

  it("does not start Next certificate generation when the checkout lacks a certificate", () => {
    expect(() =>
      createWorktreeWebServer({hostname: "127.0.0.1", port: 3101, baseURL: "https://127.0.0.1:3101"}, join(tmpdir(), "missing-checkout")),
    ).toThrow(/E2E_WORKTREE_PORT requires certificates\/localhost-key\.pem/u);
  });

  it("waits for its own Next process instead of accepting a response from the port", () => {
    const root = mkdtempSync(join(tmpdir(), "website preview "));
    const directory = join(root, "certificates");
    const key = join(directory, "localhost-key.pem");
    const cert = join(directory, "localhost.pem");
    mkdirSync(directory);
    writeFileSync(key, "fixture");
    writeFileSync(cert, "fixture");
    try {
      const config = createWorktreeWebServer({hostname: "127.0.0.1", port: 3101, baseURL: "https://127.0.0.1:3101"}, root);

      expect(config).toMatchObject({cwd: root, reuseExistingServer: false, wait: {stdout: expect.any(RegExp)}});
      expect(config).not.toHaveProperty("url");
      expect(config).not.toHaveProperty("port");
      expect(config).toHaveProperty("command", expect.stringContaining("--hostname 127.0.0.1 --port 3101"));
    } finally {
      unlinkSync(key);
      unlinkSync(cert);
      rmdirSync(directory);
      rmdirSync(root);
    }
  });
});
