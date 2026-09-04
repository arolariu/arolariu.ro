// @vitest-environment node
/**
 * @fileoverview Year-loop orchestration, per-year continuation, reporting, and lazy-loading
 * evidence for the `update-exchange-rates` feature.
 * @module scripts/features/exchange-rates/workflow.test
 *
 * @remarks
 * Generic lifecycle behavior — a fresh parser per `run()`, help before any runtime scope exists,
 * Commander usage exit `2`, cleanup ordering, and single-exit-code direct entry — is owned by
 * {@link runCommandLifecycleContract}, and both public transcripts by
 * `scripts/testing/compatibility/public-command-contracts.test.ts`. Every network interaction here
 * is served by {@link buildQueuedHttpClient}: no case performs a live Frankfurter request, and the
 * recorded-loader case additionally proves a full Node-scope run never resolves the process runner
 * or the prompt provider.
 */

import {readFileSync} from "node:fs";
import {join} from "node:path";
import {describe, expect, it} from "vitest";

import type {NodeRuntimeCapabilityLoaders} from "../../adapters/node/node-lazy-capabilities.ts";
import {createNodeRuntimeScope} from "../../adapters/node/node-runtime-scope.ts";
import type {CommandExecutionContext} from "../../core/command/command-execution.ts";
import type {CommandHost, PresentableWorkflowExecutionResult} from "../../core/command/command-specification.ts";
import {defineLazyCommand} from "../../core/command/lazy-monorepo-command.ts";
import {CommandCancellation} from "../../core/runtime/cancellation.ts";
import {FileSystemError, type Clock, type FileSystem, type HttpRequest} from "../../core/runtime/runtime-capability.ts";
import type {RuntimeExecutionContext} from "../../core/runtime/runtime-execution-context.ts";
import type {WorkflowExecutionResult} from "../../core/workflow/workflow-execution-result.ts";
import {collectTypeScriptModuleReferences} from "../../testing/architecture/typescript-module-analysis.ts";
import {buildControlledClock, type ControlledClock} from "../../testing/builders/clock.builder.ts";
import {buildCommandHost} from "../../testing/builders/command-host.builder.ts";
import {buildRuntimeExecutionContext} from "../../testing/builders/runtime-context.builder.ts";
import {runCommandLifecycleContract} from "../../testing/contracts/command-lifecycle.contract.ts";
import {createMemoryFileSystem} from "../../testing/fixtures/memory-filesystem.fixture.ts";
import {buildQueuedHttpClient, createHttpResponse} from "../../testing/fixtures/network.fixture.ts";
import {repositoryFixtureRoot} from "../../testing/fixtures/repository.fixture.ts";
import {buildRecordingPresenter} from "../../testing/fixtures/terminal.fixture.ts";
import {createExchangeRateUpdateCommand} from "./command.ts";
import {targetCurrencies} from "./currencies.ts";
import {decodeExchangeRateInput, type ExchangeRateInput} from "./input.ts";
import {exchangeRateCommandMetadata} from "./metadata.ts";
import {exchangeRateUpdatePresenter} from "./reporter.ts";
import {exchangeRateUpdateWorkflowModule, type ExchangeRateResult, type ExchangeRateUpdateFailure} from "./workflow.ts";

/** One workflow decision, before the lifecycle turns it into a command execution. */
type RateWorkflowResult = WorkflowExecutionResult<ExchangeRateResult, ExchangeRateUpdateFailure>;

const commandSourcePath = "scripts/features/exchange-rates/command.ts";
const csvPath = join(repositoryFixtureRoot, "sites", "arolariu.ro", "public", "data", "exchange-rates.csv");

/** Builds a schema-valid Frankfurter payload carrying the supplied daily rates. */
const ratesJson = (rates: Readonly<Record<string, Readonly<Record<string, number>>>>): string =>
  JSON.stringify({amount: 1, base: "EUR", start_date: "", end_date: "", rates});

const emptyRatesJson = ratesJson({});
const emptyRatesResponse = () => createHttpResponse(200, emptyRatesJson);

/** Builds a deterministic clock whose instant never changes and whose delay resolves immediately. */
const fixedClock = (isoNow: string): Clock => ({monotonicNow: () => 0, isoTimestamp: () => isoNow, delay: () => Promise.resolve()});

/** Reads the fetched year out of one Frankfurter request path. */
const requestedYear = (request: Readonly<HttpRequest>): number => Number(/\/v1\/(\d{4})-01-01\.\./u.exec(request.url.pathname)?.[1]);

/** Runs the real command against fixture capabilities, without any Commander parsing. */
const invokeExchangeRates = async (runtime: Readonly<Partial<RuntimeExecutionContext>>, input: Readonly<ExchangeRateInput>) =>
  createExchangeRateUpdateCommand({host: buildCommandHost({runtime})}).invoke(input);

