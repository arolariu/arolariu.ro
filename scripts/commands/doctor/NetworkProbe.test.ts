// @vitest-environment node
/**
 * @fileoverview Tests for the bounded, `GET`-only doctor network probe.
 * @module scripts/commands/doctor/NetworkProbe.test
 *
 * @remarks
 * Reachable responses use the harness scripted `HttpClient`. A hanging request, a hanging body, and
 * a transport failure cannot be scripted by the harness, so those cases provide their own
 * `HttpClient` layer under `GetOnlyHttpLive`; the probe itself is always the live layer.
 */

import {Effect, Fiber, Layer} from "effect";
import {HttpClient, HttpClientError, HttpClientResponse} from "effect/http";
import {TestClock} from "effect/testing";
import {describe, expect} from "vitest";

import {GetOnlyHttpLive} from "../../platform/Files.ts";
import {MAX_RESPONSE_BYTES} from "../../platform/Http.ts";
import {effectTest, makeTestLayer} from "../../platform/testing.ts";
import {NETWORK_PROBE_MAX_BODY_BYTES, NetworkProbe, NetworkProbeLive} from "./NetworkProbe.ts";

const PROBE_URL = new URL("https://example.com/probe");

/**
 * Builds the live probe over the harness with the given scripted responses.
 *
 * @param status - Scripted response status.
 * @param body - Scripted response body.
 * @returns The harness and the probe layer over it.
 */
function scriptedProbe(
  status: number,
  body: string,
): {readonly harness: ReturnType<typeof makeTestLayer>; readonly layer: Layer.Layer<NetworkProbe | TestClock.TestClock>} {
  const harness = makeTestLayer({http: [{match: () => true, respond: {status, body}}]});
  return {harness, layer: NetworkProbeLive.pipe(Layer.provideMerge(harness.layer))};
}

/**
 * Builds the live probe over a hand-written `HttpClient` the harness cannot script.
 *
 * @param client - The client answering every request.
 * @returns The probe layer, with the test clock.
 */
function clientProbe(client: HttpClient.HttpClient): Layer.Layer<NetworkProbe | TestClock.TestClock> {
  return Layer.merge(
    NetworkProbeLive.pipe(Layer.provide(GetOnlyHttpLive), Layer.provide(Layer.succeed(HttpClient.HttpClient, client))),
    TestClock.layer(),
  );
}

/**
 * Runs one probe in a child fiber and advances the test clock past its deadline.
 *
 * @param timeoutMs - The probe timeout.
 * @returns The probe result.
 */
function probeAfterDeadline(timeoutMs: number): Effect.Effect<unknown, never, NetworkProbe> {
  return Effect.gen(function* () {
    const probe = yield* NetworkProbe;
    const fiber = yield* Effect.forkChild(probe.get(PROBE_URL, timeoutMs));
    yield* Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));
    yield* TestClock.adjust(timeoutMs);
    return yield* Fiber.join(fiber);
  });
}

describe("NetworkProbeLive", () => {
  {
    const {harness, layer} = scriptedProbe(200, "reachable-body");
    effectTest(
      "captures status, statusCode, body, and duration for a reachable response through one GET",
      () =>
        Effect.gen(function* () {
          // Arrange
          const probe = yield* NetworkProbe;

          // Act
          const result = yield* probe.get(PROBE_URL, 4_000);

          // Assert
          expect(result).toEqual({status: "reachable", statusCode: 200, durationMs: 0, body: "reachable-body"});
          expect(harness.httpCalls().map((request) => `${request.method} ${request.url}`)).toEqual(["GET https://example.com/probe"]);
        }),
      layer,
    );
  }

  {
    const {layer} = scriptedProbe(503, "Service Unavailable");
    effectTest(
      "reports a 5xx response as reachable with its statusCode and body, as the legacy probe did",
      () =>
        Effect.gen(function* () {
          // Arrange
          const probe = yield* NetworkProbe;

          // Act
          const result = yield* probe.get(PROBE_URL, 4_000);

          // Assert
          expect(result).toEqual({status: "reachable", statusCode: 503, durationMs: 0, body: "Service Unavailable"});
        }),
      layer,
    );
  }

  effectTest(
    "classifies a request that outlives its deadline as unavailable with the elapsed duration",
    () =>
      Effect.gen(function* () {
        // Act
        const result = yield* probeAfterDeadline(10);

        // Assert
        expect(result).toEqual({status: "unavailable", error: "Network probe timed out after 10ms.", durationMs: 10});
      }),
    clientProbe(HttpClient.make(() => Effect.never)),
  );

  effectTest(
    "bounds the body read with the same deadline as the request",
    () =>
      Effect.gen(function* () {
        // Act
        const result = yield* probeAfterDeadline(25);

        // Assert
        expect(result).toEqual({status: "unavailable", error: "Network probe timed out after 25ms.", durationMs: 25});
      }),
    clientProbe(
      HttpClient.make((request) =>
        Effect.succeed(HttpClientResponse.fromWeb(request, new Response(new ReadableStream<Uint8Array>({start: () => undefined})))),
      ),
    ),
  );

  effectTest(
    "classifies a transport failure as unavailable",
    () =>
      Effect.gen(function* () {
        // Arrange
        const probe = yield* NetworkProbe;

        // Act
        const result = yield* probe.get(PROBE_URL, 4_000);

        // Assert
        expect(result.status).toBe("unavailable");
        expect(result.error).toMatch(/^Network probe could not reach the target: .*fetch failed/u);
        expect(result.statusCode).toBeUndefined();
        expect(result.body).toBeUndefined();
      }),
    clientProbe(
      HttpClient.make((request) =>
        Effect.fail(
          new HttpClientError.HttpClientError({reason: new HttpClientError.TransportError({request, description: "fetch failed"})}),
        ),
      ),
    ),
  );

  it("bounds bodies at the legacy 10 MiB limit", () => {
    expect(NETWORK_PROBE_MAX_BODY_BYTES).toBe(MAX_RESPONSE_BYTES);
    expect(NETWORK_PROBE_MAX_BODY_BYTES).toBe(10 * 1024 * 1024);
  });

  {
    const {layer} = scriptedProbe(200, "x".repeat(NETWORK_PROBE_MAX_BODY_BYTES));
    effectTest(
      "captures a body exactly at the bound",
      () =>
        Effect.gen(function* () {
          // Act
          const result = yield* (yield* NetworkProbe).get(PROBE_URL, 4_000);

          // Assert
          expect(result.status).toBe("reachable");
          expect(result.body).toHaveLength(NETWORK_PROBE_MAX_BODY_BYTES);
        }),
      layer,
    );
  }

  {
    const {layer} = scriptedProbe(200, "x".repeat(NETWORK_PROBE_MAX_BODY_BYTES + 1));
    effectTest(
      "classifies a body over the bound as an unexpected error without a captured body",
      () =>
        Effect.gen(function* () {
          // Act
          const result = yield* (yield* NetworkProbe).get(PROBE_URL, 4_000);

          // Assert
          expect(result).toEqual({
            status: "error",
            error: `Network probe failed unexpectedly: Response exceeded the ${String(NETWORK_PROBE_MAX_BODY_BYTES)} byte limit.`,
            durationMs: 0,
          });
        }),
      layer,
    );
  }
});
