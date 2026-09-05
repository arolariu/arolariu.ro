/**
 * @fileoverview Frankfurter request, response validation, and RON cross-rate averaging for one year.
 * @module scripts/features/exchange-rates/frankfurter-client
 *
 * @remarks
 * Frankfurter does not support RON as a base currency, so each year is fetched with EUR as the base
 * and converted per trading day: `rate_to_ron(CURRENCY) = eur_to_ron / eur_to_currency`, with EUR to
 * RON taken directly from the same daily snapshot. Every request travels through the injected HTTP
 * capability and the invocation's cancellation signal; this module never calls `fetch` itself.
 *
 * @see {@link https://frankfurter.dev/docs} for Frankfurter API documentation
 */

import type {TerminalPresenter} from "../../core/presentation/terminal-presenter.ts";
import type {HttpClient} from "../../core/runtime/runtime-capability.ts";
import {targetCurrencies} from "./currencies.ts";
import type {RateRecord} from "./rate-csv.ts";

/** Base URL of the free, key-less Frankfurter API. */
const FRANKFURTER_API = "https://api.frankfurter.dev";

/** The only part of a Frankfurter payload this feature reads: daily rates keyed by date. */
type FrankfurterResponse = Readonly<{rates: Readonly<Record<string, Readonly<Record<string, number>>>>}>;

/** Everything one year's Frankfurter fetch observes; no ambient effect is reachable from here. */
export interface FrankfurterYearRequest {
  /** Year to fetch. */
  readonly year: number;
  /** Current year observed from the injected clock. */
  readonly currentYear: number;
  /** Today's date (`YYYY-MM-DD`), derived from the same clock reading as `currentYear`. */
  readonly today: string;
  /** HTTP capability the request travels through. */
  readonly http: HttpClient;
  /** Cancellation signal for the whole invocation. */
  readonly signal: AbortSignal;
  /** Per-year presenter used for progress reporting. */
  readonly presenter: TerminalPresenter;
}

/**
 * Parses one Frankfurter response body, guarding against an unexpected payload shape.
 *
 * @param text - Raw response body text.
 * @returns The parsed response.
 * @throws {Error} When the body is not valid JSON or its `rates` field is not an object.
 */
function parseFrankfurterResponse(text: string): FrankfurterResponse {
  const parsed: unknown = JSON.parse(text);
  const rates = (parsed as {rates?: unknown} | null)?.rates;
  if (typeof parsed !== "object" || parsed === null || typeof rates !== "object" || rates === null) {
    throw new Error("Frankfurter API returned an unexpected response shape.");
  }

  return parsed as FrankfurterResponse;
}

/**
 * Fetches one year of daily rates and reduces them to yearly RON averages.
 *
 * @param request - Year, clock-derived bounds, HTTP capability, signal, and per-year presenter.
 * @returns One averaged record per currency with at least one usable trading day, sorted by currency.
 * @throws {Error} When the API answers with a non-success status or an unexpected payload shape.
 */
export async function fetchYearlyRateAverages(request: Readonly<FrankfurterYearRequest>): Promise<readonly RateRecord[]> {
  const {year, currentYear, today, http, signal, presenter} = request;
  const startDate = `${year}-01-01`;
  const endDate = year === currentYear ? today : `${year}-12-31`;
  presenter.debug(`Fetching ${startDate} to ${endDate}.`);

  // EUR-based rates include RON and every target currency, so one request covers the whole year.
  const currenciesParam = ["RON", ...targetCurrencies].join(",");
  const response = await http.request({
    url: new URL(`${FRANKFURTER_API}/v1/${startDate}..${endDate}?base=EUR&symbols=${currenciesParam}`),
    method: "GET",
    signal,
  });
  if (!response.ok) {
    throw new Error(`Frankfurter API error: ${response.status}`);
  }

  const dailyRates = parseFrankfurterResponse(response.text).rates;
  const currencySums = new Map<string, {sum: number; count: number}>();
  const accumulate = (currency: string, rateToRon: number): void => {
    const existing = currencySums.get(currency) ?? {sum: 0, count: 0};
    currencySums.set(currency, {sum: existing.sum + rateToRon, count: existing.count + 1});
  };

  for (const dayRates of Object.values(dailyRates)) {
    const eurToRon = dayRates["RON"];
    if (!eurToRon) continue; // Skip days without RON data.

    for (const currency of targetCurrencies) {
      const eurToCurrency = dayRates[currency];
      if (!eurToCurrency) continue;
      accumulate(currency, eurToRon / eurToCurrency);
    }
    accumulate("EUR", eurToRon); // EUR to RON is direct.
  }

  // Every average is rounded to four decimal places, matching the published CSV precision.
  const records = [...currencySums]
    .filter(([, {count}]) => count > 0)
    .map(([currency, {sum, count}]): RateRecord => ({year, currency, rateToRon: Math.round((sum / count) * 10_000) / 10_000}))
    .toSorted((left, right) => left.currency.localeCompare(right.currency));
  presenter.success(`Got ${records.length} currency average(s) from ${Object.keys(dailyRates).length} trading day(s).`);

  return records;
}
