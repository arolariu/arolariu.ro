/**
 * @fileoverview Shared command lifecycle contract: every generic-lifecycle behavior a composed
 * command must exhibit regardless of its business shape.
 * @module scripts/testing/contracts/command-lifecycle.contract
 *
 * @remarks
 * Proves the shared lifecycle template (`AbstractMonorepoCommand`/`LazyMonorepoCommand`) once
 * against small throwaway fixtures built with `defineCommand`, then proves the host-seam and
 * direct-entrypoint contract against the caller's own real command. Owns direct-entry spawn
 * help/usage, `runIfMain` exit assignment, fresh-parser-per-`run()`, Commander unknown-option
 * usage exit `2`, and presentation-mode gating for every migrated command.
 */

import {describe, expect, it} from "vitest";

import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "../../common/logger.ts";
import {createTestRuntimeFactory} from "../../common/runtime.testing.ts";
import type {CommandExecutionContext} from "../../core/command/command-execution.ts";
import {CommandConfigurationError, CommandInputError} from "../../core/command/command-execution.ts";
import type {CommandHost, CommandRuntimeFactory} from "../../core/command/command-specification.ts";
import {defineCommand, type LazyMonorepoCommand} from "../../core/command/lazy-monorepo-command.ts";
import {buildCommandHost} from "../builders/command-host.builder.ts";

/** Identity shared by every throwaway fixture command in this contract. */
const FIXTURE_IDENTITY = {name: "fixture", description: "Fixture command."} as const;
const noConfigure = (): void => undefined;
const emptyDecode = (): Record<never, never> => ({});
const noopComplete = () => ({exitCode: 0 as const, value: undefined});

/** Builds a host instrumented to observe every `createRoot`/`createChild` call and its output. */
function buildInstrumentedHost(overrides: Readonly<{isDirectEntry?: boolean; mode?: "human" | "json"}> = {}): Readonly<{
  host: CommandHost;
  sink: InMemoryLoggerSink;
  rootCalls: readonly Readonly<{presentation: string; registerProcessSignals: boolean}>[];
  childCalls: readonly Readonly<{parent: CommandExecutionContext; registerProcessSignals: boolean}>[];
}> {
  const sink = new InMemoryLoggerSink();
  const inner = createTestRuntimeFactory({logger: new MonorepositoryConsoleLogger("test", {mode: overrides.mode ?? "human", color: false, sink})});
  const rootCalls: Readonly<{presentation: string; registerProcessSignals: boolean}>[] = [];
  const childCalls: Readonly<{parent: CommandExecutionContext; registerProcessSignals: boolean}>[] = [];
  const factory: CommandRuntimeFactory = {
    createRoot: (options) => {
      rootCalls.push(options);
      return inner.createRoot(options);
    },
    createChild: (parent, options) => {
      childCalls.push({parent, registerProcessSignals: options.registerProcessSignals});
      return inner.createChild(parent, options);
    },
  };
  const host: CommandHost = {
    argv: [],
    isDirectEntry: () => overrides.isDirectEntry ?? true,
    setExitCode: () => undefined,
    createParsePresenter: () => new MonorepositoryConsoleLogger("test", {color: false, sink}),
    loadRuntimeFactory: async () => factory,
  };
  return {host, sink, rootCalls, childCalls};
}

/** A trivial direct fixture: decodes `--flag`, has no business side effect. */
function defineFixtureCommand(host: CommandHost): LazyMonorepoCommand<Readonly<{flag?: boolean}>, Readonly<{flag?: boolean}>, never> {
  return defineCommand<Readonly<{flag?: boolean}>, Readonly<{flag?: boolean}>>(
    {
      ...FIXTURE_IDENTITY,
      configure: (program) => {
        program.option("--flag");
      },
      decode: (program) => program.opts<Readonly<{flag?: boolean}>>(),
      execute: async (_context, input) => input,
      complete: (output) => ({exitCode: 0, value: output}),
    },
    {host},
  );
}

/**
 * Runs the shared command lifecycle contract.
 *
 * @param definition - The caller's own real command, its typed input, and its declared success arguments.
 */
