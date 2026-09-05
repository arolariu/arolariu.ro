/**
 * @fileoverview Sole Node.js-backed {@link HttpClient} implementation, built on the native `fetch`.
 * @module scripts/adapters/node/node-http-client
 *
 * @remarks
 * No other production script may call bare `fetch`. Response bytes are bounded while still
 * streaming, and every failure path is normalized into a bounded {@link HttpError} carrying only
 * the request URL and method.
 */

import {setTimeout as delay} from "node:timers/promises";

import {linkAbortSignals} from "../../core/runtime/cancellation.ts";
import {HttpError, type HttpClient, type HttpRequest, type HttpResponse} from "../../core/runtime/runtime-capability.ts";

/** Maximum number of response bytes buffered when a request omits `maximumResponseBytes`. */
const DEFAULT_MAX_RESPONSE_BYTES = 10 * 1024 * 1024;

/** Maximum length of any bounded diagnostic detail embedded in a thrown {@link HttpError}. */
const MAX_ERROR_DETAIL_LENGTH = 2_000;

/** HTTP methods safe to retry automatically because they never have a mutating side effect the retry itself would duplicate. */
const IDEMPOTENT_HTTP_METHODS: ReadonlySet<string> = new Set(["GET", "PUT", "DELETE"]);

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function boundedText(text: string): string {
  return text.length > MAX_ERROR_DETAIL_LENGTH ? `${text.slice(0, MAX_ERROR_DETAIL_LENGTH)}…` : text;
}

function isIdempotentHttpMethod(method: NonNullable<HttpRequest["method"]>): boolean {
  return IDEMPOTENT_HTTP_METHODS.has(method);
}

function headersToRecord(headers: Readonly<Headers>): Readonly<Record<string, string>> {
  const record: Record<string, string> = {};
  for (const [name, value] of headers.entries()) {
    record[name] = value;
  }
  return record;
}

/**
 * Normalizes any failure that is not already an {@link HttpError} into a bounded, redacted one so
 * every escape path from {@link NativeHttpClient} — the initial `fetch()` call, a body-stream
 * read, a caller/timeout abort, a connection reset, or an abort during retry backoff — carries
 * only `{url, method}` diagnostics behind the same contract.
 *
 * @param error - The failure to normalize; an existing {@link HttpError} is returned unchanged.
 * @param request - The request's URL and method, without headers or body.
 * @param context - Short phrase describing which phase failed, embedded in the message.
 * @returns `error` unchanged when it is already an {@link HttpError}; otherwise a new bounded one.
 */
function toHttpError(error: unknown, request: Readonly<Pick<HttpRequest, "url" | "method">>, context: string): HttpError {
  if (error instanceof HttpError) {
    return error;
  }
  return new HttpError(`${context}: ${boundedText(errorMessage(error))}`, request, {cause: error});
}

