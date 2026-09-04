/**
 * @fileoverview Exchange-rate update orchestration: the feature runtime context, its typed failures,
 * and the workflow module `update-exchange-rates` loads lazily. It resolves the year range against
 * the injected clock, fetches each year in strict ascending order with a polite delay between
 * requests, retains a per-year failure instead of stopping, and merges every result into the CSV.
 * @module scripts/features/exchange-rates/workflow
 *
 * @remarks
 * No process capability: this feature never spawns a child process and never loads Execa. A
 * cancellation always propagates instead of being recorded as a year failure, so an interrupted run
 * never rewrites the CSV, while any other per-year fault degrades the run and still writes the merge.
 */

import {join} from "node:path";

import {CommandCancellation} from "../../core/runtime/cancellation.ts";
import type {
  BaseWorkflowRuntimeExecutionContext,
  EnvironmentRuntimeCapability,
  FilesystemRuntimeCapability,
  NetworkRuntimeCapability,
  TimeRuntimeCapability,
} from "../../core/runtime/runtime-capability.ts";
import {defineWorkflowModule, type CommandWorkflowModuleDefinition} from "../../core/workflow/workflow-composition.ts";
import {
  degradedWorkflowExecution,
  failedWorkflowExecution,
  succeededWorkflowExecution,
} from "../../core/workflow/workflow-execution-result.ts";
import type {WorkflowSpecification} from "../../core/workflow/workflow-specification.ts";
import {targetCurrencies} from "./currencies.ts";
import {fetchYearlyRateAverages} from "./frankfurter-client.ts";
import {resolveExchangeRateYearRange, type ExchangeRateInput} from "./input.ts";
import {readPreservedRateRecords, writeMergedRateCsv, RateCsvWriteError, type RateRecord} from "./rate-csv.ts";

/** Delay between API requests to avoid overwhelming the service (in ms). */
const REQUEST_DELAY_MS = 1500;

/**
 * The exact capability subset one exchange-rate invocation observes: the base workflow scope plus a
 * filesystem, an HTTP client, a clock, and the environment snapshot the CSV path derives from.
 */
export type ExchangeRateRuntimeExecutionContext = Readonly<
  BaseWorkflowRuntimeExecutionContext
    & FilesystemRuntimeCapability
    & NetworkRuntimeCapability
    & TimeRuntimeCapability
    & EnvironmentRuntimeCapability
>;

/** One year whose Frankfurter fetch failed and was retained instead of stopping the run. */
export interface ExchangeRateYearFailure {
  readonly kind: "year-fetch-failed";
  readonly year: number;
  readonly message: string;
}

/** Every typed way one exchange-rate invocation can fail outright. */
export type ExchangeRateUpdateFailure = {readonly kind: "csv-merge-write-failed"; readonly csvPath: string; readonly cause: unknown};

/** Typed business result produced by one exchange-rate invocation. */
export interface ExchangeRateResult {
  /** Every year in the resolved `fromYear`-`toYear` range, ascending. */
  readonly years: readonly number[];
  /** Years whose Frankfurter fetch succeeded and were merged into the CSV. */
  readonly updatedYears: readonly number[];
  /** Years whose Frankfurter fetch failed, with the failure message. */
  readonly failedYears: readonly ExchangeRateYearFailure[];
}

/** The clock-derived plan one invocation runs, resolved before its workflow starts. */
interface ExchangeRatePlan {
  readonly fromYear: number;
  readonly toYear: number;
  readonly currentYear: number;
  readonly today: string;
  readonly csvPath: string;
}

/**
 * Plan for one in-flight invocation, keyed by the exact feature context `createContext` built for
 * it. Keeping the plan out of the context keeps the published feature context exactly the declared
 * capability set, and keying it by identity keeps two concurrent invocations from ever observing
 * each other's year range.
 */
const planByFeatureContext = new WeakMap<ExchangeRateRuntimeExecutionContext, ExchangeRatePlan>();

/**
 * Updates the configured exchange-rate CSV for the resolved year range.
 *
 * @param context - The narrowed feature context for this invocation.
 * @returns The years attempted, the years updated, and any retained per-year failures.
 * @throws {RateCsvWriteError} When the merged CSV cannot be written.
 */
