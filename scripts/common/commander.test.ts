// @vitest-environment node
/**
 * @fileoverview Contract tests for the declarative legacy command host.
 * @module scripts/common/commander.test
 */

import {describe, expect, it} from "vitest";

import {
  CommandInputError,
  MonorepoCommand,
  toJsonValue,
  type CommandContext,
  type CommandInvoker,
  type CommandRuntimeFactory,
} from "./commander.ts";
import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "./logger.ts";
import {RunnerError} from "./runner.ts";
import {
  CommandCancellation,
  FILE_SYSTEM_MAX_BYTES_EXCEEDED_CODE,
  FileSystemError,
  HttpError,
  type Clock,
  type CommandRuntime,
} from "./runtime.ts";
import {
  createHttpResponse,
  createMemoryFileSystem,
  createProcessRunner,
  createRepositoryFixtureFileSystem,
  createTestRuntimeFactory,
  repositoryFixtureRoot,
} from "./runtime.testing.ts";

/** Clock whose `delay` never resolves and only rejects once the supplied signal aborts. */
const abortAwareTestClock: Clock = {
  monotonicNow: () => 0,
  isoTimestamp: () => "2025-06-01T00:00:00.000Z",
  delay: (_milliseconds, signal) =>
    new Promise<void>((_resolve, reject) => {
      const rejectAbort = (): void => {
        reject(new DOMException("Aborted", "AbortError"));
      };
      if (signal?.aborted === true) {
        rejectAbort();
        return;
      }
      signal?.addEventListener("abort", rejectAbort, {once: true});
    }),
};

function createHumanLogger(): Readonly<{logger: MonorepositoryConsoleLogger; sink: InMemoryLoggerSink}> {
  const sink = new InMemoryLoggerSink();
  return {logger: new MonorepositoryConsoleLogger("test", {color: false, sink}), sink};
}

function createJsonLogger(): Readonly<{logger: MonorepositoryConsoleLogger; sink: InMemoryLoggerSink}> {
  const sink = new InMemoryLoggerSink();
  return {logger: new MonorepositoryConsoleLogger("test", {mode: "json", color: false, sink}), sink};
}

describe("toJsonValue", () => {
  it("converts nested plain objects, arrays, and primitives", () => {
    expect(
      toJsonValue({
        name: "doctor",
        score: 75,
        healthy: false,
        missing: null,
        rows: [1, "two", true, null, {nested: [{deep: "value"}]}],
      }),
    ).toEqual({
      name: "doctor",
      score: 75,
      healthy: false,
      missing: null,
      rows: [1, "two", true, null, {nested: [{deep: "value"}]}],
    });
  });

  it("accepts a null prototype record and a bare primitive", () => {
    const record = Object.create(null) as Record<string, unknown>;
    record["value"] = 1;

    expect(toJsonValue(record)).toEqual({value: 1});
    expect(toJsonValue("text")).toBe("text");
  });

  it.each<readonly [string, unknown]>([
    ["undefined", undefined],
    ["a nested undefined", {value: undefined}],
    ["an array hole", [1, undefined]],
    ["a bigint", 10n],
    ["a function", (): void => undefined],
    ["a symbol", Symbol("token")],
    ["a Date", new Date(0)],
    ["a Map", new Map()],
    ["a class instance", new CommandInputError("nope")],
    ["a non-finite number", Number.POSITIVE_INFINITY],
  ])("rejects %s", (_label, value) => {
    expect(() => toJsonValue(value)).toThrow(/not JSON-serializable/u);
  });

  it("rejects a cyclic structure instead of overflowing the stack", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic["self"] = cyclic;

    expect(() => toJsonValue(cyclic)).toThrow(/circular/u);
  });
});

