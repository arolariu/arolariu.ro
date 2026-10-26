/**
 * @fileoverview Bounded, `GET`-only network reachability probe service for doctor modules.
 * @module scripts/commands/doctor/NetworkProbe
 *
 * @remarks
 * {@link NetworkProbe} is the only network capability a doctor module receives. {@link NetworkProbeLive}
 * ports the legacy `createBoundedNetworkProbe`: every request is a `GET` with no body, issued through
 * the read-only `GetOnlyHttp` view, and its body is read with the platform `readBoundedText` under
 * the legacy 10 MiB bound. One deadline covers the request and the body read. The probe never
 * fails: every outcome — reachable (any status code), unavailable, or an unexpected error — is
 * returned as a classified {@link DiagnosticNetworkResult}.
 */

import {Cause, Context, Duration, Effect, Layer} from "effect";
import {HttpClientError} from "effect/http";

import {GetOnlyHttp} from "../../platform/Files.ts";
import {MAX_RESPONSE_BYTES, readBoundedText} from "../../platform/Http.ts";
import {monotonicNow} from "./diagnostics.ts";
import type {DiagnosticNetworkResult} from "./types.ts";

/** Service tag for the bounded, `GET`-only network reachability probe doctor modules observe. */
export class NetworkProbe extends Context.Service<
  NetworkProbe,
  {
    /** Issues one bounded `GET` and classifies its outcome; never fails. */
    readonly get: (url: URL, timeoutMs: number) => Effect.Effect<DiagnosticNetworkResult>;
  }
>()("arolariu/scripts/NetworkProbe") {}

/** Largest response body a probe buffers, matching the legacy client bound (10 MiB). */
export const NETWORK_PROBE_MAX_BODY_BYTES = MAX_RESPONSE_BYTES;

/**
 * Reads the human-readable message of a failure value.
 *
 * @param error - The failure value.
 * @returns Its `message` when it has one, otherwise `String(error)`.
 */
function messageOf(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return String(error);
}

/**
 * Classifies one bounded network probe failure.
 *
 * @remarks
 * The probe's own deadline (`Cause.TimeoutError`) and a transport failure that never reached a
 * server (DNS failure, refused connection, TLS failure) are `unavailable`, a network condition the
 * caller can recover from; every other failure (an oversized body, a malformed response) is
 * `error`, so it is never mistaken for an ordinary connectivity gap.
 *
 * @param error - The probe failure.
 * @param timeoutMs - The bounded timeout applied to the request.
 * @returns The classified status and human-readable error detail.
 */
function classifyNetworkFailure(error: unknown, timeoutMs: number): Pick<DiagnosticNetworkResult, "status" | "error"> {
  if (Cause.isTimeoutError(error)) {
    return {status: "unavailable", error: `Network probe timed out after ${String(timeoutMs)}ms.`};
  }
  if (HttpClientError.isHttpClientError(error) && error.reason._tag === "TransportError") {
    return {status: "unavailable", error: `Network probe could not reach the target: ${messageOf(error)}`};
  }
  return {status: "error", error: `Network probe failed unexpectedly: ${messageOf(error)}`};
}

/**
 * Live {@link NetworkProbe} over the read-only `GetOnlyHttp` view.
 *
 * @remarks
 * The timeout bounds the request and the bounded body read together; the body is captured for
 * every received response so callers can validate its shape and status code.
 */
export const NetworkProbeLive: Layer.Layer<NetworkProbe, never, GetOnlyHttp> = Layer.effect(
  NetworkProbe,
  Effect.gen(function* () {
    const http = yield* GetOnlyHttp;
    return NetworkProbe.of({
      get: (url, timeoutMs) =>
        Effect.gen(function* () {
          const now = yield* monotonicNow;
          const startedAt = now();
          const elapsed = (): number => Math.max(0, now() - startedAt);
          return yield* http.get(url.href).pipe(
            Effect.flatMap((response) =>
              Effect.map(readBoundedText(response, NETWORK_PROBE_MAX_BODY_BYTES), (body) => ({status: response.status, body})),
            ),
            Effect.timeout(Duration.millis(timeoutMs)),
            Effect.match({
              onSuccess: ({status, body}): DiagnosticNetworkResult => ({
                status: "reachable",
                statusCode: status,
                durationMs: elapsed(),
                body,
              }),
              onFailure: (error): DiagnosticNetworkResult => ({...classifyNetworkFailure(error, timeoutMs), durationMs: elapsed()}),
            }),
          );
        }),
    });
  }),
);
