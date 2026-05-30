/**
 * HTTP test helpers for creating mock Response objects.
 * @module tests/helpers/builders/http
 */

/**
 * Creates a Response with JSON body and content-type header.
 *
 * @param body - The data to serialize as JSON
 * @param init - Optional ResponseInit for status, headers, etc.
 * @returns A Response instance with JSON content-type
 *
 * @example
 * ```typescript
 * const response = jsonResponse({id: "123", name: "Test"}, {status: 201});
 * await response.json(); // {id: "123", name: "Test"}
 * ```
 */
export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");

  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  });
}

/**
 * Creates a Response with plain text body.
 *
 * @param body - The text content
 * @param init - Optional ResponseInit for status, headers, etc.
 * @returns A Response instance with text content
 *
 * @example
 * ```typescript
 * const response = textResponse("Not Found", {status: 404});
 * await response.text(); // "Not Found"
 * ```
 */
export function textResponse(body: string, init: ResponseInit = {}): Response {
  return new Response(body, init);
}

/**
 * Creates a 204 No Content Response.
 *
 * @param init - Optional ResponseInit (status defaults to 204)
 * @returns A Response instance with no content
 *
 * @example
 * ```typescript
 * const response = noContentResponse();
 * response.status; // 204
 * await response.text(); // ""
 * ```
 */
export function noContentResponse(init: ResponseInit = {}): Response {
  return new Response(null, {
    ...init,
    status: init.status ?? 204,
  });
}
