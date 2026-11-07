/**
 * @fileoverview Native HTTP clients, responses, status constants, and errors.
 * @module github/scripts/helpers/sdk/http-client
 *
 * @remarks
 * Keeps raw, streaming, JSON, agent, and response operations intact.
 * Native generic JSON methods do not validate a domain schema. Request options
 * configure the client; socketTimeout is not an end-to-end deadline. Owners
 * dispose clients after consuming responses, particularly with keepAlive.
 *
 * @example
 * ```typescript
 * import {HttpClient} from "./http-client.ts";
 * const client = new HttpClient("ci-scripts", [], {allowRedirects: false});
 * try {
 *   const response = await client.get("https://example.com");
 *   const body = await response.readBody();
 * } finally {
 *   client.dispose();
 * }
 * ```
 *
 * @see https://github.com/actions/toolkit/blob/main/packages/http-client/README.md
 */
export * from "@actions/http-client";