async function readBoundedResponseBytes(
  response: Response,
  maximumBytes: number,
  request: Readonly<Pick<HttpRequest, "url" | "method">>,
): Promise<Uint8Array> {
  if (response.body === null) {
    return new Uint8Array(0);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      let done: boolean;
      let value: Uint8Array | undefined;
      try {
        // Intentionally sequential: each chunk must be measured against the running total before
        // the next chunk is requested, so the limit is enforced before any further bytes are read.
        // eslint-disable-next-line no-await-in-loop
        ({done, value} = await reader.read());
      } catch (error: unknown) {
        // A caller/timeout abort, a connection reset, or any other body-stream failure surfaces
        // here as a raw platform error (for example a `DOMException`) once headers have already
        // been received; normalize it through the same bounded `HttpError` contract as every
        // other failure path instead of letting it escape unwrapped.
        throw toHttpError(error, request, "HTTP response body read failed");
      }
      if (done) {
        break;
      }
      if (value === undefined) {
        continue;
      }
      total += value.byteLength;
      if (total > maximumBytes) {
        await reader.cancel(`Response exceeded the ${String(maximumBytes)} byte limit.`);
        throw new HttpError(`Response exceeded the ${String(maximumBytes)} byte limit.`, request, {status: response.status});
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged;
}

function toFetchBody(body: string | Uint8Array): string | Buffer<ArrayBuffer> {
  if (typeof body === "string") {
    return body;
  }
  // Node's `Buffer` (backed by a concrete `ArrayBuffer`) satisfies `BodyInit`; a bare `Uint8Array`
  // typed over the wider `ArrayBufferLike` does not, under this project's `exactOptionalPropertyTypes`
  // and current DOM lib typings.
  return Buffer.from(body);
}

/**
 * Sole Node.js-backed {@link HttpClient} implementation, built on the native `fetch`.
 *
 * @remarks
 * `request()` links the caller's optional {@link HttpRequest.signal} with exactly one
 * {@link HttpRequest.timeoutMs}-based deadline signal covering the entire call, so `timeoutMs`
 * bounds every retried attempt plus every backoff delay together instead of restarting on each
 * attempt. A retry is only ever attempted when the caller supplies an explicit
 * {@link HttpRequest.retry} policy for a method ({@link IDEMPOTENT_HTTP_METHODS}) safe to repeat.
 */
class NativeHttpClient implements HttpClient {
  /** {@inheritDoc HttpClient.request} */
  public async request(request: Readonly<HttpRequest>): Promise<HttpResponse> {
    const method = request.method ?? "GET";
    const retryPolicy = request.retry;
    const attemptsAllowed = retryPolicy !== undefined && isIdempotentHttpMethod(method) ? Math.max(1, retryPolicy.attempts) : 1;
    const requestIdentity = {url: request.url, method};
    // One deadline signal for the whole call: created once here (not per attempt), it links the
    // caller's signal with a single `timeoutMs`-based timeout so the overall budget covers every
    // attempt and every retry delay together, instead of each attempt resetting its own timer.
    const deadlineTimeoutSignal = request.timeoutMs === undefined ? undefined : AbortSignal.timeout(request.timeoutMs);
    const deadline = linkAbortSignals(request.signal, deadlineTimeoutSignal);
    try {
      let attempt = 1;
      while (true) {
        // Intentionally sequential: a retry must observe the previous attempt's response status
        // before deciding whether to wait and try again.
        // eslint-disable-next-line no-await-in-loop
        const response = await this.#send(request, method, deadline.signal, requestIdentity);
        const shouldRetry = retryPolicy !== undefined && attempt < attemptsAllowed && retryPolicy.statuses.includes(response.status);
        if (!shouldRetry) {
          return response;
        }
        try {
          // eslint-disable-next-line no-await-in-loop
          await delay(retryPolicy.delayMs, undefined, {signal: deadline.signal});
        } catch (error: unknown) {
          // A caller abort or the overall timeout firing while waiting to retry surfaces here as
          // a raw `DOMException`; normalize it through the same bounded `HttpError` contract.
          throw toHttpError(error, requestIdentity, "HTTP request cancelled during retry backoff");
        }
        attempt += 1;
      }
    } finally {
      deadline.dispose();
    }
  }

  async #send(
    request: Readonly<HttpRequest>,
    method: NonNullable<HttpRequest["method"]>,
    signal: AbortSignal,
    requestIdentity: Readonly<Pick<HttpRequest, "url" | "method">>,
  ): Promise<HttpResponse> {
    let response: Response;
    try {
      response = await fetch(request.url, {
        method,
        ...(request.headers === undefined ? {} : {headers: request.headers}),
        ...(request.body === undefined ? {} : {body: toFetchBody(request.body)}),
        signal,
      });
    } catch (error: unknown) {
      throw toHttpError(error, requestIdentity, "HTTP request failed");
    }
    const bytes = await readBoundedResponseBytes(response, request.maximumResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES, requestIdentity);
    return {
      status: response.status,
      ok: response.ok,
      headers: headersToRecord(response.headers),
      bytes,
      text: new TextDecoder("utf-8").decode(bytes),
    };
  }
}

/** Sole Node.js-backed {@link HttpClient}. */
export const nodeHttpClient: HttpClient = new NativeHttpClient();
