// @vitest-environment node
/**
 * @fileoverview Contract tests for the E2E Newman runner.
 * @module scripts/test-e2e.test
 */

import {mkdtemp, readFile, rm, writeFile, mkdir} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join, isAbsolute} from "node:path";
import {afterEach, describe, expect, it} from "vitest";
import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "./common/logger.ts";
import type {CommandResult, CommandRunner, CommandSpec} from "./common/process.ts";

/** Minimal Postman collection fixture that is valid JSON. */
const MINIMAL_COLLECTION = JSON.stringify(
  {info: {name: "test-collection"}, item: [], variable: [{key: "baseUrl", value: "http://localhost"}]},
  null,
  2,
);

/** Minimal Postman environment fixture. */
const MINIMAL_ENVIRONMENT = JSON.stringify(
  {name: "test-env", values: [{key: "baseUrl", value: "http://localhost", enabled: true}]},
  null,
  2,
);

const FAKE_TOKEN = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature";

/** Creates a fake runner that records every command and returns a configurable result. */
function createFakeRunner(result: Partial<CommandResult> = {}): {runner: CommandRunner; calls: Array<{command: CommandSpec}>} {
  const calls: Array<{command: CommandSpec}> = [];
  const runner: CommandRunner = {
    run: async (command: Readonly<CommandSpec>) => {
      calls.push({command: {...command, args: [...command.args]}});
      return {
        code: 0,
        stdout: "",
        stderr: "",
        durationMs: 100,
        timedOut: false,
        ...result,
      };
    },
  };
  return {runner, calls};
}

/** Scaffolds a temporary target directory with collection and environment files. */
async function scaffoldTarget(root: string, relativeDir: string): Promise<{collectionPath: string; environmentPath: string}> {
  const targetDir = join(root, relativeDir);
  await mkdir(targetDir, {recursive: true});
  const collectionPath = join(targetDir, "postman-collection.json");
  const environmentPath = join(targetDir, "postman-environment.production.json");
  await writeFile(collectionPath, MINIMAL_COLLECTION, "utf-8");
  await writeFile(environmentPath, MINIMAL_ENVIRONMENT, "utf-8");
  return {collectionPath, environmentPath};
}

/** Scaffolds a full temporary tree with all three targets and a report directory. */
async function scaffoldAll(): Promise<{
  root: string;
  paths: Record<string, {collectionPath: string; environmentPath: string}>;
  reportDir: string;
}> {
  const root = await mkdtemp(join(tmpdir(), "e2e-test-"));
  const targets = {
    backend: "sites/api.arolariu.ro",
    frontend: "sites/arolariu.ro",
    cv: "sites/cv.arolariu.ro",
  } as const;

  const paths: Record<string, {collectionPath: string; environmentPath: string}> = {};
  for (const [key, dir] of Object.entries(targets)) {
    paths[key] = await scaffoldTarget(root, dir);
  }

  const reportDir = join(root, "e2e-logs");
  await mkdir(reportDir, {recursive: true});

  return {root, paths, reportDir};
}

let tempRoot: string | undefined;

afterEach(async () => {
  if (tempRoot !== undefined) {
    await rm(tempRoot, {recursive: true, force: true});
    tempRoot = undefined;
  }
});

