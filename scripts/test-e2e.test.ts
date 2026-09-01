// @vitest-environment node
/**
 * @fileoverview Contract tests for the E2E Newman runner.
 * @module scripts/test-e2e.test
 */

import {mkdtemp, readFile, rm, writeFile, mkdir} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join, resolve} from "node:path";
import {afterEach, beforeEach, describe, expect, it} from "vitest";
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
    const {root, paths, reportDir} = await scaffoldAll();
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
    const {root, paths, reportDir} = await scaffoldAll();
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
    const {root, paths, reportDir} = await scaffoldAll();
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