describe("MonorepoCommand lifecycle", () => {
  it("maps a CommandInputError raised during execution to exit code two", async () => {
    const {logger, sink} = createHumanLogger();
    const command = new MonorepoCommand(
      {
        metadata: {name: "sample"},
        execute: async () => {
          throw new CommandInputError("--engine must be rancher or podman.");
        },
        completion: () => ({exitCode: 0}),
      },
      createTestRuntimeFactory({logger}),
    );

    const execution = await command.invoke({}, {presentation: "human"});

    expect(execution).toMatchObject({
      status: "failed",
      exitCode: 2,
      failure: {kind: "usage", message: "--engine must be rancher or podman."},
    });
    expect(sink.records.map((record) => record.text).join("")).toContain("--engine must be rancher or podman.");
  });

  it("renders the human completion only after cleanup and returns the completion exit code", async () => {
    const {logger, sink} = createHumanLogger();
    const order: string[] = [];
    const command = new MonorepoCommand(
      {
        metadata: {name: "sample"},
        execute: async ({runtime}) => {
          runtime.cleanup.register("temporary directory", () => {
            order.push("cleanup");
          });
          return {score: 40};
        },
        completion: (report) => ({
          exitCode: report.score === 100 ? 0 : 1,
          human: (commandLogger) => {
            order.push("render");
            commandLogger.info(`score ${String(report.score)}`);
          },
        }),
      },
      createTestRuntimeFactory({logger}),
    );

    const execution = await command.invoke({}, {presentation: "human"});

    expect(execution).toEqual({status: "completed", value: {score: 40}, exitCode: 1});
    expect(order).toEqual(["cleanup", "render"]);
    expect(sink.records.map((record) => record.text)).toEqual(["[arolariu::test] ℹ️ score 40"]);
  });

  it("emits exactly one JSON document when the command selects JSON presentation", async () => {
    const {logger, sink} = createJsonLogger();
    const command = new MonorepoCommand(
      {
        metadata: {name: "sample"},
        execute: async () => ({score: 100}),
        completion: (report) => ({exitCode: 0, json: toJsonValue(report)}),
      },
      createTestRuntimeFactory({logger}),
    );

    const execution = await command.invoke({}, {presentation: "json"});

    expect(execution).toEqual({status: "completed", value: {score: 100}, exitCode: 0});
    expect(sink.records).toEqual([{stream: "stdout", text: '{\n  "score": 100\n}', write: false}]);
  });

  it("fails internally when JSON presentation is selected without a JSON document", async () => {
    const {logger, sink} = createJsonLogger();
    const command = new MonorepoCommand(
      {
        metadata: {name: "sample"},
        execute: async () => ({score: 100}),
        completion: () => ({exitCode: 0}),
      },
      createTestRuntimeFactory({logger}),
    );

    const execution = await command.invoke({}, {presentation: "json"});

    expect(execution).toMatchObject({status: "failed", exitCode: 1, failure: {kind: "internal"}});
    expect(sink.records.every((record) => !record.text.startsWith("{"))).toBe(true);
    expect(sink.records).toHaveLength(1);
  });

  it.each<readonly [string, unknown, string, 1 | 2 | 130 | 143]>([
    [
      "runner failures",
      new RunnerError({command: "npm", args: ["run", "build"]}, {kind: "exited", exitCode: 1, stdout: "", stderr: "boom", durationMs: 4}),
      "operational",
      1,
    ],
    ["HTTP failures", new HttpError("unreachable", {url: new URL("https://example.test/"), method: "GET"}), "operational", 1],
    ["filesystem failures", new FileSystemError("readText", "C:/missing.json", "missing"), "operational", 1],
    ["unexpected errors", new Error("unexpected"), "operational", 1],
    ["non-error throws", "plain string failure", "internal", 1],
    ["cancellation requests", new CommandCancellation("Interrupted by SIGINT.", 130), "cancelled", 130],
    ["termination requests", new CommandCancellation("Terminated by SIGTERM.", 143), "cancelled", 143],
  ])("normalizes %s", async (_label, thrown, kind, exitCode) => {
    const {logger, sink} = createHumanLogger();
    const command = new MonorepoCommand(
      {
        metadata: {name: "sample"},
        execute: async () => {
          throw thrown;
        },
        completion: () => ({exitCode: 0}),
      },
      createTestRuntimeFactory({logger}),
    );

    const execution = await command.invoke({}, {presentation: "human"});

    expect(execution).toMatchObject({
      status: exitCode === 130 || exitCode === 143 ? "cancelled" : "failed",
      exitCode,
      failure: {kind},
    });
    expect(sink.records).toHaveLength(1);
    expect(sink.records[0]?.stream).toBe("stderr");
  });

  it("maps a prompt AbortError to a cancelled outcome", async () => {
    const command = new MonorepoCommand(
      {
        metadata: {name: "sample"},
        execute: async () => {
          const error = new Error("Prompt cancelled by user.");
          error.name = "AbortError";
          throw error;
        },
        completion: () => ({exitCode: 0}),
      },
      createTestRuntimeFactory(),
    );

    await expect(command.invoke({}, {presentation: "human"})).resolves.toMatchObject({status: "cancelled", exitCode: 130});
  });

  it("replaces a successful presentation with an aggregated cleanup failure", async () => {
    const {logger, sink} = createHumanLogger();
    const command = new MonorepoCommand(
      {
        metadata: {name: "sample"},
        execute: async ({runtime}) => {
          runtime.cleanup.register("temporary directory", () => {
            throw new Error("could not remove directory");
          });
          return {ok: true};
        },
        completion: () => ({
          exitCode: 0,
          human: (commandLogger) => {
            commandLogger.info("success must not be rendered");
          },
        }),
      },
      createTestRuntimeFactory({logger}),
    );

    const execution = await command.invoke({}, {presentation: "human"});

    expect(execution).toMatchObject({
      status: "failed",
      exitCode: 1,
      failure: {kind: "cleanup", evidence: ["temporary directory: could not remove directory"]},
    });
    expect(sink.records.some((record) => record.text.includes("success must not be rendered"))).toBe(false);
  });

  it("preserves the primary failure and appends cleanup evidence", async () => {
    const command = new MonorepoCommand(
      {
        metadata: {name: "sample"},
        execute: async ({runtime}) => {
          runtime.cleanup.register("temporary directory", () => {
            throw new Error("could not remove directory");
          });
          throw new Error("build failed");
        },
        completion: () => ({exitCode: 0}),
      },
      createTestRuntimeFactory(),
    );

    await expect(command.invoke({}, {presentation: "human"})).resolves.toMatchObject({
      status: "failed",
      exitCode: 1,
      failure: {
        kind: "operational",
        message: "build failed",
        evidence: ["temporary directory: could not remove directory"],
      },
    });
  });
});