describe("test-e2e: collection immutability", () => {
  it("backend success run does not modify the collection file", async () => {
    const {root, paths, reportDir} = await scaffoldAll();
    tempRoot = root;
    const originalBytes = await readFile(paths["backend"]!.collectionPath, "utf-8");
    const {runner, calls} = createFakeRunner();

    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("test", {color: false, sink});

    const {main} = await import("./test-e2e.ts");
    const code = await main("backend", logger, {
      runner,
      cwd: root,
      env: {E2E_TEST_AUTH_TOKEN: FAKE_TOKEN, NEWMAN_REPORT_DIR: reportDir},
    });

    expect(code).toBe(0);
    expect(await readFile(paths["backend"]!.collectionPath, "utf-8")).toBe(originalBytes);

    // Verify --env-var authToken transport
    const recorded = calls[0]!.command;
    expect(recorded.args).toContain("--env-var");
    const envVarIndex = recorded.args.indexOf("--env-var");
    expect(recorded.args[envVarIndex + 1]).toBe(`authToken=${FAKE_TOKEN}`);
  });

  it("frontend optional token run does not modify the collection file", async () => {
    const {root, paths, reportDir} = await scaffoldAll();
    tempRoot = root;
    const originalBytes = await readFile(paths["frontend"]!.collectionPath, "utf-8");
    const {runner, calls} = createFakeRunner();

    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("test", {color: false, sink});

    const {main} = await import("./test-e2e.ts");
    const code = await main("frontend", logger, {
      runner,
      cwd: root,
      env: {E2E_TEST_AUTH_TOKEN: FAKE_TOKEN, NEWMAN_REPORT_DIR: reportDir},
    });

    expect(code).toBe(0);
    expect(await readFile(paths["frontend"]!.collectionPath, "utf-8")).toBe(originalBytes);

    // Frontend with token should also use --env-var
    const recorded = calls[0]!.command;
    expect(recorded.args).toContain("--env-var");
  });

  it("frontend without token still does not modify the collection", async () => {
    const {root, paths, reportDir} = await scaffoldAll();
    tempRoot = root;
    const originalBytes = await readFile(paths["frontend"]!.collectionPath, "utf-8");
    const {runner, calls} = createFakeRunner();

    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("test", {color: false, sink});

    const {main} = await import("./test-e2e.ts");
    const code = await main("frontend", logger, {
      runner,
      cwd: root,
      env: {E2E_TEST_AUTH_TOKEN: "", NEWMAN_REPORT_DIR: reportDir},
    });

    expect(code).toBe(0);
    expect(await readFile(paths["frontend"]!.collectionPath, "utf-8")).toBe(originalBytes);

    // Without token, --env-var should not be present
    const recorded = calls[0]!.command;
    expect(recorded.args).not.toContain("--env-var");
  });

  it("cv ignores the token and does not modify the collection", async () => {
    const {root, paths, reportDir} = await scaffoldAll();
    tempRoot = root;
    const originalBytes = await readFile(paths["cv"]!.collectionPath, "utf-8");
    const {runner, calls} = createFakeRunner();

    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("test", {color: false, sink});

    const {main} = await import("./test-e2e.ts");
    const code = await main("cv", logger, {
      runner,
      cwd: root,
      env: {E2E_TEST_AUTH_TOKEN: FAKE_TOKEN, NEWMAN_REPORT_DIR: reportDir},
    });

    expect(code).toBe(0);
    expect(await readFile(paths["cv"]!.collectionPath, "utf-8")).toBe(originalBytes);

    // CV should never include --env-var for auth
    const recorded = calls[0]!.command;
    expect(recorded.args).not.toContain("--env-var");
  });
});

describe("test-e2e: nonzero exit preserves collection", () => {
  it("nonzero Newman exit code does not corrupt the collection", async () => {
    const {root, paths, reportDir} = await scaffoldAll();
    tempRoot = root;
    const originalBytes = await readFile(paths["backend"]!.collectionPath, "utf-8");
    const {runner} = createFakeRunner({code: 1});

    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("test", {color: false, sink});

    const {main} = await import("./test-e2e.ts");
    const code = await main("backend", logger, {
      runner,
      cwd: root,
      env: {E2E_TEST_AUTH_TOKEN: FAKE_TOKEN, NEWMAN_REPORT_DIR: reportDir},
    });

    expect(code).not.toBe(0);
    expect(await readFile(paths["backend"]!.collectionPath, "utf-8")).toBe(originalBytes);
  });
});

describe("test-e2e: timeout preserves collection", () => {
  it("timed-out Newman preserves the collection", async () => {
    const {root, paths, reportDir} = await scaffoldAll();
    tempRoot = root;
    const originalBytes = await readFile(paths["backend"]!.collectionPath, "utf-8");
    const {runner} = createFakeRunner({code: 1, timedOut: true});

    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("test", {color: false, sink});

    const {main} = await import("./test-e2e.ts");
    const code = await main("backend", logger, {
      runner,
      cwd: root,
      env: {E2E_TEST_AUTH_TOKEN: FAKE_TOKEN, NEWMAN_REPORT_DIR: reportDir},
    });

    expect(code).not.toBe(0);
    expect(await readFile(paths["backend"]!.collectionPath, "utf-8")).toBe(originalBytes);
  });
});

describe("test-e2e: spawn failure preserves collection", () => {
  it("spawn failure does not corrupt the collection", async () => {
    const {root, paths, reportDir} = await scaffoldAll();
    tempRoot = root;
    const originalBytes = await readFile(paths["backend"]!.collectionPath, "utf-8");
    const {runner} = createFakeRunner({code: 1, spawnError: "ENOENT"});

    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("test", {color: false, sink});

    const {main} = await import("./test-e2e.ts");
    const code = await main("backend", logger, {
      runner,
      cwd: root,
      env: {E2E_TEST_AUTH_TOKEN: FAKE_TOKEN, NEWMAN_REPORT_DIR: reportDir},
    });

    expect(code).not.toBe(0);
    expect(await readFile(paths["backend"]!.collectionPath, "utf-8")).toBe(originalBytes);
  });
});