export function runCommandLifecycleContract<TInput, TOutput, TFailure>(
  definition: Readonly<{
    readonly label: string;
    readonly createCommand: (host: CommandHost) => LazyMonorepoCommand<TInput, TOutput, TFailure>;
    readonly createInput: () => Readonly<TInput>;
    readonly successArguments?: readonly string[];
  }>,
): void {
  const {label, createCommand, successArguments = []} = definition;

  describe(`command lifecycle contract: ${label}`, () => {
    it("parses a fresh Commander program for every run() call", async () => {
      const command = defineFixtureCommand(buildCommandHost());
      await expect(command.run(["--flag"])).resolves.toMatchObject({status: "completed", value: {flag: true}});
      await expect(command.run([])).resolves.toMatchObject({status: "completed", value: {}});
    });

    it("normalizes slash aliases but never rewrites tokens after the literal delimiter", async () => {
      let passthrough: readonly string[] = [];
      const command = defineCommand<Readonly<{verbose?: boolean}>, undefined>(
        {
          ...FIXTURE_IDENTITY,
          slashAliases: {"/v": "--verbose"},
          configure: (program) => {
            program.option("--verbose").argument("[passthrough...]");
          },
          decode: (program) => {
            passthrough = [...program.args];
            return program.opts<Readonly<{verbose?: boolean}>>();
          },
          execute: async () => undefined,
          complete: noopComplete,
        },
        {host: buildCommandHost()},
      );
      await expect(command.run(["/v", "--", "/v", "--verbose"])).resolves.toMatchObject({status: "completed"});
      expect(passthrough).toEqual(["/v", "--verbose"]);
    });

    it("maps /h to help through the parse presenter, before any runtime is created", async () => {
      const {host, sink, rootCalls} = buildInstrumentedHost();
      const command = defineCommand<Record<never, never>, undefined>(
        {
          ...FIXTURE_IDENTITY,
          examples: ["npm run fixture -- --verbose"],
          configure: noConfigure,
          decode: emptyDecode,
          execute: async () => {
            throw new Error("execute must not run for help.");
          },
          complete: noopComplete,
        },
        {host},
      );
      await expect(command.run(["/h"])).resolves.toEqual({status: "help", exitCode: 0});
      expect(rootCalls).toHaveLength(0);
      expect(sink.records.map((record) => record.text).join("")).toContain("Usage:");
    });

    it("maps a Commander usage failure to exit code two without executing", async () => {
      let executed = false;
      const command = defineCommand<Record<never, never>, undefined>(
        {
          ...FIXTURE_IDENTITY,
          configure: noConfigure,
          decode: emptyDecode,
          execute: async () => {
            executed = true;
            return undefined;
          },
          complete: noopComplete,
        },
        {host: buildCommandHost()},
      );
      await expect(command.run(["--unknown"])).resolves.toMatchObject({status: "failed", exitCode: 2, failure: {kind: "usage"}});
      expect(executed).toBe(false);
    });

    it("maps a CommandInputError raised while decoding to exit code two", async () => {
      const command = defineCommand<Record<never, never>, undefined>(
        {
          ...FIXTURE_IDENTITY,
          configure: noConfigure,
          decode: () => {
            throw new CommandInputError("--engine must be rancher or podman.");
          },
          execute: async () => undefined,
          complete: noopComplete,
        },
        {host: buildCommandHost()},
      );
      await expect(command.run([])).resolves.toMatchObject({
        status: "failed",
        exitCode: 2,
        failure: {kind: "usage", message: "--engine must be rancher or podman."},
      });
    });

    it("reads an omitted argv from the command host only", async () => {
      const command = defineFixtureCommand(buildCommandHost({argv: ["--flag"]}));
      await expect(command.run()).resolves.toMatchObject({status: "completed", value: {flag: true}});
    });

    it("computes the presentation decision before cleanup drains, and emits output only after", async () => {
      const order: string[] = [];
      const {host} = buildInstrumentedHost();
      const command = defineCommand<Record<never, never>, Readonly<{score: number}>>(
        {
          ...FIXTURE_IDENTITY,
          configure: noConfigure,
          decode: emptyDecode,
          execute: async (context) => {
            context.runtime.cleanup.register("temporary directory", () => {
              order.push("cleanup");
            });
            return {score: 40};
          },
          complete: (output) => ({
            exitCode: output.score === 100 ? 0 : 1,
            value: output,
            human: () => {
              order.push("emit");
            },
          }),
        },
        {host},
      );
      await expect(command.run([])).resolves.toEqual({status: "completed", value: {score: 40}, exitCode: 1});
      expect(order).toEqual(["cleanup", "emit"]);
    });

    it("emits exactly one JSON document in JSON presentation", async () => {
      const {host, sink} = buildInstrumentedHost({mode: "json"});
      const command = defineCommand<Readonly<{json?: boolean}>, Readonly<{score: number}>>(
        {
          ...FIXTURE_IDENTITY,
          configure: (program) => {
            program.option("--json");
          },
          decode: (program) => program.opts<Readonly<{json?: boolean}>>(),
          presentation: (input) => (input.json === true ? "json" : "human"),
          execute: async () => ({score: 100}),
          complete: (output) => ({exitCode: 0, value: output, json: output}),
        },
        {host},
      );
      await expect(command.run(["--json"])).resolves.toEqual({status: "completed", value: {score: 100}, exitCode: 0});
      expect(sink.records).toHaveLength(1);
      expect(sink.records[0]?.text).toContain('"score": 100');
    });

    it("fails internally when JSON presentation selects no JSON document", async () => {
      const {host, sink} = buildInstrumentedHost({mode: "json"});
      const command = defineCommand<Record<never, never>, Readonly<{score: number}>>(
        {
          ...FIXTURE_IDENTITY,
          configure: noConfigure,
          decode: emptyDecode,
          presentation: () => "json",
          execute: async () => ({score: 100}),
          complete: (output) => ({exitCode: 0, value: output}),
        },
        {host},
      );
      await expect(command.run([])).resolves.toMatchObject({status: "failed", exitCode: 1, failure: {kind: "internal"}});
      expect(sink.records.every((record) => !record.text.startsWith("{"))).toBe(true);
    });

    it("replaces a successful presentation with an aggregated cleanup failure and suppresses its output", async () => {
      const {host, sink} = buildInstrumentedHost();
      const command = defineCommand<Record<never, never>, Readonly<{ok: boolean}>>(
        {
          ...FIXTURE_IDENTITY,
          configure: noConfigure,
          decode: emptyDecode,
          execute: async (context) => {
            context.runtime.cleanup.register("temporary directory", () => {
              throw new Error("could not remove directory");
            });
            return {ok: true};
          },
          complete: (output) => ({exitCode: 0, value: output, human: (presenter) => presenter.info("success must not be rendered")}),
        },
        {host},
      );
      await expect(command.run([])).resolves.toMatchObject({
        status: "failed",
        exitCode: 1,
        failure: {kind: "cleanup", evidence: ["temporary directory: could not remove directory"]},
      });
      expect(sink.records.some((record) => record.text.includes("success must not be rendered"))).toBe(false);
    });

    it("preserves the primary failure and appends cleanup evidence as secondary", async () => {
      const command = defineCommand<Record<never, never>, undefined>(
        {
          ...FIXTURE_IDENTITY,
          configure: noConfigure,
          decode: emptyDecode,
          execute: async (context) => {
            context.runtime.cleanup.register("temporary directory", () => {
              throw new Error("could not remove directory");
            });
            throw new Error("build failed");
          },
          complete: noopComplete,
        },
        {host: buildCommandHost()},
      );
      await expect(command.run([])).resolves.toMatchObject({
        status: "failed",
        exitCode: 1,
        failure: {kind: "operational", message: "build failed", evidence: ["temporary directory: could not remove directory"]},
      });
    });

    it("invoke() defaults to silent presentation with no OS signal handler registered", async () => {
      const {host, rootCalls} = buildInstrumentedHost();
      const command = defineFixtureCommand(host);
      await expect(command.invoke({})).resolves.toMatchObject({status: "completed"});
      expect(rootCalls).toEqual([{presentation: "silent", registerProcessSignals: false}]);
    });

    it("forwards the invoke() parent both to the child runtime scope and to createRuntimeContext", async () => {
      const observedParents: (Readonly<CommandExecutionContext> | undefined)[] = [];
      const parentRuntime = await createTestRuntimeFactory().createRoot({presentation: "human", registerProcessSignals: false});
      const parentContext: Readonly<CommandExecutionContext> = {runtime: parentRuntime, presentation: "human"};
      const {host, childCalls} = buildInstrumentedHost();
      const command = defineCommand<Record<never, never>, undefined>(
        {
          ...FIXTURE_IDENTITY,
          configure: noConfigure,
          decode: emptyDecode,
          createRuntimeContext: (baseRuntime, parent) => {
            observedParents.push(parent);
            return baseRuntime;
          },
          execute: async () => undefined,
          complete: noopComplete,
        },
        {host},
      );
      await command.invoke({}, {parent: parentContext});
      expect(observedParents).toEqual([parentContext]);
      expect(childCalls).toEqual([{parent: parentContext, registerProcessSignals: false}]);
    });

    it("throws CommandConfigurationError when constructed with neither host nor loadHost", () => {
      expect(() =>
        defineCommand<Record<never, never>, undefined>(
          {...FIXTURE_IDENTITY, configure: noConfigure, decode: emptyDecode, execute: async () => undefined, complete: noopComplete},
          {} as never,
        ),
      ).toThrow(CommandConfigurationError);
    });

    it("awaits a loadHost loader exactly once across repeated run() calls, but never with a ready host", async () => {
      let loadCount = 0;
      const readyHostCommand = defineFixtureCommand(buildCommandHost());
      const loaded = defineCommand<Record<never, never>, undefined>(
        {...FIXTURE_IDENTITY, configure: noConfigure, decode: emptyDecode, execute: async () => undefined, complete: noopComplete},
        {
          loadHost: async () => {
            loadCount += 1;
            return buildCommandHost();
          },
        },
      );
      await loaded.run([]);
      await loaded.run([]);
      await readyHostCommand.run([]);
      expect(loadCount).toBe(1);
    });

    it("completes for the caller's own command and its declared success arguments", async () => {
      const execution = await createCommand(buildCommandHost()).run([...successArguments]);
      expect(execution.status).toBe("completed");
    });

    it("assigns exactly one exit code through runIfMain for a direct entrypoint, and none otherwise", async () => {
      const directHost = buildCommandHost({argv: [...successArguments]});
      await createCommand(directHost).runIfMain("file:///repo/scripts/fixture.ts");
      expect(directHost.assignedExitCodes).toHaveLength(1);

      const nonEntryHost = buildCommandHost({argv: [...successArguments], isDirectEntry: false});
      await createCommand(nonEntryHost).runIfMain("file:///repo/scripts/fixture.ts");
      expect(nonEntryHost.assignedExitCodes).toEqual([]);
    });
  });
}