async function updateExchangeRates(context: ExchangeRateRuntimeExecutionContext): Promise<ExchangeRateResult> {
  const {http, files, clock, signal, presenter} = context;
  const plan = planByFeatureContext.get(context);
  if (plan === undefined) {
    throw new Error("The exchange-rate workflow ran without a resolved year range.");
  }

  const {fromYear, toYear, currentYear, today, csvPath} = plan;
  presenter.info(`Updating exchange rates for ${fromYear}-${toYear} (${targetCurrencies.length} currencies).`);
  const preservedRecords = await readPreservedRateRecords(files, csvPath, fromYear, toYear);
  const updatedRecords: RateRecord[] = [];
  const years: number[] = [];
  const updatedYears: number[] = [];
  const failedYears: ExchangeRateYearFailure[] = [];

  for (let year = fromYear; year <= toYear; year += 1) {
    years.push(year);
    const yearPresenter = presenter.child(String(year));

    try {
      // Years must be fetched in strict ascending sequence, one request at a time.
      const records = await fetchYearlyRateAverages({year, currentYear, today, http, signal, presenter: yearPresenter});
      updatedRecords.push(...records);
      updatedYears.push(year);
    } catch (error: unknown) {
      if (error instanceof CommandCancellation || signal.aborted) throw error;
      const message = error instanceof Error ? error.message : String(error);
      failedYears.push({kind: "year-fetch-failed", year, message});
      yearPresenter.error(`Failed for ${year}: ${message}`);
    }

    // Be polite to the API: the delay lands only between requests, never after the last year.
    if (year < toYear) await clock.delay(REQUEST_DELAY_MS, signal);
  }

  const allRecords = [...preservedRecords, ...updatedRecords];
  await writeMergedRateCsv(files, csvPath, allRecords);
  presenter.info(`Wrote ${allRecords.length} record(s) to ${csvPath}.`);

  return {years, updatedYears, failedYears};
}

const exchangeRateUpdateSpecification: WorkflowSpecification<
  ExchangeRateRuntimeExecutionContext,
  ExchangeRateResult,
  ExchangeRateUpdateFailure
> = {
  name: "update-exchange-rates",
  execute: async (context) => {
    const result = await updateExchangeRates(context);
    const degradations = result.failedYears.map(({year, message}) => `${year}: ${message}`);
    return degradations.length === 0 ? succeededWorkflowExecution(result) : degradedWorkflowExecution(result, degradations);
  },
  classifyUnexpectedFault: (error) =>
    error instanceof RateCsvWriteError
      ? failedWorkflowExecution({kind: "csv-merge-write-failed", csvPath: error.csvPath, cause: error.cause})
      : undefined,
};

/** The lazily loaded workflow module `scripts/features/exchange-rates/command.ts` runs. */
export const exchangeRateUpdateWorkflowModule: CommandWorkflowModuleDefinition<
  ExchangeRateInput,
  ExchangeRateResult,
  ExchangeRateUpdateFailure,
  ExchangeRateRuntimeExecutionContext
> = defineWorkflowModule<ExchangeRateInput, ExchangeRateResult, ExchangeRateUpdateFailure, ExchangeRateRuntimeExecutionContext>({
  specification: exchangeRateUpdateSpecification,
  runtimeCapabilities: ["presenter", "signal", "cleanup", "files", "http", "clock", "environment"],
  createContext: (input, context) => {
    const {presenter, signal, cleanup, files, http, clock, environment} = context.runtime;
    const featureContext: ExchangeRateRuntimeExecutionContext = {presenter, signal, cleanup, files, http, clock, environment};
    // One ISO reading backs both the current year and today's date, so they never observe two instants.
    const nowIso = clock.isoTimestamp();
    const currentYear = Number(nowIso.slice(0, 4));
    planByFeatureContext.set(featureContext, {
      ...resolveExchangeRateYearRange(input, currentYear),
      currentYear,
      today: nowIso.slice(0, 10),
      csvPath: join(environment.cwd, "sites", "arolariu.ro", "public", "data", "exchange-rates.csv"),
    });

    return featureContext;
  },
});