/** Runs the workflow module directly, so its typed decision is observable without the lifecycle. */
function runWorkflowDirectly(input: Readonly<ExchangeRateInput>, runtime: Readonly<Partial<RuntimeExecutionContext>>) {
  const context: CommandExecutionContext = {runtime: buildRuntimeExecutionContext(runtime), presentation: "silent"};
  const result: Promise<RateWorkflowResult> = exchangeRateUpdateWorkflowModule.runWorkflow(
    exchangeRateUpdateWorkflowModule.createContext(input, context),
    {monotonicNow: () => 0, signal: context.runtime.signal, publishEvent: () => undefined},
  );
  return {context, result};
}

/** Narrows a workflow result to the presentable subset a feature reporter receives. */
function presentable(result: RateWorkflowResult): PresentableWorkflowExecutionResult<ExchangeRateResult, ExchangeRateUpdateFailure> {
  if (result.kind === "interrupted") throw new Error(`Unexpected interrupted workflow result: ${result.message}`);
  return result;
}

/** Advances virtual time until the pending invocation settles, so no case waits on real time. */
async function settleWithControlledClock<TValue>(clock: ControlledClock, pending: Promise<TValue>): Promise<TValue> {
  for (let tick = 0; tick < 200; tick += 1) {
    await Promise.resolve();
    if (clock.pendingDelayCount > 0) await clock.advance(1_500);
  }
  return pending;
}

/**
 * Builds the command the shared lifecycle contract exercises: the real definition with only the
 * contract host's runtime factory replaced by fixtures, so one invocation completes without
 * touching disk, network, or wall-clock time.
 *
 * @param host - The host the contract supplies.
 * @returns The real command, bound to fixture capabilities.
 */
function createContractCommand(host: CommandHost) {
  const runtime: Readonly<Partial<RuntimeExecutionContext>> = {
    clock: fixedClock("2025-06-01T00:00:00.000Z"),
    files: createMemoryFileSystem(),
    http: buildQueuedHttpClient([emptyRatesResponse(), emptyRatesResponse()]),
  };
  return createExchangeRateUpdateCommand({host: {...host, loadRuntimeFactory: buildCommandHost({runtime}).loadRuntimeFactory}});
}

runCommandLifecycleContract({
  label: "update-exchange-rates",
  createCommand: createContractCommand,
  createInput: () => ({fromYear: 2024, toYear: 2024}),
  successArguments: ["--year", "2024"],
});

