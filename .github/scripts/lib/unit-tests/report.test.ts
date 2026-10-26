import {mkdtemp, readFile, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {afterAll, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import * as sdk from "../../helpers/sdk/github.ts";
import {GitHub} from "../../helpers/sdk/github-utils.ts";
import {createGitHubHelper} from "../../helpers/github/index.ts";
import {createGitHelper} from "../../helpers/git/index.ts";
import {execChecked} from "../../helpers/exec/index.ts";
import {fs} from "../../helpers/filesystem/index.ts";
import {vitest} from "../../helpers/vitest/index.ts";
import {playwright} from "../../helpers/playwright/index.ts";
import {context} from "../planning/fixtures/plans.ts";
import {runUnitTestReport, type UnitReportDependencies} from "./report.ts";

let directory: string;
let root: string;
let sha: string;
let body: string;
let client: InstanceType<typeof GitHub>;
let dependencies: UnitReportDependencies;
const pr = {
  number: 42,
  title: "Feature",
  html_url: "https://github.com/owner/repo/pull/42",
  state: "open",
  base: {ref: "main"},
  head: {ref: "feature"},
  user: {login: "writer"},
};

beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "unit-report-"));
  root = join(directory, "repository");
  await execChecked("git", ["init", "-b", "main", root], {silent: true});
  const git = async (args: readonly string[]): Promise<void> => {
    await execChecked("git", ["-c", "user.name=Test", "-c", "user.email=test@example.com", "-c", "commit.gpgsign=false", ...args], {
      cwd: root,
      silent: true,
    });
  };
  await writeFile(join(root, "file.txt"), "base");
  await git(["add", "."]);
  await git(["commit", "-m", "base"]);
  await execChecked("git", ["clone", "--bare", root, join(directory, "origin")], {silent: true});
  await git(["remote", "add", "origin", join(directory, "origin")]);
  await git(["checkout", "-b", "feature"]);
  await writeFile(join(root, "file.txt"), "head");
  await git(["add", "."]);
  await git(["commit", "-m", "head"]);
  sha = (await createGitHelper({cwd: root}).getCommit()).sha;
}, 60_000);
afterAll(async () => {
  await rm(directory, {recursive: true, force: true, maxRetries: 3, retryDelay: 100});
});
beforeEach(() => {
  body = "";
  const fetch: typeof globalThis.fetch = async (input, options) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/pulls"))
      return new Response(JSON.stringify([pr]), {status: 200, headers: {"content-type": "application/json"}});
    const value: unknown = JSON.parse(String(options?.body));
    if (typeof value !== "object" || value === null || !("body" in value) || typeof value.body !== "string")
      throw new Error("Invalid native comment payload");
    body = value.body;
    return new Response(
      JSON.stringify({
        id: 99,
        body,
        user: {login: "bot"},
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
        html_url: "https://github.com/owner/repo/pull/42#issuecomment-99",
      }),
      {status: 201, headers: {"content-type": "application/json"}},
    );
  };
  client = new GitHub({auth: "opaque", request: {fetch}});
  const githubContext: typeof sdk.context = {
    ...sdk.context,
    repo: {owner: "owner", repo: "repo"},
    issue: {owner: "owner", repo: "repo", number: 42},
    payload: {},
  };
  dependencies = {
    git: createGitHelper({cwd: root}),
    files: fs,
    vitest,
    playwright,
    github: createGitHubHelper("opaque", githubContext, {client}),
    jobStatus: "failure",
    paths: {coverage: "coverage.json", playwright: "playwright.json"},
  };
});

describe("unit report composition", () => {
  it("preserves coverage, Playwright, branch comparison, PR discovery, and deterministic footer", async () => {
    await writeFile(
      join(root, "coverage.json"),
      await readFile(fileURLToPath(new URL("../../helpers/reports/fixtures/coverage.json", import.meta.url))),
    );
    await writeFile(
      join(root, "playwright.json"),
      await readFile(fileURLToPath(new URL("../../helpers/reports/fixtures/playwright.json", import.meta.url))),
    );
    const result = await runUnitTestReport(context({workspaceRoot: root, commitSha: sha, branchName: "feature"}), dependencies);
    expect(result[0]?.status).toBe("published");
    expect(body).toContain("Branch Comparison");
    expect(body).toContain("Vitest Unit Tests");
    expect(body).toContain("Playwright Tests");
    expect(body).toContain("2026-01-01T00:00:00.000Z");
    expect(body).toContain("/pull/42");
  }, 30_000);
  it("distinguishes missing optional reports from malformed reports", async () => {
    const current = context({workspaceRoot: root, commitSha: sha, branchName: "feature"});
    await runUnitTestReport(current, {
      ...dependencies,
      jobStatus: "success",
      paths: {coverage: "missing.json", playwright: "also-missing.json"},
    });
    expect(body).toContain("Coverage data not available");
    expect(body).toContain("Playwright results report not available");
    expect(body).toContain("inferred");
    expect(body).not.toContain("All Playwright tests passed");
    await writeFile(join(root, "invalid.json"), "{not json");
    await runUnitTestReport(current, {
      ...dependencies,
      jobStatus: "success",
      paths: {coverage: "invalid.json", playwright: "invalid.json"},
    });
    expect(body).toContain("Could not read coverage data");
    expect(body).toContain("Could not read Playwright results");
    expect(body).not.toContain("All Playwright tests passed");
  }, 30_000);
  it("returns lookup rejection as optional failed publication, not no PR", async () => {
    const error = new Error("Native PR lookup denied");
    vi.spyOn(client.rest.pulls, "list").mockRejectedValue(error);
    const results = await runUnitTestReport(context({workspaceRoot: root, commitSha: sha, branchName: "feature"}), dependencies);
    expect(results[0]).toMatchObject({status: "failed", required: false, error});
  });
  it("explicitly skips remote publication when no client is configured", async () => {
    expect((await runUnitTestReport(context({workspaceRoot: root, commitSha: sha}), {...dependencies, github: null}))[0]?.status).toBe(
      "skipped",
    );
  });
});