describe("MonorepoCommand.invoke", () => {
  it("preserves completed output with exit code one", async () => {
    const command = new MonorepoCommand(
      {
        metadata: {name: "doctor"},
        execute: async () => ({score: 75}),
        completion: (report) => ({
          exitCode: report.score === 100 ? 0 : 1,
          json: report,
        }),
      },
      createTestRuntimeFactory(),
    );

    await expect(command.invoke({quick: true})).resolves.toEqual({
      status: "completed",
      value: {score: 75},
      exitCode: 1,
    });
  });

  it("defaults to silent presentation so a nested command emits nothing", async () => {
    const {logger, sink} = createHumanLogger();
    const command = new MonorepoCommand(
      {
        metadata: {name: "doctor"},
        execute: async () => ({score: 10}),
        completion: (report) => ({
          exitCode: 1,
          json: report,
          human: (commandLogger) => {
            commandLogger.info("must not render");
          },
        }),
      },
      createTestRuntimeFactory({logger}),
    );

    await expect(command.invoke({})).resolves.toMatchObject({status: "completed", exitCode: 1});
    expect(sink.records).toEqual([]);
  });

  it("links a standalone invoke caller signal", async () => {
    const controller = new AbortController();
    const command = new MonorepoCommand(
      {
        metadata: {name: "wait"},
        execute: ({runtime}) => runtime.clock.delay(60_000, runtime.signal),
        completion: () => ({exitCode: 0}),
      },
      createTestRuntimeFactory({clock: abortAwareTestClock}),
    );

    const pending = command.invoke({}, {signal: controller.signal});
    controller.abort();

    await expect(pending).resolves.toMatchObject({
      status: "cancelled",
      exitCode: 130,
    });
  });

  it("derives a nested child runtime that shares parent environment, inspection, and redactions", async () => {
    const factory = createTestRuntimeFactory();
    const parentRuntime = await factory.createRoot({presentation: "human", registerProcessSignals: false});
    const parentContext: CommandContext = {runtime: parentRuntime, presentation: "human"};
    let childRuntime: CommandRuntime | undefined;

    const child = new MonorepoCommand(
      {
        metadata: {name: "generate"},
        execute: async ({runtime}) => {
          childRuntime = runtime;
          runtime.logger.redact("child-secret");
          return null;
        },
        completion: () => ({exitCode: 0}),
      },
      factory,
    );

    await child.invoke({}, {parent: parentContext});

    expect(childRuntime?.environment).toBe(parentRuntime.environment);
    expect(childRuntime?.inspection).toBe(parentRuntime.inspection);
    expect(childRuntime?.cleanup).not.toBe(parentRuntime.cleanup);
    expect(childRuntime?.signal).not.toBe(parentRuntime.signal);
    expect(childRuntime?.logger).not.toBe(parentRuntime.logger);
    expect(childRuntime?.runner).not.toBe(parentRuntime.runner);
    expect(parentRuntime.logger.sanitize("child-secret")).toBe("[REDACTED]");
  });

  it("drains only child cleanup before returning and leaves parent resources alive", async () => {
    const factory = createTestRuntimeFactory();
    const parentRuntime = await factory.createRoot({presentation: "human", registerProcessSignals: false});
    const parentContext: CommandContext = {runtime: parentRuntime, presentation: "human"};
    const order: string[] = [];
    parentRuntime.cleanup.register("parent", () => {
      order.push("parent");
    });

    const child = new MonorepoCommand(
      {
        metadata: {name: "generate"},
        execute: async ({runtime}) => {
          runtime.cleanup.register("child", () => {
            order.push("child");
          });
          return null;
        },
        completion: () => ({exitCode: 0}),
      },
      factory,
    );

    await child.invoke({}, {parent: parentContext});

    expect(order).toEqual(["child"]);

    await parentRuntime.cleanup.drain();

    expect(order).toEqual(["child", "parent"]);
  });

  it("cancels a child when the parent aborts without the child aborting the parent", async () => {
    const controller = new AbortController();
    const factory = createTestRuntimeFactory({clock: abortAwareTestClock});
    const parentRuntime = await factory.createRoot({
      presentation: "human",
      registerProcessSignals: false,
      signal: controller.signal,
    });
    const parentContext: CommandContext = {runtime: parentRuntime, presentation: "human"};

    const child = new MonorepoCommand(
      {
        metadata: {name: "wait"},
        execute: ({runtime}) => runtime.clock.delay(60_000, runtime.signal),
        completion: () => ({exitCode: 0}),
      },
      factory,
    );

    const pending = child.invoke({}, {parent: parentContext});
    controller.abort();

    await expect(pending).resolves.toMatchObject({status: "cancelled", exitCode: 130});
    expect(parentRuntime.signal.aborted).toBe(true);
  });

  it("never aborts the parent when only the child invocation signal aborts", async () => {
    const childController = new AbortController();
    const factory = createTestRuntimeFactory({clock: abortAwareTestClock});
    const parentRuntime = await factory.createRoot({presentation: "human", registerProcessSignals: false});
    const parentContext: CommandContext = {runtime: parentRuntime, presentation: "human"};

    const child = new MonorepoCommand(
      {
        metadata: {name: "wait"},
        execute: ({runtime}) => runtime.clock.delay(60_000, runtime.signal),
        completion: () => ({exitCode: 0}),
      },
      factory,
    );

    const pending = child.invoke({}, {parent: parentContext, signal: childController.signal});
    childController.abort();

    await expect(pending).resolves.toMatchObject({status: "cancelled", exitCode: 130});
    expect(parentRuntime.signal.aborted).toBe(false);
  });

  it("exposes commands through the narrow invoker contract", async () => {
    const command = new MonorepoCommand(
      {
        metadata: {name: "doctor"},
        execute: async () => ({score: 100}),
        completion: () => ({exitCode: 0}),
      },
      createTestRuntimeFactory(),
    );
    const invoker: CommandInvoker<Readonly<{quick: boolean}>, Readonly<{score: number}>> = command;

    await expect(invoker.invoke({quick: true})).resolves.toMatchObject({status: "completed", exitCode: 0});
  });

  it("lazily loads the production Node runtime factory when none is injected", async () => {
    let observedRuntime: CommandRuntime | undefined;
    const command = new MonorepoCommand({
      metadata: {name: "sample"},
      execute: async ({runtime}) => {
        observedRuntime = runtime;
        return null;
      },
      completion: () => ({exitCode: 0}),
    });

    await expect(command.invoke({verbose: true})).resolves.toEqual({status: "completed", value: null, exitCode: 0});
    expect(observedRuntime?.signal.aborted).toBe(false);
    expect(observedRuntime?.environment.cwd).toBe(process.cwd());
  });

  it("normalizes a throwing human completion into a failed outcome", async () => {
    const {logger, sink} = createHumanLogger();
    const command = new MonorepoCommand(
      {
        metadata: {name: "sample"},
        execute: async () => ({ok: true}),
        completion: () => ({
          exitCode: 0,
          human: () => {
            throw new Error("render exploded");
          },
        }),
      },
      createTestRuntimeFactory({logger}),
    );

    const execution = await command.invoke({}, {presentation: "human"});

    expect(execution).toMatchObject({status: "failed", exitCode: 1, failure: {kind: "operational", message: "render exploded"}});
    expect(sink.records.map((record) => record.text)).toEqual(["[arolariu::test] ⛔ render exploded"]);
  });
});