describe("exchange rate year loop", () => {
  it("fetches years in strict ascending order and delays 1,500 ms only between requests", async () => {
    const observed: string[] = [];
    const controlled = buildControlledClock();
    const queued = buildQueuedHttpClient([emptyRatesResponse(), emptyRatesResponse(), emptyRatesResponse()]);
    const runtime: Readonly<Partial<RuntimeExecutionContext>> = {
      files: createMemoryFileSystem(),
      http: {
        request: async (request: Readonly<HttpRequest>) => {
          observed.push(`fetch ${String(requestedYear(request))}`);
          return queued.request(request);
        },
      },
      clock: {
        monotonicNow: controlled.monotonicNow,
        isoTimestamp: controlled.isoTimestamp,
        delay: (milliseconds: number, signal?: AbortSignal) => {
          observed.push(`delay ${String(milliseconds)}`);
          return controlled.delay(milliseconds, signal);
        },
      },
    };

    const execution = await settleWithControlledClock(controlled, invokeExchangeRates(runtime, {fromYear: 2020, toYear: 2022}));

    expect(observed).toEqual(["fetch 2020", "delay 1500", "fetch 2021", "delay 1500", "fetch 2022"]);
    expect(execution).toMatchObject({
      status: "completed",
      exitCode: 0,
      value: {years: [2020, 2021, 2022], updatedYears: [2020, 2021, 2022]},
    });
  });

  it("retains a malformed response and a failed status as per-year failures, and still fetches later years", async () => {
    const files = createMemoryFileSystem();
    const http = buildQueuedHttpClient([
      createHttpResponse(200, JSON.stringify({base: "EUR"})),
      createHttpResponse(503, "unavailable"),
      emptyRatesResponse(),
    ]);

    const execution = await invokeExchangeRates(
      {files, http, clock: fixedClock("2026-06-01T00:00:00.000Z")},
      {fromYear: 2024, toYear: 2026},
    );

    expect(execution).toMatchObject({
      status: "completed",
      exitCode: 1,
      value: {
        years: [2024, 2025, 2026],
        updatedYears: [2026],
        failedYears: [
          {kind: "year-fetch-failed", year: 2024, message: "Frankfurter API returned an unexpected response shape."},
          {kind: "year-fetch-failed", year: 2025, message: "Frankfurter API error: 503"},
        ],
      },
    });
    expect(await files.readText(csvPath)).toBe("year,currency,rate_to_ron\n");
  });

  it("propagates a cancellation as an interrupted decision instead of recording it as a year failure", async () => {
    const files = createMemoryFileSystem();
    const clock = fixedClock("2025-06-01T00:00:00.000Z");
    const cancelAfterFirstYear = () => buildQueuedHttpClient([emptyRatesResponse(), new CommandCancellation("cancelled by caller", 130)]);

    const {result} = runWorkflowDirectly({fromYear: 2024, toYear: 2025}, {files, http: cancelAfterFirstYear(), clock});
    const decision = await result;
    const execution = await invokeExchangeRates({files, http: cancelAfterFirstYear(), clock}, {fromYear: 2024, toYear: 2025});

    expect(decision).toMatchObject({kind: "interrupted", exitCode: 130, message: "cancelled by caller"});
    expect(execution).toMatchObject({status: "cancelled", exitCode: 130});
    expect(await files.exists(csvPath)).toBe(false);
  });

  it("computes yearly average RON cross-rates and reports the unchanged success line", async () => {
    const files = createMemoryFileSystem();
    const {presenter, sink} = buildRecordingPresenter();
    const http = buildQueuedHttpClient([
      createHttpResponse(200, ratesJson({"2023-01-02": {RON: 4.9, USD: 1}, "2023-06-15": {RON: 5.1, USD: 1.2}})),
    ]);
    const host = buildCommandHost({runtime: {files, http, presenter, clock: fixedClock("2024-01-01T00:00:00.000Z")}});

    const execution = await createExchangeRateUpdateCommand({host}).run(["--year", "2023"]);

    expect(execution).toMatchObject({status: "completed", exitCode: 0, value: {years: [2023], updatedYears: [2023], failedYears: []}});
    // EUR to RON is direct: average(4.9, 5.1) = 5. USD cross-rate: average(4.9/1, 5.1/1.2) = 4.575.
    expect((await files.readText(csvPath)).split("\n")).toEqual(["year,currency,rate_to_ron", "2023,EUR,5", "2023,USD,4.575", ""]);
    expect(sink.records.map(({text}) => text)).toEqual([
      expect.stringContaining(`Updating exchange rates for 2023-2023 (${String(targetCurrencies.length)} currencies).`),
      expect.stringContaining("Got 2 currency average(s) from 2 trading day(s)."),
      expect.stringContaining(`Wrote 2 record(s) to ${csvPath}.`),
      expect.stringContaining("Updated 1 of 1 year(s)."),
    ]);
  });

  it("preserves existing CSV records outside the updated range through a full invocation", async () => {
    const files = createMemoryFileSystem({[csvPath]: ["year,currency,rate_to_ron", "2019,USD,4.1", "2024,USD,4.9", ""].join("\n")});
    const http = buildQueuedHttpClient([createHttpResponse(200, ratesJson({"2024-06-01": {RON: 5, USD: 1.1}}))]);

    const execution = await invokeExchangeRates(
      {files, http, clock: fixedClock("2024-12-31T00:00:00.000Z")},
      {fromYear: 2024, toYear: 2024},
    );

    expect(execution).toMatchObject({status: "completed", exitCode: 0});
    expect((await files.readText(csvPath)).split("\n")).toEqual([
      "year,currency,rate_to_ron",
      "2019,USD,4.1",
      "2024,EUR,5",
      "2024,USD,4.5455",
      "",
    ]);
  });
});

