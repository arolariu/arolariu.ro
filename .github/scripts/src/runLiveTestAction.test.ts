import {mkdir, mkdtemp, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import runLiveTestAction, {
  discoverTestArtifacts,
  extractTargetFromReportPath,
  extractTestResults,
  loadNewmanReports,
  parseTargetsFromEnvironment,
  type TestArtifactPaths,
} from "./runLiveTestAction.ts";

const coreMocks = vi.hoisted(() => ({
  debug: vi.fn(),
  error: vi.fn(),
  endGroup: vi.fn(),
  group: vi.fn(),
  info: vi.fn(),
  notice: vi.fn(),
  startGroup: vi.fn(),
  setFailed: vi.fn(),
  warning: vi.fn(),
}));

const githubMocks = vi.hoisted(() => {
  const searchIssuesAndPullRequests = vi.fn();
  const createIssue = vi.fn();
  const getOctokit = vi.fn(() => ({
    rest: {
      issues: {
        create: createIssue,
      },
      search: {
        issuesAndPullRequests: searchIssuesAndPullRequests,
      },
    },
  }));

  return {
    context: {
      repo: {
        owner: "arolariu",
        repo: "arolariu.ro",
      },
    },
    createIssue,
    getOctokit,
    searchIssuesAndPullRequests,
  };
});

vi.mock("@actions/core", () => coreMocks);
vi.mock("@actions/github", () => ({
  context: githubMocks.context,
  getOctokit: githubMocks.getOctokit,
}));

const managedEnvironmentVariables = [
  "ARTIFACTS_DIR",
  "BACKEND_DURATION",
  "BACKEND_STATUS",
  "CV_DURATION",
  "CV_STATUS",
  "E2E_MAX_ASSERTION_SUMMARY_CHARS",
  "E2E_MAX_ISSUE_BODY_CHARS",
  "E2E_MAX_LOG_TAIL_CHARS",
  "E2E_MAX_TARGET_SUMMARY_CHARS",
  "EVENT_NAME",
  "FRONTEND_DURATION",
  "FRONTEND_STATUS",
  "GITHUB_TOKEN",
  "HEALTH_JSON",
  "RUN_ID",
  "RUN_NUMBER",
  "SERVER_URL",
  "TARGETS",
  "WORKFLOW",
] as const;

const originalEnvironmentValues = new Map<string, string | undefined>();

async function createTemporaryDirectory(): Promise<string> {
  return mkdtemp(join(tmpdir(), "live-e2e-action-"));
}

function createMockNewmanReport(collectionName: string, includeFailure: boolean = false): object {
  return {
    collection: {
      info: {
        name: collectionName,
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      },
    },
    run: {
      executions: includeFailure
        ? [
            {
              assertions: [
                {
                  assertion: "Status code is 200",
                  error: {
                    message: "Expected 200 but got 500",
                    toString() {
                      return "Expected 200 but got 500";
                    },
                  },
                },
              ],
              item: {
                name: "GET /api/user",
              },
              request: {
                method: "GET",
                url: {
                  host: ["arolariu", "ro"],
                  path: ["api", "user"],
                  protocol: "https",
                  raw: "https://arolariu.ro/api/user",
                  toString() {
                    return "https://arolariu.ro/api/user";
                  },
                },
              },
              response: {
                code: 500,
                responseTime: 950,
                status: "Internal Server Error",
                stream: Buffer.from('{"message":"Internal Server Error"}'),
              },
            },
          ]
        : [],
      stats: {
        assertions: {
          failed: includeFailure ? 1 : 0,
          total: 10,
        },
        requests: {
          failed: includeFailure ? 1 : 0,
          total: 10,
        },
      },
      timings: {
        completed: 1000,
        responseAverage: 120,
        responseMax: 180,
        responseMin: 80,
        started: 0,
      },
    },
  };
}

function setWorkflowEnvironment(overrides: Readonly<Record<string, string>> = {}): void {
  const defaults: Record<string, string> = {
    EVENT_NAME: "schedule",
    GITHUB_TOKEN: "fake-token",
    RUN_ID: "999",
    RUN_NUMBER: "42",
    SERVER_URL: "https://github.com",
    TARGETS: '["frontend","backend","cv"]',
    WORKFLOW: "official-e2e-action",
  };

  for (const [key, value] of Object.entries({...defaults, ...overrides})) {
    process.env[key] = value;
  }
}

describe("runLiveTestAction", () => {
  const temporaryDirectories: string[] = [];

  beforeEach(() => {
    vi.clearAllMocks();

    githubMocks.searchIssuesAndPullRequests.mockResolvedValue({
      data: {
        items: [],
      },
    });

    githubMocks.createIssue.mockResolvedValue({
      data: {
        html_url: "https://github.com/arolariu/arolariu.ro/issues/9999",
      },
    });

    for (const key of managedEnvironmentVariables) {
      originalEnvironmentValues.set(key, process.env[key]);
      delete process.env[key];
    }
  });

  afterEach(async () => {
    for (const key of managedEnvironmentVariables) {
      const originalValue = originalEnvironmentValues.get(key);
      if (originalValue === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalValue;
      }
    }

    for (const directory of temporaryDirectories.splice(0, temporaryDirectories.length)) {
      await rm(directory, {force: true, recursive: true});
    }
  });

  describe("helper functions", () => {
    it("parses targets from environment JSON", () => {
      process.env["TARGETS"] = '["frontend","cv"]';
      expect(parseTargetsFromEnvironment()).toEqual(["frontend", "cv"]);
    });

    it("falls back to default targets when TARGETS is invalid", () => {
      process.env["TARGETS"] = "not-json";
      expect(parseTargetsFromEnvironment()).toEqual(["frontend", "backend", "cv"]);
    });

    it("extracts target names from Newman report filenames", () => {
      expect(extractTargetFromReportPath("logs/newman-frontend.json")).toBe("frontend");
      expect(extractTargetFromReportPath("logs/not-a-report.txt")).toBeNull();
    });

    it("extracts target status and duration from environment variables", () => {
      process.env["FRONTEND_STATUS"] = "success";
      process.env["FRONTEND_DURATION"] = "2.15s";
      process.env["CV_STATUS"] = "failure";

      const results = extractTestResults(["frontend", "cv"]);
      expect(results["frontend"]).toEqual({duration: "2.15s", status: "success"});
      expect(results["cv"]).toEqual({duration: "N/A", status: "failure"});
    });

    it("discovers artifacts recursively", async () => {
      const root = await createTemporaryDirectory();
      temporaryDirectories.push(root);

      const reportsDirectory = join(root, "nested", "reports");
      const logsDirectory = join(root, "nested", "logs");
      await mkdir(reportsDirectory, {recursive: true});
      await mkdir(logsDirectory, {recursive: true});

      await writeFile(join(reportsDirectory, "newman-frontend.json"), JSON.stringify(createMockNewmanReport("frontend")), "utf-8");
      await writeFile(join(reportsDirectory, "newman-frontend-summary.md"), "# summary", "utf-8");
      await writeFile(join(logsDirectory, "e2e-frontend.log"), "frontend log", "utf-8");
      await writeFile(join(logsDirectory, "e2e-status-frontend.json"), '{"target":"frontend","status":"success","duration":"2s"}', "utf-8");
      await writeFile(join(root, "backend-health.json"), '{"status":"Healthy","timestamp":"2026-01-01T00:00:00.000Z"}', "utf-8");

      const artifacts = await discoverTestArtifacts(root);
      expect(artifacts.reports.length).toBe(1);
      expect(artifacts.summaries.length).toBe(1);
      expect(artifacts.logs.length).toBe(1);
      expect(artifacts.statuses.length).toBe(1);
      expect(artifacts.healthCheck).toBeDefined();
    });

    it("loads Newman reports and ignores invalid report files", async () => {
      const root = await createTemporaryDirectory();
      temporaryDirectories.push(root);

      const frontendReportPath = join(root, "newman-frontend.json");
      const invalidReportPath = join(root, "newman-cv.json");

      await writeFile(frontendReportPath, JSON.stringify(createMockNewmanReport("frontend")), "utf-8");
      await writeFile(invalidReportPath, "{invalid json", "utf-8");

      const artifacts: TestArtifactPaths = {
        logs: [],
        reports: [frontendReportPath, invalidReportPath],
        statuses: [],
        summaries: [],
      };

      const reports = await loadNewmanReports(artifacts);
      expect(reports["frontend"]).toBeDefined();
      expect(reports["cv"]).toBeUndefined();
    });
  });

  describe("orchestration flow", () => {
    it("creates an issue with the aggregated failure context when failures are detected", async () => {
      const root = await createTemporaryDirectory();
      temporaryDirectories.push(root);

      const nestedDirectory = join(root, "artifacts", "nested");
      await mkdir(nestedDirectory, {recursive: true});
      await writeFile(join(nestedDirectory, "newman-frontend.json"), JSON.stringify(createMockNewmanReport("frontend", true)), "utf-8");
      await writeFile(join(nestedDirectory, "newman-frontend-summary.md"), "Frontend summary", "utf-8");
      await writeFile(join(nestedDirectory, "e2e-frontend.log"), "line 1\nline 2\nline 3", "utf-8");
      await writeFile(join(nestedDirectory, "e2e-status-backend.json"), '{"target":"backend","status":"success","duration":"2.80s"}', "utf-8");
      await writeFile(join(root, "backend-health.json"), '{"status":"Healthy","timestamp":"2026-02-19T00:00:00.000Z"}', "utf-8");

      setWorkflowEnvironment({
        ARTIFACTS_DIR: root,
        BACKEND_DURATION: "2.80s",
        BACKEND_STATUS: "success",
        FRONTEND_DURATION: "1.10s",
        FRONTEND_STATUS: "success",
        TARGETS: '["frontend","backend"]',
      });

      await runLiveTestAction();

      expect(githubMocks.getOctokit).toHaveBeenCalledWith("fake-token");
      expect(githubMocks.searchIssuesAndPullRequests).toHaveBeenCalledOnce();
      expect(githubMocks.createIssue).toHaveBeenCalledOnce();

      const issueInput = githubMocks.createIssue.mock.calls[0]?.[0];
      expect(issueInput).toBeDefined();
      expect(issueInput?.title).toContain("Hourly Live Test Failed");
      expect(issueInput?.body).toContain("Live E2E Test Failure Report");
      expect(issueInput?.body).toContain("Target Status Matrix");
      expect(issueInput?.body).toContain("Frontend");
      expect(issueInput?.body).toContain("Backend");
      expect(issueInput?.body).toContain("Failure Analysis");
      expect(issueInput?.body).toContain("Backend Health Snapshot");
      expect(issueInput?.body).toContain("Assertion Summaries");
      expect(issueInput?.body).toContain("Log Tails");
      expect(issueInput?.body).not.toMatch(/\$[A-Z0-9_]+/);

      expect(coreMocks.notice).toHaveBeenCalledWith(expect.stringContaining("Created E2E test failure issue"));
    });

    it("derives template metrics from log summaries when Newman JSON artifacts are unavailable", async () => {
      const root = await createTemporaryDirectory();
      temporaryDirectories.push(root);

      const nestedDirectory = join(root, "artifacts", "nested");
      await mkdir(nestedDirectory, {recursive: true});

      const frontendLog = [
        "↳ 38 - Get Non-existent Invoice (404)",
        "  GET https://arolariu.ro/rest/v1/invoices/00000000-0000-0000-0000-000000000000 [404 Not Found, 161B, 41ms]",
        "↳ 39 - Unauthorized Request (401)",
        "  GET https://arolariu.ro/rest/v1/invoices [401 Unauthorized, 0B, 33ms]",
        "↳ 40 - Invalid Request Body (400)",
        "  POST https://arolariu.ro/rest/v1/invoices [500 Internal Server Error, 218B, 55ms]",
        "  ✓ noisy assertion line that should not be present in log tail section",
        "",
        "┌─────────────────────────┬──────────────────────┬─────────────────────┐",
        "│                         │             executed │              failed │",
        "├─────────────────────────┼──────────────────────┼─────────────────────┤",
        "│              iterations │                    1 │                   0 │",
        "├─────────────────────────┼──────────────────────┼─────────────────────┤",
        "│                requests │                   40 │                   3 │",
        "├─────────────────────────┼──────────────────────┼─────────────────────┤",
        "│            test-scripts │                   80 │                   0 │",
        "├─────────────────────────┼──────────────────────┼─────────────────────┤",
        "│      prerequest-scripts │                   40 │                   0 │",
        "├─────────────────────────┼──────────────────────┼─────────────────────┤",
        "│              assertions │                  200 │                  10 │",
        "├─────────────────────────┴──────────────────────┴─────────────────────┤",
        "│ total run duration: 52.1s                                            │",
        "├──────────────────────────────────────────────────────────────────────┤",
        "│ total data received: 2.11MB (approx)                                 │",
        "├──────────────────────────────────────────────────────────────────────┤",
        "│ average response time: 602ms [min: 55ms, max: 1800ms, s.d.: 241ms]   │",
        "└──────────────────────────────────────────────────────────────────────┘",
      ].join("\n");

      const frontendSummary = [
        "### Failed Assertions (frontend)",
        "1. AssertionError  Unknown assertion",
        "   expected 500 to equal 404",
        "   in \"38 - Get Non-existent Invoice (404)\"",
        "",
        "2. AssertionError  Unknown assertion",
        "   timeout of 30000ms exceeded",
        "   in \"39 - Unauthorized Request (401)\"",
        "",
        "3. AssertionError  Unknown assertion",
        "   expected 201 to equal 400",
        "   in \"40 - Invalid Request Body (400)\"",
        "",
      ].join("\n");

      await writeFile(join(nestedDirectory, "e2e-frontend.log"), frontendLog, "utf-8");
      await writeFile(join(nestedDirectory, "newman-frontend-summary.md"), frontendSummary, "utf-8");
      await writeFile(join(nestedDirectory, "e2e-status-frontend.json"), '{"target":"frontend","status":"failure","duration":"3.50s"}', "utf-8");

      setWorkflowEnvironment({
        ARTIFACTS_DIR: root,
        FRONTEND_DURATION: "3.50s",
        FRONTEND_STATUS: "failure",
        TARGETS: '["frontend"]',
      });

      await runLiveTestAction();

      expect(githubMocks.createIssue).toHaveBeenCalledOnce();

      const issueInput = githubMocks.createIssue.mock.calls[0]?.[0];
      expect(issueInput).toBeDefined();
      expect(issueInput?.body).toMatch(/### Frontend\s+### Derived from Newman CLI summary table/s);
      expect(issueInput?.body).toContain("| Frontend | `❌ failure` | `3.50s` | `10` | `3` |");
      expect(issueInput?.body).toContain("- Client errors (4xx): `2`");
      expect(issueInput?.body).toContain("- Server errors (5xx): `1`");
      expect(issueInput?.body).toContain("┌─────────────────────────┬──────────────────────┬─────────────────────┐");
      expect(issueInput?.body).not.toContain("noisy assertion line that should not be present in log tail section");
    });

    it("emits a compact issue body when the rendered payload exceeds GitHub size limits", async () => {
      const root = await createTemporaryDirectory();
      temporaryDirectories.push(root);

      const nestedDirectory = join(root, "artifacts", "nested");
      await mkdir(nestedDirectory, {recursive: true});

      const oversizedLog = Array.from({length: 300}, (_, index) => `failure-line-${index}`).join("\n");
      const oversizedSummary = Array.from({length: 200}, (_, index) => `summary-entry-${index}: assertion failed`).join("\n");

      await writeFile(join(nestedDirectory, "newman-frontend.json"), JSON.stringify(createMockNewmanReport("frontend", true)), "utf-8");
      await writeFile(join(nestedDirectory, "newman-frontend-summary.md"), oversizedSummary, "utf-8");
      await writeFile(join(nestedDirectory, "e2e-frontend.log"), oversizedLog, "utf-8");

      setWorkflowEnvironment({
        ARTIFACTS_DIR: root,
        E2E_MAX_ISSUE_BODY_CHARS: "1200",
        FRONTEND_DURATION: "8.00s",
        FRONTEND_STATUS: "failure",
        TARGETS: '["frontend"]',
      });

      await runLiveTestAction();

      expect(githubMocks.createIssue).toHaveBeenCalledOnce();
      const issueInput = githubMocks.createIssue.mock.calls[0]?.[0];
      expect(issueInput).toBeDefined();
      expect(issueInput?.body.length).toBeLessThanOrEqual(1200);
      expect(issueInput?.body).toContain("Live E2E Test Failure Report (Compact)");
      expect(issueInput?.body).toContain("View artifacts");
      expect(issueInput?.body).toContain("Failure Snapshot");
    });

    it("skips issue creation when all targets are successful", async () => {
      const root = await createTemporaryDirectory();
      temporaryDirectories.push(root);

      setWorkflowEnvironment({
        ARTIFACTS_DIR: root,
        FRONTEND_DURATION: "1.00s",
        FRONTEND_STATUS: "success",
        TARGETS: '["frontend"]',
      });

      await runLiveTestAction();

      expect(githubMocks.searchIssuesAndPullRequests).not.toHaveBeenCalled();
      expect(githubMocks.createIssue).not.toHaveBeenCalled();
      expect(coreMocks.notice).toHaveBeenCalledWith(expect.stringContaining("No test failures detected"));
    });

    it("skips duplicate issue creation when an open issue already exists", async () => {
      const root = await createTemporaryDirectory();
      temporaryDirectories.push(root);

      githubMocks.searchIssuesAndPullRequests.mockResolvedValueOnce({
        data: {
          items: [{number: 1234, state: "open"}],
        },
      });

      setWorkflowEnvironment({
        ARTIFACTS_DIR: root,
        FRONTEND_DURATION: "2.00s",
        FRONTEND_STATUS: "failure",
        TARGETS: '["frontend"]',
      });

      await runLiveTestAction();

      expect(githubMocks.searchIssuesAndPullRequests).toHaveBeenCalledOnce();
      expect(githubMocks.createIssue).not.toHaveBeenCalled();
      expect(coreMocks.warning).toHaveBeenCalledWith(expect.stringContaining("Existing open issue found"));
    });

    it("marks the action as failed when workflow metadata is missing", async () => {
      const root = await createTemporaryDirectory();
      temporaryDirectories.push(root);

      process.env["ARTIFACTS_DIR"] = root;
      process.env["GITHUB_TOKEN"] = "fake-token";

      await expect(runLiveTestAction()).rejects.toThrow("Missing required environment variables");
      expect(coreMocks.setFailed).toHaveBeenCalledWith(expect.stringContaining("Failed to create E2E test failure issue"));
      expect(coreMocks.error).toHaveBeenCalledWith(expect.stringContaining("E2E failure issue creation failed"));
    });
  });
});
