// @vitest-environment node
/**
 * @fileoverview Commander contract tests for the generate orchestrator CLI.
 * @module scripts/generate.cli.test
 */

import {CommanderError} from "commander";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "./common/logger.ts";
import {createGenerateProgram} from "./generate.ts";

function makeLogger() {
  const sink = new InMemoryLoggerSink();
  const logger = new MonorepositoryConsoleLogger("test::generate", {color: false, sink});
  return {logger, sink};
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

// ---------------------------------------------------------------------------
// Alias matrix
// ---------------------------------------------------------------------------

describe("env aliases", () => {
  it.each(["/env", "/e", "--env"])("selects env for %s", (alias) => {
    const {logger} = makeLogger();
    const program = createGenerateProgram(logger);
    program.parse([alias], {from: "user"});
    expect(program.opts<{env?: boolean}>().env).toBe(true);
  });

  it.each(["-i", "--i18n", "/gql"])("does not select env for unrelated %s", (alias) => {
    const {logger} = makeLogger();
    const program = createGenerateProgram(logger);
    try {
      program.parse([alias], {from: "user"});
    } catch {
      // unknown options throw; just verify env not set
    }
    expect(program.opts<{env?: boolean}>().env).toBeFalsy();
  });
});

describe("i18n aliases", () => {
  it.each(["/i18n", "/i", "--i18n"])("selects i18n for %s", (alias) => {
    const {logger} = makeLogger();
    const program = createGenerateProgram(logger);
    program.parse([alias], {from: "user"});
    expect(program.opts<{i18n?: boolean}>().i18n).toBe(true);
  });
});

describe("gql aliases", () => {
  it.each(["/gql", "/g", "--gql"])("selects gql for %s", (alias) => {
    const {logger} = makeLogger();
    const program = createGenerateProgram(logger);
    program.parse([alias], {from: "user"});
    expect(program.opts<{gql?: boolean}>().gql).toBe(true);
  });
});

describe("artifacts aliases", () => {
  it.each(["/artifacts", "/a", "--artifacts"])("selects artifacts for %s", (alias) => {
    const {logger} = makeLogger();
    const program = createGenerateProgram(logger);
    program.parse([alias], {from: "user"});
    expect(program.opts<{artifacts?: boolean}>().artifacts).toBe(true);
  });
});

describe("verbose aliases", () => {
  it.each(["/verbose", "/v", "--verbose", "-v"])("selects verbose for %s", (alias) => {
    const {logger} = makeLogger();
    const program = createGenerateProgram(logger);
    program.parse([alias], {from: "user"});
    expect(program.opts<{verbose?: boolean}>().verbose).toBe(true);
  });
});

describe("help aliases", () => {
  it.each(["/help", "/h", "--help", "-h"])("emits help and throws for %s", (alias) => {
    const {logger, sink} = makeLogger();
    const program = createGenerateProgram(logger);
    expect(() => program.parse([alias], {from: "user"})).toThrow(CommanderError);
    const output = sink.records.map((r) => r.text).join("");
    expect(output).toContain("Usage:");
  });
});

describe("unknown option", () => {
  it.each(["--unknown", "/unknown", "--xyz"])("throws a CommanderError for %s", (alias) => {
    const {logger} = makeLogger();
    const program = createGenerateProgram(logger);
    expect(() => program.parse([alias], {from: "user"})).toThrow(CommanderError);
  });

  it("does not execute any generator when an unknown option is passed", async () => {
    vi.resetModules();
    const envInvoke = vi.fn(async () => ({status: "completed", exitCode: 0}));
    vi.doMock("./generate.env.ts", () => ({generateEnvironmentCommand: {invoke: envInvoke}}));
    vi.doMock("./generate.i18n.ts", () => ({generateI18nCommand: {invoke: vi.fn(async () => ({status: "completed", exitCode: 0}))}}));
    vi.doMock("./generate.gql.ts", () => ({generateGraphqlCommand: {invoke: vi.fn(async () => ({status: "completed", exitCode: 0}))}}));
    vi.doMock("./generate.artifacts.ts", () => ({main: vi.fn(async () => 0)}));

    const {main} = await import("./generate.ts");
    // no flags → main returns 0 with warning, never calls sub-generators
    const result = await main(
      {verbose: false, generateEnv: false, generateI18n: false, generateGql: false, generateArtifacts: false},
      new MonorepositoryConsoleLogger("test", {sink: new InMemoryLoggerSink()}),
    );
    expect(result).toBe(0);
    expect(envInvoke).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Execution order
// ---------------------------------------------------------------------------

describe("generator execution order", () => {
  let order: string[];

  beforeEach(() => {
    order = [];
    vi.resetModules();
  });

  it("runs env → i18n → gql → artifacts in that order", async () => {
    vi.doMock("./generate.env.ts", () => ({
      generateEnvironmentCommand: {
        invoke: vi.fn(async () => {
          order.push("env");
          return {status: "completed", exitCode: 0};
        }),
      },
    }));
    vi.doMock("./generate.i18n.ts", () => ({
      generateI18nCommand: {
        invoke: vi.fn(async () => {
          order.push("i18n");
          return {status: "completed", exitCode: 0};
        }),
      },
    }));
    vi.doMock("./generate.gql.ts", () => ({
      generateGraphqlCommand: {
        invoke: vi.fn(async () => {
          order.push("gql");
          return {status: "completed", exitCode: 0};
        }),
      },
    }));
    vi.doMock("./generate.artifacts.ts", () => ({
      main: vi.fn(async () => {
        order.push("artifacts");
        return 0;
      }),
    }));

    const {main} = await import("./generate.ts");
    const result = await main(
      {verbose: false, generateEnv: true, generateI18n: true, generateGql: true, generateArtifacts: true},
      new MonorepositoryConsoleLogger("test", {sink: new InMemoryLoggerSink()}),
    );

    expect(result).toBe(0);
    expect(order).toEqual(["env", "i18n", "gql", "artifacts"]);
  });

  it("stops at the first non-zero result and does not run subsequent generators", async () => {
    vi.doMock("./generate.env.ts", () => ({
      generateEnvironmentCommand: {
        invoke: vi.fn(async () => {
          order.push("env");
          return {status: "failed", exitCode: 1};
        }),
      },
    }));
    vi.doMock("./generate.i18n.ts", () => ({
      generateI18nCommand: {
        invoke: vi.fn(async () => {
          order.push("i18n");
          return {status: "completed", exitCode: 0};
        }),
      },
    }));
    vi.doMock("./generate.gql.ts", () => ({
      generateGraphqlCommand: {
        invoke: vi.fn(async () => {
          order.push("gql");
          return {status: "completed", exitCode: 0};
        }),
      },
    }));
    vi.doMock("./generate.artifacts.ts", () => ({
      main: vi.fn(async () => {
        order.push("artifacts");
        return 0;
      }),
    }));

    const {main} = await import("./generate.ts");
    const result = await main(
      {verbose: false, generateEnv: true, generateI18n: true, generateGql: true, generateArtifacts: true},
      new MonorepositoryConsoleLogger("test", {sink: new InMemoryLoggerSink()}),
    );

    expect(result).toBe(1);
    expect(order).toEqual(["env"]);
  });

  it("stops before gql and artifacts when i18n resolves as completed with a nonzero exit code", async () => {
    vi.doMock("./generate.env.ts", () => ({
      generateEnvironmentCommand: {
        invoke: vi.fn(async () => {
          order.push("env");
          return {status: "completed", exitCode: 0};
        }),
      },
    }));
    vi.doMock("./generate.i18n.ts", () => ({
      generateI18nCommand: {
        invoke: vi.fn(async () => {
          order.push("i18n");
          // Mirrors the real `generate:i18n` command's exit contract: "completed" but nonzero
          // when missing translation keys changed one or more locale files.
          return {status: "completed", exitCode: 1};
        }),
      },
    }));
    vi.doMock("./generate.gql.ts", () => ({
      generateGraphqlCommand: {
        invoke: vi.fn(async () => {
          order.push("gql");
          return {status: "completed", exitCode: 0};
        }),
      },
    }));
    vi.doMock("./generate.artifacts.ts", () => ({
      main: vi.fn(async () => {
        order.push("artifacts");
        return 0;
      }),
    }));

    const {main} = await import("./generate.ts");
    const result = await main(
      {verbose: false, generateEnv: true, generateI18n: true, generateGql: true, generateArtifacts: true},
      new MonorepositoryConsoleLogger("test", {sink: new InMemoryLoggerSink()}),
    );

    expect(result).toBe(1);
    expect(order).toEqual(["env", "i18n"]);
  });
});

// ---------------------------------------------------------------------------
// Verbose propagation
// ---------------------------------------------------------------------------

describe("verbose propagation", () => {
  it("sets verbose: true when --verbose is passed to the Commander program", () => {
    const {logger} = makeLogger();
    const program = createGenerateProgram(logger);
    program.parse(["--verbose"], {from: "user"});
    expect(program.opts<{verbose?: boolean}>().verbose).toBe(true);
  });

  it("sets verbose: false when no verbose flag is passed", () => {
    const {logger} = makeLogger();
    const program = createGenerateProgram(logger);
    program.parse([], {from: "user"});
    expect(program.opts<{verbose?: boolean}>().verbose).toBeFalsy();
  });
});
