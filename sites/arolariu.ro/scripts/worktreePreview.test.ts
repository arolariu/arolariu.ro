// @vitest-environment node

import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from "node:fs";
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
    try {
      const website = join(root, "sites", "arolariu.ro");
      const certificates = join(website, "certificates");
      mkdirSync(certificates, {recursive: true});
      writeFileSync(join(certificates, "localhost-key.pem"), "fixture");
      writeFileSync(join(certificates, "localhost.pem"), "fixture");
      const preview = {hostname: "127.0.0.1", port: 3101, baseURL: "https://127.0.0.1:3101"} as const;
      expect(() => createWorktreeWebServer(preview, website)).toThrow(/requires Next\.js installed in this checkout/u);

      const hoistedBin = join(root, "node_modules", "next", "dist", "bin");
      mkdirSync(hoistedBin, {recursive: true});
      writeFileSync(join(hoistedBin, "next"), "fixture");
      const config = createWorktreeWebServer(preview, website);

      expect(config).toMatchObject({cwd: website, reuseExistingServer: false, wait: {stdout: expect.any(RegExp)}});
      expect(config).not.toHaveProperty("url");
      expect(config).not.toHaveProperty("port");
      expect(config).toHaveProperty(
        "command",
        expect.stringContaining("../../node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3101"),
      );
      expect(config).toHaveProperty("env.SITE_URL", "https://127.0.0.1:3101");
    } finally {
      rmSync(root, {recursive: true, force: true});
    }
  });
});
