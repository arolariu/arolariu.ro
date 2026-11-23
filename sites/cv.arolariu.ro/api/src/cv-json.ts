import type {HttpRequest, HttpResponseInit} from "@azure/functions";
import {handleCvJsonRequest} from "../../src/lib/api/cv-json.ts";

/**
 * Converts the SWA-managed HTTP transport into the public CV JSON contract.
 * @param request - Azure request after the configured SWA rewrite.
 * @returns The status, headers and optional body understood by the Functions host.
 */
export async function handleCvJsonFunction(request: HttpRequest): Promise<HttpResponseInit> {
  const {trailingSlash: suffix} = request.params;
  if (Object.hasOwn(request.params, "trailingSlash") && suffix !== "slash") {
    return {status: 404};
  }
  const url = new URL(request.url);
  const originalUrl = request.headers.get("x-ms-original-url");
  const original = originalUrl && URL.canParse(originalUrl) ? new URL(originalUrl) : null;
  const hasPublicSlash =
    url.pathname === "/rest/json/"
    || (original !== null
      && (original.protocol === "http:" || original.protocol === "https:")
      && original.username === ""
      && original.password === ""
      && original.pathname === "/rest/json/");
  // Only use the original pathname as a slash hint; never adopt its origin or query.
  url.pathname = suffix === "slash" || hasPublicSlash ? "/rest/json/" : "/rest/json";
  const response = handleCvJsonRequest(
    new Request(url, {
      method: request.method,
      headers: [...request.headers.entries()],
    }),
  );
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers),
    ...(response.body === null ? {} : {body: await response.text()}),
  };
}
