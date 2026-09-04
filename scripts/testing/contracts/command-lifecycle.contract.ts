/**
 * @fileoverview Shared command lifecycle contract: every generic-lifecycle behavior a composed
 * command must exhibit regardless of its business shape.
 * @module scripts/testing/contracts/command-lifecycle.contract
 *
 * @remarks
 * Proves the shared lifecycle template once against small throwaway fixtures, then proves the host
 * seam and `runIfMain` contract against the caller's own real command. It owns the generic
 * evidence every migrated command used to restate: fresh parser per `run()`, slash-alias
 * normalization, help before runtime creation, Commander usage exit `2`, presentation-mode gating,
 * cleanup ordering, and single-exit-code direct entry.
 */

import type {Command} from "commander";
import {describe, expect, it} from "vitest";

import {createTestRuntimeFactory} from "../../common/runtime.testing.ts";
import {ComposedTerminalPresenter} from "../../core/presentation/composed-terminal-presenter.ts";
import {RecordingTerminalPresenterSink} from "../fixtures/terminal.fixture.ts";
import {CommandConfigurationError, CommandInputError} from "../../core/command/command-execution.ts";
import type {CommandExecution, CommandExecutionContext, CommandExitCode, CommandFailureKind} from "../../core/command/command-execution.ts";
import type {
  CommandHost,
  CommandIdentityDefinition,
  CommandInputDefinition,
  DirectCommandSpecification,
  RuntimeCreationOptions,
} from "../../core/command/command-specification.ts";
import {defineCommand, type LazyMonorepoCommand} from "../../core/command/lazy-monorepo-command.ts";
import {buildCommandHost} from "../builders/command-host.builder.ts";

/** Loosely typed input every throwaway fixture in this contract decodes. */
type FixtureInput = Readonly<Record<string, unknown>>;

/** The facets one case supplies on top of {@link fixtureBase}. */
type FixtureOverrides<TOutput> = Readonly<Partial<DirectCommandSpecification<FixtureInput, TOutput>>>
  & Readonly<Pick<DirectCommandSpecification<FixtureInput, TOutput>, "execute" | "complete">>;

/** Identity and parser facets every throwaway fixture command starts from. */
const fixtureBase = {
  name: "fixture",
  description: "Fixture command.",
  configure: (): void => undefined,
  decode: (program: Command): FixtureInput => program.opts<FixtureInput>(),
} satisfies CommandIdentityDefinition & CommandInputDefinition<FixtureInput>;

/** Completion for a fixture that proves control flow rather than output. */
const noopComplete = (): Readonly<{exitCode: 0; value: undefined}> => ({exitCode: 0, value: undefined});

/** Builds a throwaway direct command from the shared base plus only the facets one case proves. */
function defineFixture<TOutput>(
  host: CommandHost,
  overrides: FixtureOverrides<TOutput>,
): LazyMonorepoCommand<FixtureInput, TOutput, never> {
  return defineCommand<FixtureInput, TOutput>({...fixtureBase, ...overrides}, {host});
}

/** Asserts one unsuccessful execution's classification and exit code. */
function expectFailure(execution: CommandExecution<unknown>, kind: CommandFailureKind, exitCode: CommandExitCode): void {
  expect(execution).toMatchObject({exitCode, failure: {kind}});
}

