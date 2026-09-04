/**
 * @fileoverview Network fixtures: complete HTTP responses and a queued HTTP client.
 * @module scripts/testing/fixtures/network.fixture
 */

import type {HttpClient, HttpRequest, HttpResponse} from "../../core/runtime/runtime-capability.ts";

const textEncoder = new TextEncoder();

/**
 * Builds one complete {@link HttpResponse} without performing any network I/O.
 *
 * @param status - HTTP status code.
 * @param body - Response body text.
 * @param headers - Optional response headers.
 * @returns A fully populated response value.
 */
export function createHttpResponse(status: number, body: string, headers: Readonly<Record<string, string>> = {}): HttpResponse {
  return {
    status,
    ok: status >= 200 && status <= 299,
    headers,
    bytes: textEncoder.encode(body),
    text: body,
  };
}

/**
 * Builds an {@link HttpClient} that answers each request with the next queued entry, recording
 * every request it observed.
 *
 * @remarks
 * An entry may be a response *or* an `Error`, so a per-request failure path needs no ad hoc stub.
 *
 * @param entries - Responses and errors to hand out, in request order.
 * @returns The queued client plus the requests it received.
 */
export function buildQueuedHttpClient(
  entries: readonly (HttpResponse | Error)[],
): HttpClient & Readonly<{requests: readonly Readonly<HttpRequest>[]}> {
  const remaining = [...entries];
  const requests: Readonly<HttpRequest>[] = [];

  return {
    request: (request: Readonly<HttpRequest>): Promise<HttpResponse> => {
      requests.push(request);
      const next = remaining.shift();
      if (next === undefined) {
        return Promise.reject(new Error(`No queued HTTP response remains for ${request.method ?? "GET"} ${request.url.href}.`));
      }
      return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
    },
    get requests(): readonly Readonly<HttpRequest>[] {
      return requests;
    },
  };
}
