import {execFile} from "node:child_process";
import {mkdtemp, readFile, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {promisify} from "node:util";
import {afterEach, beforeEach, describe, expect, it} from "vitest";
import configuration from "../vitest.config.ts";
import {execChecked} from "../helpers/exec/index.ts";
import {createGitHelper} from "../helpers/git/index.ts";
import {fs} from "../helpers/filesystem/index.ts";
import {record} from "../helpers/reports/validation.ts";
import {context} from "../lib/planning/fixtures/plans.ts";
import {buildHygienePlan} from "../lib/planning/plan.ts";
import {outcome} from "../lib/hygiene/fixtures/outcomes.ts";
import {providerIds} from "../lib/hygiene/registry.ts";
import emptyFixture from "./fixtures/hygiene-known-empty.json" with {type: "json"};
import rerunFixture from "./fixtures/hygiene-rerun.json" with {type: "json"};

const execFileAsync = promisify(execFile);
const hook = new URL("./fixtures/deny-root-runtime.mjs", import.meta.url).href;
const providerEntry = fileURLToPath(new URL("./hygiene/pipeline/runProvider.ts", import.meta.url));
const gateEntry = fileURLToPath(new URL("./hygiene/pipeline/runProjections.ts", import.meta.url));
let root: string;
let sha: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "ci-native-integration-"));
  await execChecked("git", ["init", "-b", "main"], {cwd: root, silent: true});
  await writeFile(join(root, "file.txt"), "fixture");
  await execChecked("git", ["add", "."], {cwd: root, silent: true});
  await execChecked(
    "git",
    ["-c", "user.name=Test", "-c", "user.email=test@example.com", "-c", "commit.gpgsign=false", "commit", "-m", "fixture"],
    {cwd: root, silent: true},
  );
  sha = (await createGitHelper({cwd: root}).getCommit()).sha;
  await writeFile(join(root, "summary.md"), "");
}, 60_000);
afterEach(async () => {
  await rm(root, {recursive: true, force: true, maxRetries: 3, retryDelay: 100});
});

function environment(attempt = 1): NodeJS.ProcessEnv {
  return {
    ...process.env,
    GITHUB_TOKEN: "",
    GITHUB_EVENT_PATH: "",
    GITHUB_WORKSPACE: root,
    GITHUB_REPOSITORY: "owner/repo",
    GITHUB_RUN_ID: "123",
    GITHUB_RUN_ATTEMPT: String(attempt),
    GITHUB_RUN_NUMBER: "9",
    GITHUB_WORKFLOW: "Hygiene",
    GITHUB_EVENT_NAME: "pull_request",
    RUN_ID: "123",
    RUN_NUMBER: "9",
    RUN_ATTEMPT: String(attempt),
    WORKFLOW: "Hygiene",
    EVENT_NAME: "pull_request",
    HEAD_REF: sha,
    BASE_REF: sha,
    PR_NUMBER: "",
    GITHUB_STEP_SUMMARY: join(root, "summary.md"),
    CI_IMPORT_ONLY: "0",
  };
}
async function native(args: readonly string[], env = environment()): Promise<{exitCode: number; stdout: string; stderr: string}> {
  try {
    const result = await execFileAsync(process.execPath, ["--import", hook, ...args], {
      cwd: root,
      env,
      timeout: 30_000,
      maxBuffer: 4 * 1024 * 1024,
    });
    return {exitCode: 0, ...result};
  } catch (error) {
    if (
      error instanceof Error
      && "code" in error
      && typeof error.code === "number"
      && "stdout" in error
      && typeof error.stdout === "string"
      && "stderr" in error
      && typeof error.stderr === "string"
    )
      return {exitCode: error.code, stdout: error.stdout, stderr: error.stderr};
    throw error;
  }
}
function fixturePlan(mode: "affected" | "full") {
  return buildHygienePlan({
    context: context({workspaceRoot: root, commitSha: sha, baseRef: sha, headRef: sha}),
    mode,
    changes: {scope: "known", baseSha: sha, headSha: sha, entries: []},
    workspace: {kind: "unavailable", reason: "Fixture without Nx bootstrap", durationMs: 0},
    sharedInputs: [],
  });
}