describe("test-e2e: token redaction", () => {
  it("logger records never contain the raw token", async () => {
    const {root, reportDir} = await scaffoldAll();
    tempRoot = root;
    const {runner} = createFakeRunner();

    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("test", {color: false, sink});

    const {main} = await import("./test-e2e.ts");
    await main("backend", logger, {
      runner,
      cwd: root,
      env: {E2E_TEST_AUTH_TOKEN: FAKE_TOKEN, NEWMAN_REPORT_DIR: reportDir},
    });

    const allText = sink.records.map((r) => r.text).join("\n");
    expect(allText).not.toContain(FAKE_TOKEN);
  });

  it("token is redacted even on nonzero exit", async () => {
    const {root, reportDir} = await scaffoldAll();
    tempRoot = root;
    const {runner} = createFakeRunner({code: 1});

    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("test", {color: false, sink});

    const {main} = await import("./test-e2e.ts");
    await main("backend", logger, {
      runner,
      cwd: root,
      env: {E2E_TEST_AUTH_TOKEN: FAKE_TOKEN, NEWMAN_REPORT_DIR: reportDir},
    });

    const allText = sink.records.map((r) => r.text).join("\n");
    expect(allText).not.toContain(FAKE_TOKEN);
  });
});

describe("test-e2e: Commander help and invalid targets", () => {
  it("--help returns exit code 0 without runner work", async () => {
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("test", {color: false, sink});
    const {runner, calls} = createFakeRunner();

    const {main} = await import("./test-e2e.ts");
    const code = await main("--help", logger, {runner});

    expect(code).toBe(0);
    expect(calls).toHaveLength(0);
  });

  it("-h returns exit code 0", async () => {
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("test", {color: false, sink});
    const {runner, calls} = createFakeRunner();

    const {main} = await import("./test-e2e.ts");
    const code = await main("-h", logger, {runner});

    expect(code).toBe(0);
    expect(calls).toHaveLength(0);
  });

  it("/h returns exit code 0", async () => {
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("test", {color: false, sink});
    const {runner, calls} = createFakeRunner();

    const {main} = await import("./test-e2e.ts");
    const code = await main("/h", logger, {runner});

    expect(code).toBe(0);
    expect(calls).toHaveLength(0);
  });

  it("invalid target returns nonzero exit before any runner work", async () => {
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("test", {color: false, sink});
    const {runner, calls} = createFakeRunner();

    const {main} = await import("./test-e2e.ts");
    const code = await main("nope", logger, {runner});

    expect(code).toBe(1);
    expect(calls).toHaveLength(0);
  });

  it("unknown option returns nonzero exit before any runner work", async () => {
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("test", {color: false, sink});
    const {runner, calls} = createFakeRunner();

    const {main} = await import("./test-e2e.ts");
    const code = await main("--unknown-flag", logger, {runner});

    expect(code).toBe(1);
    expect(calls).toHaveLength(0);
  });
});

describe("test-e2e: fake runner transport proof", () => {
  it("backend command carries the token only inside --env-var", async () => {
    const {root, reportDir} = await scaffoldAll();
    tempRoot = root;
    const {runner, calls} = createFakeRunner();

    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("test", {color: false, sink});

    const {main} = await import("./test-e2e.ts");
    await main("backend", logger, {
      runner,
      cwd: root,
      env: {E2E_TEST_AUTH_TOKEN: FAKE_TOKEN, NEWMAN_REPORT_DIR: reportDir},
    });

    expect(calls).toHaveLength(1);
    const rawArgs = calls[0]!.command.args;
    // Token only appears as the value after --env-var
    const envVarIndices = rawArgs.reduce<number[]>((acc, arg, i) => (arg === "--env-var" ? [...acc, i] : acc), []);
    expect(envVarIndices).toHaveLength(1);
    expect(rawArgs[envVarIndices[0]! + 1]).toBe(`authToken=${FAKE_TOKEN}`);
  });
});

/**
 * Generates a synthetic JWT-shaped token at runtime.
 * Uses base64url-encoded harmless header/payload with a test signature.
 */
