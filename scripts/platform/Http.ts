/**
 * @fileoverview Bounded HTTP response body reads.
 * @module scripts/platform/Http
 *
 * @remarks
 * The legacy Node HTTP client buffered at most {@link MAX_RESPONSE_BYTES} of every response and
 * failed with `Response exceeded the <n> byte limit.` once a streamed body crossed it. These helpers
 * restore that bound for the Effect `HttpClient`: the body is consumed as a stream with a running
 * total, and the read fails (cancelling the rest of the stream) as soon as the total exceeds the
 * limit, so an oversized body is never fully buffered.
 */

import {Effect, Schema, Stream} from "effect";
import type {HttpClientError, HttpClientResponse} from "effect/http";

/** Default upper bound on one buffered response body, matching the legacy client (10 MiB). */
export const MAX_RESPONSE_BYTES = 10 * 1024 * 1024;

/** A response body exceeded the byte limit of its bounded read. */
export class ResponseTooLarge extends Schema.TaggedError<ResponseTooLarge>()("ResponseTooLarge", {
  message: Schema.String,
  maximumBytes: Schema.Number,
}) {}

/** Decoder shared by every bounded text read. */
const utf8Decoder = new TextDecoder("utf-8");

/**
 * Reads a response body, failing as soon as it exceeds `maximumBytes`.
 *
 * @param response - The response whose body is read.
 * @param maximumBytes - Largest accepted body size in bytes; defaults to {@link MAX_RESPONSE_BYTES}.
 * @returns The complete body; fails with {@link ResponseTooLarge} once more than `maximumBytes`
 * have been streamed (the remaining stream is cancelled), or with the client failure of the read.
 */
export function readBoundedBytes(
  response: HttpClientResponse.HttpClientResponse,
  maximumBytes: number = MAX_RESPONSE_BYTES,
): Effect.Effect<Uint8Array, ResponseTooLarge | HttpClientError.HttpClientError> {
  return Effect.suspend(() => {
    const chunks: Uint8Array[] = [];
    let total = 0;
    return response.stream.pipe(
      Stream.runForEach((chunk) => {
        total += chunk.byteLength;
        if (total > maximumBytes) {
          return Effect.fail(new ResponseTooLarge({message: `Response exceeded the ${String(maximumBytes)} byte limit.`, maximumBytes}));
        }
        chunks.push(chunk);
        return Effect.void;
      }),
      Effect.map(() => {
        const merged = new Uint8Array(total);
        let offset = 0;
        for (const chunk of chunks) {
          merged.set(chunk, offset);
          offset += chunk.byteLength;
        }
        return merged;
      }),
    );
  });
}

/**
 * Reads a response body as UTF-8 text, failing as soon as it exceeds `maximumBytes`.
 *
 * @param response - The response whose body is read.
 * @param maximumBytes - Largest accepted body size in bytes; defaults to {@link MAX_RESPONSE_BYTES}.
 * @returns The decoded body; fails like {@link readBoundedBytes}.
 */
export function readBoundedText(
  response: HttpClientResponse.HttpClientResponse,
  maximumBytes: number = MAX_RESPONSE_BYTES,
): Effect.Effect<string, ResponseTooLarge | HttpClientError.HttpClientError> {
  return Effect.map(readBoundedBytes(response, maximumBytes), (bytes) => utf8Decoder.decode(bytes));
}