describe("command lifecycle scope failures", () => {
  it("normalizes a runtime creation failure raised by invoke() without any logger", async () => {
    const factory: CommandRuntimeFactory = {
      ...createTestRuntimeFactory(),
      createRoot: () => Promise.reject(new Error("runtime scope creation failed")),
    };
    const command = new MonorepoCommand(
      {
        metadata: {name: "sample"},
        execute: async () => undefined,
        completion: () => ({exitCode: 0}),
      },
      factory,
    );

    await expect(command.invoke({})).resolves.toMatchObject({
      status: "failed",
      exitCode: 1,
      failure: {kind: "operational", message: "runtime scope creation failed"},
    });
  });

  it("normalizes a rejecting cleanup registry instead of leaking it past the boundary", async () => {
    const factory = createTestRuntimeFactory({
      cleanup: {
        register: () => (): void => undefined,
        drain: () => Promise.reject(new Error("cleanup registry exploded")),
      },
    });
    const command = new MonorepoCommand(
      {
        metadata: {name: "sample"},
        execute: async () => ({ok: true}),
        completion: () => ({exitCode: 0}),
      },
      factory,
    );

    await expect(command.invoke({})).resolves.toMatchObject({
      status: "failed",
      exitCode: 1,
      failure: {kind: "cleanup", evidence: ["cleanup registry: cleanup registry exploded"]},
    });
  });
});