/** Wraps the shared test host so every runtime-scope creation and every emitted record is observable. */
function buildInstrumentedHost(mode: "human" | "json" = "human"): Readonly<{
  host: CommandHost;
  sink: RecordingTerminalPresenterSink;
  rootCalls: readonly Readonly<RuntimeCreationOptions>[];
  childCalls: readonly Readonly<{parent: CommandExecutionContext; registerProcessSignals: boolean}>[];
}> {
  const sink = new RecordingTerminalPresenterSink();
  const base = buildCommandHost({runtime: {presenter: new ComposedTerminalPresenter("test", {mode, color: false, sink})}});
  const rootCalls: Readonly<RuntimeCreationOptions>[] = [];
  const childCalls: Readonly<{parent: CommandExecutionContext; registerProcessSignals: boolean}>[] = [];
  const host: CommandHost = {
    ...base,
    loadRuntimeFactory: async (verbose) => {
      const inner = await base.loadRuntimeFactory(verbose);
      return {
        createRoot: (options) => {
          rootCalls.push(options);
          return inner.createRoot(options);
        },
        createChild: (parent, options) => {
          childCalls.push({parent, registerProcessSignals: options.registerProcessSignals});
          return inner.createChild(parent, options);
        },
      };
    },
  };
  return {host, sink, rootCalls, childCalls};
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
  const {label, createCommand, createInput, successArguments = []} = definition;
  const flagFixture = (host: CommandHost): LazyMonorepoCommand<FixtureInput, FixtureInput, never> =>
    defineFixture<FixtureInput>(host, {
      configure: (program) => {
        program.option("--flag");
      },
      execute: async (_context, input) => input,
      complete: (output) => ({exitCode: 0, value: output}),
    });

  describe(`command lifecycle contract: ${label}`, () => {
    it("parses a fresh Commander program for every run() call", async () => {
      const command = flagFixture(buildCommandHost());
      await expect(command.run(["--flag"])).resolves.toMatchObject({status: "completed", value: {flag: true}});
      await expect(command.run([])).resolves.toMatchObject({status: "completed", value: {}});
    });

    it("reads an omitted argv from the command host only", async () => {
      await expect(flagFixture(buildCommandHost({argv: ["--flag"]})).run()).resolves.toMatchObject({value: {flag: true}});
    });

    it("normalizes slash aliases but never rewrites tokens after the literal delimiter", async () => {
      let passthrough: readonly string[] = [];
      const command = defineFixture<undefined>(buildCommandHost(), {
        slashAliases: {"/v": "--verbose"},
        configure: (program) => {
          program.option("--verbose").argument("[passthrough...]");
        },
        decode: (program) => {
          passthrough = [...program.args];
          return program.opts<FixtureInput>();
        },
        execute: async () => undefined,
        complete: noopComplete,
      });
      await expect(command.run(["/v", "--", "/v", "--verbose"])).resolves.toMatchObject({status: "completed"});
      expect(passthrough).toEqual(["/v", "--verbose"]);
    });

    it("maps /h to help through the parse presenter, before any runtime is created", async () => {
      const {host, sink, rootCalls} = buildInstrumentedHost();
      const command = defineFixture<undefined>(host, {
        examples: ["npm run fixture -- --verbose"],
        execute: async () => {
          throw new Error("execute must not run for help.");
        },
        complete: noopComplete,
      });
      await expect(command.run(["/h"])).resolves.toEqual({status: "help", exitCode: 0});
      expect(rootCalls).toHaveLength(0);
      expect(sink.records.map((record) => record.text).join("")).toContain("Usage:");
    });

    it("maps a Commander usage failure to exit code two without executing", async () => {
      let executed = false;
      const command = defineFixture<undefined>(buildCommandHost(), {
        execute: async () => {
          executed = true;
          return undefined;
        },
        complete: noopComplete,
      });
      expectFailure(await command.run(["--unknown"]), "usage", 2);
      expect(executed).toBe(false);
    });

    it("maps a CommandInputError raised while decoding to exit code two", async () => {
      const command = defineFixture<undefined>(buildCommandHost(), {
        decode: () => {
          throw new CommandInputError("--engine must be rancher or podman.");
        },
        execute: async () => undefined,
        complete: noopComplete,
      });
      const execution = await command.run([]);
      expectFailure(execution, "usage", 2);
      expect(execution).toMatchObject({failure: {message: "--engine must be rancher or podman."}});
    });

    it("computes the presentation decision before cleanup drains, and emits output only after", async () => {
      const order: string[] = [];
      const command = defineFixture<Readonly<{score: number}>>(buildInstrumentedHost().host, {
        execute: async (context) => {
          context.runtime.cleanup.register("temporary directory", () => {
            order.push("cleanup");
          });
          return {score: 40};
        },
        complete: (output) => {
          order.push("decide");
          return {
            exitCode: output.score === 100 ? 0 : 1,
            value: output,
            human: () => {
              order.push("emit");
            },
          };
        },
      });
      await expect(command.run([])).resolves.toEqual({status: "completed", value: {score: 40}, exitCode: 1});
      expect(order).toEqual(["decide", "cleanup", "emit"]);
    });

    it("emits exactly one JSON document in JSON presentation", async () => {
      const {host, sink} = buildInstrumentedHost("json");
      const command = defineFixture<Readonly<{score: number}>>(host, {
        configure: (program) => {
          program.option("--json");
        },
        presentation: (input) => (input["json"] === true ? "json" : "human"),
        execute: async () => ({score: 100}),
        complete: (output) => ({exitCode: 0, value: output, json: output}),
      });
      await expect(command.run(["--json"])).resolves.toEqual({status: "completed", value: {score: 100}, exitCode: 0});
      expect(sink.records).toHaveLength(1);
      expect(sink.records[0]?.text).toContain('"score": 100');
    });

    it("fails internally when JSON presentation selects no JSON document", async () => {
      const {host, sink} = buildInstrumentedHost("json");
      const command = defineFixture<Readonly<{score: number}>>(host, {
        presentation: () => "json",
        execute: async () => ({score: 100}),
        complete: (output) => ({exitCode: 0, value: output}),
      });
      expectFailure(await command.run([]), "internal", 1);
      expect(sink.records.every((record) => !record.text.startsWith("{"))).toBe(true);
    });

    it("replaces a successful presentation with an aggregated cleanup failure and suppresses its output", async () => {
      const {host, sink} = buildInstrumentedHost();
      const command = defineFixture<Readonly<{ok: boolean}>>(host, {
        execute: async (context) => {
          context.runtime.cleanup.register("temporary directory", () => {
            throw new Error("could not remove directory");
          });
          return {ok: true};
        },
        complete: (output) => ({exitCode: 0, value: output, human: (presenter) => presenter.info("success must not be rendered")}),
      });
      const execution = await command.run([]);
      expectFailure(execution, "cleanup", 1);
      expect(execution).toMatchObject({failure: {evidence: ["temporary directory: could not remove directory"]}});
      expect(sink.records.some((record) => record.text.includes("success must not be rendered"))).toBe(false);
    });

    it("preserves the primary failure and appends cleanup evidence as secondary", async () => {
      const command = defineFixture<undefined>(buildCommandHost(), {
        execute: async (context) => {
          context.runtime.cleanup.register("temporary directory", () => {
            throw new Error("could not remove directory");
          });
          throw new Error("build failed");
        },
        complete: noopComplete,
      });
      const execution = await command.run([]);
      expectFailure(execution, "operational", 1);
      expect(execution).toMatchObject({failure: {message: "build failed", evidence: ["temporary directory: could not remove directory"]}});
    });

    it("invoke() defaults to silent presentation, registers no OS signal handler, and renders nothing", async () => {
      const {host, sink, rootCalls} = buildInstrumentedHost();
      let renderCount = 0;
      const command = defineFixture<Readonly<{score: number}>>(host, {
        execute: async () => ({score: 100}),
        complete: (output) => ({
          exitCode: 0,
          value: output,
          json: output,
          human: () => {
            renderCount += 1;
          },
        }),
      });
      await expect(command.invoke({})).resolves.toMatchObject({status: "completed", value: {score: 100}});
      expect(rootCalls).toEqual([{presentation: "silent", registerProcessSignals: false}]);
      expect(renderCount).toBe(0);
      expect(sink.records).toEqual([]);
    });

    it("forwards the invoke() parent both to the child runtime scope and to createRuntimeContext", async () => {
      const observedParents: (Readonly<CommandExecutionContext> | undefined)[] = [];
      const parentRuntime = await createTestRuntimeFactory().createRoot({presentation: "human", registerProcessSignals: false});
      const parentContext: Readonly<CommandExecutionContext> = {runtime: parentRuntime, presentation: "human"};
      const {host, childCalls} = buildInstrumentedHost();
      const command = defineFixture<undefined>(host, {
        createRuntimeContext: (baseRuntime, parent) => {
          observedParents.push(parent);
          return baseRuntime;
        },
        execute: async () => undefined,
        complete: noopComplete,
      });
      await command.invoke({}, {parent: parentContext});
      expect(observedParents).toEqual([parentContext]);
      expect(childCalls).toEqual([{parent: parentContext, registerProcessSignals: false}]);
    });

    it("throws CommandConfigurationError when constructed with neither host nor loadHost", () => {
      const build = (): unknown =>
        defineCommand<FixtureInput, undefined>({...fixtureBase, execute: async () => undefined, complete: noopComplete}, {} as never);
      expect(build).toThrow(CommandConfigurationError);
    });

    it("awaits a loadHost loader exactly once across repeated run() calls, but never with a ready host", async () => {
      let loadCount = 0;
      const loaded = defineCommand<FixtureInput, undefined>(
        {...fixtureBase, execute: async () => undefined, complete: noopComplete},
        {
          loadHost: async () => {
            loadCount += 1;
            return buildCommandHost();
          },
        },
      );
      await loaded.run([]);
      await loaded.run([]);
      await flagFixture(buildCommandHost()).run([]);
      expect(loadCount).toBe(1);
    });

    it("completes for the caller's own command, from argv and from typed input", async () => {
      await expect(createCommand(buildCommandHost()).run([...successArguments])).resolves.toMatchObject({status: "completed"});
      await expect(createCommand(buildCommandHost()).invoke(createInput())).resolves.toMatchObject({status: "completed"});
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
