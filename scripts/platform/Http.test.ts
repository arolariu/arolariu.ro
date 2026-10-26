// @vitest-environment node
/**
 * @fileoverview Tests for the bounded HTTP response body reads.
 * @module scripts/platform/Http.test
 *
 * @remarks
 * Responses are built from web `Response` objects over in-memory `ReadableStream`s, the same
 * boundary the Effect fetch client wraps; no module is mocked and nothing touches the network.
 */

import {Effect} from "effect";
import {HttpClientRequest, HttpClientResponse} from "effect/http";
import {describe, expect, it} from "vitest";

import {MAX_RESPONSE_BYTES, readBoundedBytes, readBoundedText, ResponseTooLarge} from "./Http.ts";

/** The request every test response answers. */
const REQUEST = HttpClientRequest.get("https://example.test/resource");

/**
 * Builds a response streaming `chunks` in order.
 *
 * @param chunks - Body chunks.
 * @returns The response.
 */
function chunkedResponse(chunks: readonly Uint8Array[]): HttpClientResponse.HttpClientResponse {
  const queue = [...chunks];
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      const next = queue.shift();
      if (next === undefined) {
        controller.close();
      } else {
        controller.enqueue(next);
      }
    },
  });
  return HttpClientResponse.fromWeb(REQUEST, new Response(body));
}

describe("readBoundedBytes", () => {
  it("returns a body of exactly the limit, merged across chunks", async () => {
    // Arrange
    const response = chunkedResponse([new Uint8Array([1, 2, 3]), new Uint8Array([4, 5])]);

    // Act
    const bytes = await Effect.runPromise(readBoundedBytes(response, 5));

    // Assert
    expect([...bytes]).toEqual([1, 2, 3, 4, 5]);
  });

  it("fails with ResponseTooLarge once the body exceeds the limit by one byte", async () => {
    // Arrange
    const response = chunkedResponse([new Uint8Array(4), new Uint8Array(2)]);

    // Act
    const error = await Effect.runPromise(Effect.flip(readBoundedBytes(response, 5)));

    // Assert
    expect(error).toEqual(new ResponseTooLarge({message: "Response exceeded the 5 byte limit.", maximumBytes: 5}));
  });

  it("applies the legacy 10 MiB limit by default", async () => {
    // Arrange
    const response = HttpClientResponse.fromWeb(REQUEST, new Response("x".repeat(MAX_RESPONSE_BYTES + 1)));

    // Act
    const error = await Effect.runPromise(Effect.flip(readBoundedBytes(response)));

    // Assert
    expect(MAX_RESPONSE_BYTES).toBe(10_485_760);
    expect(error).toMatchObject({
      _tag: "ResponseTooLarge",
      maximumBytes: 10_485_760,
      message: "Response exceeded the 10485760 byte limit.",
    });
  });

  it("stops pulling and cancels the body as soon as the limit is exceeded", async () => {
    // Arrange
    let pulls = 0;
    let cancelled = false;
    const endless = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulls += 1;
        controller.enqueue(new Uint8Array(4));
      },
      cancel() {
        cancelled = true;
      },
    });
    const response = HttpClientResponse.fromWeb(REQUEST, new Response(endless));

    // Act
    const error = await Effect.runPromise(Effect.flip(readBoundedBytes(response, 8)));

    // Assert
    expect(error).toBeInstanceOf(ResponseTooLarge);
    expect(cancelled).toBe(true);
    expect(pulls).toBeLessThan(10);
  });

  it("fails with the client error when the body stream errors", async () => {
    // Arrange
    const failing = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.error(new Error("connection reset"));
      },
    });
    const response = HttpClientResponse.fromWeb(REQUEST, new Response(failing));

    // Act
    const error = await Effect.runPromise(Effect.flip(readBoundedBytes(response)));

    // Assert
    expect(error).toMatchObject({_tag: "HttpClientError"});
  });
});

describe("readBoundedText", () => {
  it("decodes UTF-8 after merging, so a multi-byte character split across chunks survives", async () => {
    // Arrange
    const encoded = new TextEncoder().encode("leu ă");
    const response = chunkedResponse([encoded.slice(0, encoded.length - 1), encoded.slice(encoded.length - 1)]);

    // Act
    const text = await Effect.runPromise(readBoundedText(response, encoded.length));

    // Assert
    expect(text).toBe("leu ă");
  });

  it("fails like readBoundedBytes when the body exceeds the limit", async () => {
    // Arrange
    const response = chunkedResponse([new TextEncoder().encode("too long")]);

    // Act
    const error = await Effect.runPromise(Effect.flip(readBoundedText(response, 3)));

    // Assert
    expect(error).toMatchObject({_tag: "ResponseTooLarge", maximumBytes: 3});
  });
});