describe("runtime test fakes", () => {
  it("seeds the repository identity in the fixture filesystem without real I/O", async () => {
    const files = createRepositoryFixtureFileSystem({
      [`${repositoryFixtureRoot}/scripts/common/sample.json`]: "{}",
    });

    const identity: unknown = JSON.parse(await files.readText(`${repositoryFixtureRoot}/package.json`));

    expect(identity).toEqual({name: "@arolariu/monorepo"});
    await expect(files.readText(`${repositoryFixtureRoot}/scripts/common/sample.json`)).resolves.toBe("{}");
  });

  it("rejects rather than throwing synchronously for a missing in-memory path", async () => {
    const files = createMemoryFileSystem();

    await expect(files.readText("C:/missing/report.json")).rejects.toBeInstanceOf(FileSystemError);
    await expect(files.exists("C:/missing/report.json")).resolves.toBe(false);
    await expect(files.inspect("C:/missing/report.json")).resolves.toEqual({kind: "missing", size: 0});
  });

  it("normalizes Windows and POSIX separators onto the same in-memory entry", async () => {
    const files = createMemoryFileSystem({"C:/repo/nested/file.txt": "content"});

    await expect(files.readText("C:\\repo\\nested\\..\\nested\\file.txt")).resolves.toBe("content");
    await expect(files.realPath("C:\\repo\\nested\\file.txt")).resolves.toBe("C:/repo/nested/file.txt");
    await expect(files.readDirectory("C:/repo")).resolves.toEqual([{name: "nested", kind: "directory"}]);
    await expect(files.glob("**/*.txt", {cwd: "C:/repo", onlyFiles: true})).resolves.toEqual(["C:/repo/nested/file.txt"]);
  });

  it("removes exactly the temporary directory a handle created", async () => {
    const files = createMemoryFileSystem();
    const first = await files.createTemporaryDirectory("build-");
    const second = await files.createTemporaryDirectory("build-");
    await files.writeText(`${first.path}/artifact.txt`, "kept");

    await second.remove();

    expect(first.path).not.toBe(second.path);
    await expect(files.exists(second.path)).resolves.toBe(false);
    await expect(files.readText(`${first.path}/artifact.txt`)).resolves.toBe("kept");
  });

  it("bounds in-memory reads with the shared max-bytes error code", async () => {
    const files = createMemoryFileSystem({"/repo/large.bin": "0123456789"});

    await expect(files.readBytes("/repo/large.bin", {maximumBytes: 4})).rejects.toMatchObject({
      code: FILE_SYSTEM_MAX_BYTES_EXCEEDED_CODE,
    });
    await expect(files.readBytes("/repo/large.bin", {maximumBytes: 10})).resolves.toHaveLength(10);
  });

  it("records process runner calls and replays scripted outcomes", async () => {
    const runner = createProcessRunner([{kind: "exited", exitCode: 3, stdout: "", stderr: "nope", durationMs: 1}]);

    const first = await runner.run({command: "npm", args: ["run", "build"]});
    const second = await runner.run({command: "npm", args: ["run", "test"]});

    expect(first).toMatchObject({kind: "exited", exitCode: 3});
    expect(second).toMatchObject({kind: "succeeded", exitCode: 0});
    expect(runner.calls.map(({request}) => request.args)).toEqual([
      ["run", "build"],
      ["run", "test"],
    ]);
  });

  it("builds complete HTTP responses without network access", () => {
    expect(createHttpResponse(204, "", {"content-type": "text/plain"})).toMatchObject({
      status: 204,
      ok: true,
      headers: {"content-type": "text/plain"},
      text: "",
    });
    expect(createHttpResponse(500, "boom").ok).toBe(false);
  });
});
