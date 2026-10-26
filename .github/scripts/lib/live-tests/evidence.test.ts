import * as native from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {collectLiveEvidence} from "./evidence.ts";
import {readLiveConfiguration} from "./config.ts";

vi.mock("node:fs/promises", {spy: true});
let directory: string;
beforeEach(async () => {
  directory = await native.mkdtemp(join(tmpdir(), "live-evidence-"));
  vi.clearAllMocks();
});
afterEach(async () => {
  await native.rm(directory, {recursive: true, force: true});
});

describe("bounded indexed live evidence", () => {
  it("traverses each directory once and reads a log once for all insights", async () => {
    await native.mkdir(join(directory, "nested"));
    const file = join(directory, "nested", "e2e-frontend.log");
    await native.writeFile(file, "log content");
    const configuration = readLiveConfiguration({
      TARGETS: '["frontend"]',
      ARTIFACTS_DIR: directory,
      FRONTEND_STATUS: "failure",
      E2E_TEST_TEMPLATE_PATH: join(directory, "missing.md"),
    });
    const evidence = await collectLiveEvidence(configuration);
    expect(evidence.logs.frontend).toBeDefined();
    expect(vi.mocked(native.readdir).mock.calls.filter((call) => String(call[0]) === directory)).toHaveLength(1);
    expect(vi.mocked(native.readdir).mock.calls.filter((call) => String(call[0]) === join(directory, "nested"))).toHaveLength(1);
    expect(vi.mocked(native.open).mock.calls.filter((call) => String(call[0]) === file)).toHaveLength(1);
  });
  it("reports oversized input explicitly and redacts before excerpt truncation", async () => {
    await native.writeFile(join(directory, "e2e-frontend.log"), "Authorization: Bearer opaque-sensitive-value\n" + "tail ".repeat(100));
    const configuration = readLiveConfiguration({
      TARGETS: '["frontend"]',
      ARTIFACTS_DIR: directory,
      FRONTEND_STATUS: "failure",
      E2E_TEST_TEMPLATE_PATH: join(directory, "missing.md"),
    });
    const oversized = await collectLiveEvidence({...configuration, maxLogBytes: 8});
    expect(oversized.diagnostics.some((issue) => issue.code === "oversized-evidence")).toBe(true);
    const bounded = await collectLiveEvidence({...configuration, maxLogTailChars: 80});
    expect(bounded.logs.frontend?.excerpt).not.toContain("opaque-sensitive-value");
    expect(bounded.logs.frontend?.excerpt.length).toBeLessThanOrEqual(80);
  });
});