function generateSyntheticJwt(): string {
  const header = Buffer.from(JSON.stringify({alg: "HS256", typ: "JWT"})).toString("base64url");
  const payload = Buffer.from(JSON.stringify({sub: "test-user", iat: 1234567890, exp: 9999999999})).toString("base64url");
  const signature = Buffer.from("test-signature-not-a-real-secret").toString("base64url");
  return `${header}.${payload}.${signature}`;
}

/**
 * Creates a fake runner that writes token-bearing Newman JSON and JUnit artifacts
 * to the exact report arguments it receives, simulating real Newman output.
 */
function createArtifactWritingFakeRunner(
  token: string,
  result: Partial<CommandResult> = {},
): {runner: CommandRunner; calls: Array<{command: CommandSpec}>} {
  const calls: Array<{command: CommandSpec}> = [];
  const runner: CommandRunner = {
    run: async (command: Readonly<CommandSpec>) => {
      calls.push({command: {...command, args: [...command.args]}});

      // Extract report paths from the command arguments
      const args = command.args;
      const jsonExportIndex = args.indexOf("--reporter-json-export");
      const junitExportIndex = args.indexOf("--reporter-junit-export");

      if (jsonExportIndex >= 0 && jsonExportIndex + 1 < args.length) {
        const jsonPath = args[jsonExportIndex + 1]!;
        const jsonReport = {
          run: {
            failures: [],
            executions: [
              {
                request: {headers: [{key: "Authorization", value: `Bearer ${token}`}]},
                response: {body: `{"authToken": "${token}"}`},
              },
            ],
          },
          environment: {
            values: [{key: "authToken", value: token, type: "text"}],
          },
        };
        const {writeFileSync, mkdirSync} = await import("node:fs");
        const {dirname} = await import("node:path");
        mkdirSync(dirname(jsonPath), {recursive: true});
        writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2), "utf-8");
      }

      if (junitExportIndex >= 0 && junitExportIndex + 1 < args.length) {
        const junitPath = args[junitExportIndex + 1]!;
        const junitXml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="newman" tests="2" failures="0">
  <testsuite name="Test Suite" tests="2">
    <testcase name="Auth test" classname="AuthTest">
      <system-out>Authorization: Bearer ${token}</system-out>
    </testcase>
    <testcase name="Token check" classname="TokenTest">
      <system-out>authToken=${token}</system-out>
    </testcase>
  </testsuite>
</testsuites>`;
        const {writeFileSync, mkdirSync} = await import("node:fs");
        const {dirname} = await import("node:path");
        mkdirSync(dirname(junitPath), {recursive: true});
        writeFileSync(junitPath, junitXml, "utf-8");
      }

      return {
        code: 0,
        stdout: "",
        stderr: "",
        durationMs: 100,
        timedOut: false,
        ...result,
      };
    },
  };
  return {runner, calls};
}

describe("test-e2e: artifact sanitization", () => {
  it("sanitizes JWT tokens from JSON reports after successful run", async () => {
    const syntheticJwt = generateSyntheticJwt();
    const {root, reportDir} = await scaffoldAll();
    tempRoot = root;
    const {runner} = createArtifactWritingFakeRunner(syntheticJwt);

    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("test", {color: false, sink});

    const {main} = await import("./test-e2e.ts");
    const code = await main("backend", logger, {
      runner,
      cwd: root,
      env: {E2E_TEST_AUTH_TOKEN: syntheticJwt, NEWMAN_REPORT_DIR: reportDir},
    });

    expect(code).toBe(0);

    const jsonPath = join(reportDir, "newman-backend.json");
    const jsonContent = await readFile(jsonPath, "utf-8");
    expect(jsonContent).not.toContain(syntheticJwt);
    expect(jsonContent).not.toMatch(/eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
  });

  it("sanitizes JWT tokens from JUnit XML reports after successful run", async () => {
    const syntheticJwt = generateSyntheticJwt();
    const {root, reportDir} = await scaffoldAll();
    tempRoot = root;
    const {runner} = createArtifactWritingFakeRunner(syntheticJwt);

    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("test", {color: false, sink});

    const {main} = await import("./test-e2e.ts");
    const code = await main("backend", logger, {
      runner,
      cwd: root,
      env: {E2E_TEST_AUTH_TOKEN: syntheticJwt, NEWMAN_REPORT_DIR: reportDir},
    });

    expect(code).toBe(0);

    const junitPath = join(reportDir, "newman-backend.xml");
    const junitContent = await readFile(junitPath, "utf-8");
    expect(junitContent).not.toContain(syntheticJwt);
    expect(junitContent).not.toMatch(/eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
    // Non-secret content is preserved
    expect(junitContent).toContain("testsuites");
    expect(junitContent).toContain("Auth test");
  });

  it("sanitizes summary Markdown after successful run with JWT in JSON report", async () => {
    const syntheticJwt = generateSyntheticJwt();
    const {root, reportDir} = await scaffoldAll();
    tempRoot = root;
    const {runner} = createArtifactWritingFakeRunner(syntheticJwt);

    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("test", {color: false, sink});

    const {main} = await import("./test-e2e.ts");
    const code = await main("backend", logger, {
      runner,
      cwd: root,
      env: {E2E_TEST_AUTH_TOKEN: syntheticJwt, NEWMAN_REPORT_DIR: reportDir},
    });

    expect(code).toBe(0);

    const summaryPath = join(reportDir, "newman-backend-summary.md");
    const summaryContent = await readFile(summaryPath, "utf-8");
    expect(summaryContent).not.toContain(syntheticJwt);
    expect(summaryContent).not.toMatch(/eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
  });

  it("sanitizes artifacts on failure path (nonzero exit)", async () => {
    const syntheticJwt = generateSyntheticJwt();
    const {root, reportDir} = await scaffoldAll();
    tempRoot = root;
    const {runner} = createArtifactWritingFakeRunner(syntheticJwt, {code: 1});

    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("test", {color: false, sink});

    const {main} = await import("./test-e2e.ts");
    const code = await main("backend", logger, {
      runner,
      cwd: root,
      env: {E2E_TEST_AUTH_TOKEN: syntheticJwt, NEWMAN_REPORT_DIR: reportDir},
    });

    expect(code).not.toBe(0);

    const jsonPath = join(reportDir, "newman-backend.json");
    const junitPath = join(reportDir, "newman-backend.xml");

    const jsonContent = await readFile(jsonPath, "utf-8");
    expect(jsonContent).not.toContain(syntheticJwt);
    expect(jsonContent).not.toMatch(/eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);

    const junitContent = await readFile(junitPath, "utf-8");
    expect(junitContent).not.toContain(syntheticJwt);
    expect(junitContent).not.toMatch(/eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
  });
});

describe("test-e2e: injected env isolation", () => {
  it("NEWMAN_TIMEOUT from injected env overrides process.env", async () => {
    const {root, reportDir} = await scaffoldAll();
    tempRoot = root;
    const {runner, calls} = createFakeRunner();

    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("test", {color: false, sink});

    const savedTimeout = process.env["NEWMAN_TIMEOUT"];
    try {
      // Set a deliberately conflicting value in process.env
      process.env["NEWMAN_TIMEOUT"] = "999999";

      const {main} = await import("./test-e2e.ts");
      const code = await main("backend", logger, {
        runner,
        cwd: root,
        env: {
          E2E_TEST_AUTH_TOKEN: FAKE_TOKEN,
          NEWMAN_REPORT_DIR: reportDir,
          NEWMAN_TIMEOUT: "42000",
        },
      });

      expect(code).toBe(0);
      const rawArgs = calls[0]!.command.args;
      // The --timeout value must come from the injected env (42000), not process.env (999999)
      const timeoutIndex = rawArgs.indexOf("--timeout");
      expect(timeoutIndex).toBeGreaterThanOrEqual(0);
      expect(rawArgs[timeoutIndex + 1]).toBe("42000");
      expect(rawArgs[timeoutIndex + 1]).not.toBe("999999");
    } finally {
      if (savedTimeout === undefined) {
        delete process.env["NEWMAN_TIMEOUT"];
      } else {
        process.env["NEWMAN_TIMEOUT"] = savedTimeout;
      }
    }
  });

  it("NEWMAN_STRICT_MODE from injected env overrides process.env", async () => {
    const {root, reportDir} = await scaffoldAll();
    tempRoot = root;
    const {runner, calls} = createFakeRunner();

    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("test", {color: false, sink});

    const savedStrict = process.env["NEWMAN_STRICT_MODE"];
    try {
      // Set conflicting process.env: strict OFF
      process.env["NEWMAN_STRICT_MODE"] = "false";

      const {main} = await import("./test-e2e.ts");
      const code = await main("backend", logger, {
        runner,
        cwd: root,
        env: {
          E2E_TEST_AUTH_TOKEN: FAKE_TOKEN,
          NEWMAN_REPORT_DIR: reportDir,
          NEWMAN_STRICT_MODE: "true",
        },
      });

      expect(code).toBe(0);
      const rawArgs = calls[0]!.command.args;
      // The injected env says strict=true, so --bail must be present
      expect(rawArgs).toContain("--bail");
    } finally {
      if (savedStrict === undefined) {
        delete process.env["NEWMAN_STRICT_MODE"];
      } else {
        process.env["NEWMAN_STRICT_MODE"] = savedStrict;
      }
    }
  });

  it("NEWMAN_TIMEOUT_REQUEST from injected env overrides process.env", async () => {
    const {root, reportDir} = await scaffoldAll();
    tempRoot = root;
    const {runner, calls} = createFakeRunner();

    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("test", {color: false, sink});

    const savedValue = process.env["NEWMAN_TIMEOUT_REQUEST"];
    try {
      process.env["NEWMAN_TIMEOUT_REQUEST"] = "888888";

      const {main} = await import("./test-e2e.ts");
      const code = await main("backend", logger, {
        runner,
        cwd: root,
        env: {
          E2E_TEST_AUTH_TOKEN: FAKE_TOKEN,
          NEWMAN_REPORT_DIR: reportDir,
          NEWMAN_TIMEOUT_REQUEST: "5000",
        },
      });

      expect(code).toBe(0);
      const rawArgs = calls[0]!.command.args;
      const index = rawArgs.indexOf("--timeout-request");
      expect(index).toBeGreaterThanOrEqual(0);
      expect(rawArgs[index + 1]).toBe("5000");
      expect(rawArgs[index + 1]).not.toBe("888888");
    } finally {
      if (savedValue === undefined) {
        delete process.env["NEWMAN_TIMEOUT_REQUEST"];
      } else {
        process.env["NEWMAN_TIMEOUT_REQUEST"] = savedValue;
      }
    }
  });
});

describe("test-e2e: report path/cwd guarantee", () => {
  it("default e2e-logs directory resolves under injected cwd", async () => {
    const {root} = await scaffoldAll();
    tempRoot = root;
    const {runner, calls} = createFakeRunner();

    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("test", {color: false, sink});

    const {main} = await import("./test-e2e.ts");
    const code = await main("backend", logger, {
      runner,
      cwd: root,
      // No NEWMAN_REPORT_DIR — should default to e2e-logs under root
      env: {E2E_TEST_AUTH_TOKEN: FAKE_TOKEN},
    });

    expect(code).toBe(0);
    const rawArgs = calls[0]!.command.args;

    // Every reporter path argument must be absolute and start with the fixture root
    const jsonExportIndex = rawArgs.indexOf("--reporter-json-export");
    const junitExportIndex = rawArgs.indexOf("--reporter-junit-export");
    expect(jsonExportIndex).toBeGreaterThanOrEqual(0);
    expect(junitExportIndex).toBeGreaterThanOrEqual(0);

    const jsonPath = rawArgs[jsonExportIndex + 1]!;
    const junitPath = rawArgs[junitExportIndex + 1]!;

    expect(isAbsolute(jsonPath)).toBe(true);
    expect(isAbsolute(junitPath)).toBe(true);
    // Both paths must be under the injected cwd, not process.cwd
    expect(jsonPath.startsWith(root)).toBe(true);
    expect(junitPath.startsWith(root)).toBe(true);
    expect(jsonPath).toContain("e2e-logs");
    expect(junitPath).toContain("e2e-logs");
  });

  it("explicit NEWMAN_REPORT_DIR semantics are preserved", async () => {
    const {root, reportDir} = await scaffoldAll();
    tempRoot = root;
    const {runner, calls} = createFakeRunner();

    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("test", {color: false, sink});

    const {main} = await import("./test-e2e.ts");
    const code = await main("backend", logger, {
      runner,
      cwd: root,
      env: {E2E_TEST_AUTH_TOKEN: FAKE_TOKEN, NEWMAN_REPORT_DIR: reportDir},
    });

    expect(code).toBe(0);
    const rawArgs = calls[0]!.command.args;

    const jsonExportIndex = rawArgs.indexOf("--reporter-json-export");
    const junitExportIndex = rawArgs.indexOf("--reporter-junit-export");
    const jsonPath = rawArgs[jsonExportIndex + 1]!;
    const junitPath = rawArgs[junitExportIndex + 1]!;

    // Explicit absolute NEWMAN_REPORT_DIR should be used directly
    expect(jsonPath.startsWith(reportDir)).toBe(true);
    expect(junitPath.startsWith(reportDir)).toBe(true);
  });
});