describe("native workflow integration", () => {
  it("includes meaningful lib implementations, not test/fixture files, in coverage scope", () => {
    const coverage = record(record(record(configuration, "configuration")["test"], "test")["coverage"], "coverage");
    expect(coverage["include"]).toEqual(expect.arrayContaining(["helpers/**/*.ts", "lib/**/*.ts"]));
    expect(coverage["exclude"]).toEqual(expect.arrayContaining(["**/fixtures/**"]));
  });
  it("imports contracts/reporting and both workflow modules with root runtimes and execution denied", async () => {
    const modules = [
      "../lib/hygiene/contracts.ts",
      "../lib/hygiene/aggregate.ts",
      "../lib/hygiene/runner.ts",
      "../lib/reporting/projections.ts",
      "../lib/live-tests/evidence.ts",
      "../lib/live-tests/render.ts",
      "../lib/unit-tests/report.ts",
      "./runLiveTestAction.ts",
      "./runUnitTestAction.ts",
    ].map((path) => new URL(path, import.meta.url).href);
    const code = `let denied = false; try { await import("effect"); } catch (error) { denied = error.message.includes("Root runtime dependency denied"); } if (!denied) throw new Error("Deny hook inactive"); for (const path of ${JSON.stringify(modules)}) await import(path); console.log("imported-without-workflow-effects");`;
    const result = await native(["--input-type=module", "--eval", code], {...environment(), CI_IMPORT_ONLY: "1"});
    expect(result.exitCode, result.stderr).toBe(0);
    expect(result.stdout.trim()).toBe("imported-without-workflow-effects");
  }, 40_000);
  it("executes both native imported defaults only when explicitly invoked", async () => {
    const unit = new URL("./runUnitTestAction.ts", import.meta.url).href;
    const live = new URL("./runLiveTestAction.ts", import.meta.url).href;
    const code = `const unit = await import(${JSON.stringify(unit)}); const live = await import(${JSON.stringify(live)}); await unit.default(); await live.default(); console.log("explicit-workflow-invocation-completed");`;
    const result = await native(["--input-type=module", "--eval", code], {
      ...environment(),
      ARTIFACTS_DIR: join(root, "missing-artifacts"),
      TARGETS: '["frontend"]',
      FRONTEND_STATUS: "success",
      HEALTH_JSON: "",
    });
    expect(result.exitCode, result.stderr).toBe(0);
    expect(result.stdout).toContain("explicit-workflow-invocation-completed");
  }, 40_000);
  it("runs the actual required-plan launchers and fixture pipeline without root runtime resolution", async () => {
    expect((await native([providerEntry, "format"])).exitCode).not.toBe(0);
    expect((await native([gateEntry])).exitCode).not.toBe(0);
    const plan = fixturePlan("affected");
    const path = join(root, "artifacts", "hygiene", "plan.json");
    await fs.writeJsonAtomic(path, plan);
    for (const id of providerIds()) {
      const result = await native([providerEntry, id, "--plan", path]);
      expect(result.exitCode, result.stderr).toBe(0);
    }
    const result = await native([gateEntry, "--plan", path]);
    expect(result.exitCode, result.stderr).toBe(0);
    const report = record(JSON.parse(await readFile(join(root, "artifacts", "hygiene", "hygiene-report.json"), "utf8")), "report");
    expect(report).toMatchObject({schemaVersion: "3", overallResult: emptyFixture.expectedOverallResult});
    if (!Array.isArray(report["outcomes"])) throw new Error("Missing outcomes");
    expect(report["outcomes"].map((value: unknown) => record(value, "outcome")["providerId"])).toEqual(emptyFixture.expectedProviders);
    expect(
      report["outcomes"].every((value: unknown) => record(value, "outcome")["executionStatus"] === emptyFixture.expectedExecutionStatus),
    ).toBe(true);
  }, 60_000);
  it("reuses earlier successful jobs while replacing a failed provider on a compatible attempt", async () => {
    const plan = fixturePlan("full");
    const path = join(root, "artifacts", "hygiene", "plan.json");
    await fs.writeJsonAtomic(path, plan);
    for (const id of providerIds()) {
      const record = outcome(
        plan,
        id,
        id === "format"
          ? {
              executionStatus: "failed",
              gateResult: "failed",
              payload: {unformattedCount: 1, unformattedFiles: ["x.ts"]},
              findings: [{kind: "file", severity: "warning", file: "x.ts", message: "unformatted"}],
            }
          : {},
      );
      await fs.writeJsonAtomic(join(root, "artifacts", "hygiene", "attempt-1", `outcome-${id}.json`), record);
    }
    await fs.writeJsonAtomic(
      join(root, "artifacts", "hygiene", "attempt-2", "outcome-format.json"),
      outcome(plan, "format", {workflowRunAttempt: rerunFixture.replacementAttempt}),
    );
    const result = await native([gateEntry, "--plan", path], environment(rerunFixture.currentAttempt));
    expect(result.exitCode, result.stderr).toBe(0);
    const report = record(JSON.parse(await readFile(join(root, "artifacts", "hygiene", "hygiene-report.json"), "utf8")), "report");
    expect(report["overallResult"]).toBe(rerunFixture.expectedOverallResult);
    if (!Array.isArray(report["outcomes"])) throw new Error("Missing outcomes");
    const selected = report["outcomes"].map((value: unknown) => record(value, "outcome"));
    expect(selected.find((value) => value["providerId"] === "format")?.["workflowRunAttempt"]).toBe(2);
    expect(selected.find((value) => value["providerId"] === "lint")?.["workflowRunAttempt"]).toBe(1);
  }, 30_000);
});