describe("exchange rate reporting", () => {
  it("maps a retained year failure to a degraded decision the reporter reports as exit 1 with the unchanged warning line", async () => {
    const {presenter, sink} = buildRecordingPresenter();
    const {context, result} = runWorkflowDirectly(
      {fromYear: 2024, toYear: 2025},
      {
        files: createMemoryFileSystem(),
        http: buildQueuedHttpClient([emptyRatesResponse(), new Error("upstream unavailable")]),
        clock: fixedClock("2025-06-01T00:00:00.000Z"),
      },
    );
    const decision = presentable(await result);

    const presentation = await exchangeRateUpdatePresenter.present(decision, context);
    if (presentation.kind !== "complete") throw new Error("The reporter must complete a degraded exchange-rate result.");
    await presentation.completion.human?.(presenter);

    expect(decision).toMatchObject({
      kind: "degraded",
      evidence: ["2025: upstream unavailable"],
      output: {updatedYears: [2024], failedYears: [{kind: "year-fetch-failed", year: 2025, message: "upstream unavailable"}]},
    });
    expect(presentation.completion.exitCode).toBe(1);
    const warning = "Updated 1 of 2 year(s); failed: 2025 (upstream unavailable).";
    expect(sink.records).toEqual([expect.objectContaining({stream: "stderr", level: "warn", text: expect.stringContaining(warning)})]);
  });

  it("maps a CSV write fault to a csv-merge-write-failed failure whose message and evidence are unchanged", async () => {
    const cause = new FileSystemError("writeTextAtomic", csvPath, `Failed to writeTextAtomic '${csvPath}': permission denied`, {
      code: "EACCES",
    });
    const files: FileSystem = {...createMemoryFileSystem(), writeTextAtomic: () => Promise.reject(cause)};
    const runtime = {
      files,
      http: buildQueuedHttpClient([emptyRatesResponse(), emptyRatesResponse()]),
      clock: fixedClock("2025-06-01T00:00:00.000Z"),
    };

    const {result} = runWorkflowDirectly({fromYear: 2024, toYear: 2024}, runtime);
    const decision = await result;
    const execution = await invokeExchangeRates(runtime, {fromYear: 2024, toYear: 2024});

    expect(decision).toMatchObject({kind: "failed", failure: {kind: "csv-merge-write-failed", csvPath, cause}});
    expect(execution).toMatchObject({
      status: "failed",
      exitCode: 1,
      failure: {kind: "operational", message: cause.message, evidence: ["operation: writeTextAtomic", `path: ${csvPath}`]},
    });
  });
});

describe("exchange rate lazy loading structure", () => {
  it("reaches the reporter only through loadPresentation and the workflow only through loadWorkflow", () => {
    const source = readFileSync(commandSourcePath, "utf8");
    const {references} = collectTypeScriptModuleReferences(source, commandSourcePath);
    const lines = source.split("\n");

    expect(references.filter(({specifier}) => specifier === "./reporter.ts")).toEqual([
      {specifier: "./reporter.ts", importedNames: ["*"], referenceKind: "dynamic-import", typeOnly: false},
    ]);
    expect(references.filter(({specifier}) => specifier === "./workflow.ts")).toEqual([
      {
        specifier: "./workflow.ts",
        importedNames: ["ExchangeRateResult", "ExchangeRateUpdateFailure"],
        referenceKind: "import",
        typeOnly: true,
      },
      {specifier: "./workflow.ts", importedNames: ["*"], referenceKind: "dynamic-import", typeOnly: false},
    ]);
    expect(lines.filter((line) => line.includes('import("./reporter.ts")'))).toEqual([expect.stringContaining("loadPresentation")]);
    expect(lines.filter((line) => line.includes('import("./workflow.ts")'))).toEqual([expect.stringContaining("loadWorkflow")]);
  });

  it("loads neither the workflow nor the reporter on the help path", async () => {
    const loaded: string[] = [];
    const fail = (module: string) => (): never => {
      loaded.push(module);
      throw new Error(`The ${module} must never load on the help path.`);
    };
    const specification = {
      ...exchangeRateCommandMetadata,
      decode: decodeExchangeRateInput,
      loadWorkflow: fail("workflow"),
      loadPresentation: fail("reporter"),
    };

    await expect(defineLazyCommand(specification, {host: buildCommandHost()}).run(["--help"])).resolves.toEqual({
      status: "help",
      exitCode: 0,
    });
    expect(loaded).toEqual([]);
  });

  it("never resolves the process runner or the prompt provider during a full Node-scope run", async () => {
    const resolved: string[] = [];
    const rejectLoader = (capability: string) => (): never => {
      resolved.push(capability);
      throw new Error(`The exchange-rate command must never load the ${capability}.`);
    };
    const loaders: NodeRuntimeCapabilityLoaders = {
      loadFileSystem: () => {
        resolved.push("files");
        return Promise.resolve(createMemoryFileSystem());
      },
      loadHttpClient: () => {
        resolved.push("http");
        return Promise.resolve(buildQueuedHttpClient([emptyRatesResponse()]));
      },
      loadProcessRunner: rejectLoader("process runner"),
      loadPromptProvider: rejectLoader("prompt provider"),
    };
    const scopeDefaults = {commandName: "update-exchange-rates", verbose: false, loaders} as const;
    const host: CommandHost = {
      ...buildCommandHost(),
      loadRuntimeFactory: () =>
        Promise.resolve({
          createRoot: (options) => createNodeRuntimeScope({...scopeDefaults, ...options}),
          createChild: (parent, options) => createNodeRuntimeScope({...scopeDefaults, parent, ...options}),
        }),
    };

    const execution = await createExchangeRateUpdateCommand({host}).invoke({fromYear: 2024, toYear: 2024});

    expect(execution).toMatchObject({status: "completed", exitCode: 0, value: {updatedYears: [2024]}});
    expect(resolved).toEqual(["files", "http"]);
  });
});
