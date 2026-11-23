// @vitest-environment node
import {HttpRequest} from "@azure/functions";
import {describe, expect, it, vi} from "vitest";
import {handleCvJsonFunction} from "./cv-json.ts";

describe("managed CV Function", () => {
  it("preserves query selection, pretty output and response headers", async () => {
    const response = await handleCvJsonFunction(
      new HttpRequest({
        url: "https://example.test/api/cv-json?section=basics&format=minimal&pretty=true",
        method: "GET",
      }),
    );
    expect(response.status).toBe(200);
    expect(response.body).toContain("\n");
    expect(JSON.parse(String(response.body))).toMatchObject({section: "basics"});
    expect(new Headers(response.headers).get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("preserves conditional and preflight responses without response bodies", async () => {
    vi.useFakeTimers();
    try {
      const request = new HttpRequest({url: "https://example.test/api/cv-json", method: "GET"});
      const first = await handleCvJsonFunction(request);
      const etag = new Headers(first.headers).get("ETag") ?? "";
      const unchanged = await handleCvJsonFunction(
        new HttpRequest({
          url: request.url,
          method: "GET",
          headers: {"If-None-Match": etag},
        }),
      );
      expect(unchanged.status).toBe(304);
      expect(unchanged.body).toBeUndefined();
      expect(new Headers(unchanged.headers).get("ETag")).toBe(etag);
      const options = await handleCvJsonFunction(new HttpRequest({url: request.url, method: "OPTIONS"}));
      expect(options.status).toBe(204);
      expect(options.body).toBeUndefined();
      const head = await handleCvJsonFunction(new HttpRequest({url: request.url, method: "HEAD"}));
      expect(head.status).toBe(200);
      expect(head.body).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it("preserves errors and method rejection", async () => {
    expect(
      (await handleCvJsonFunction(new HttpRequest({url: "https://example.test/api/cv-json?section=missing", method: "GET"}))).status,
    ).toBe(404);
    const rejected = await handleCvJsonFunction(new HttpRequest({url: "https://example.test/api/cv-json", method: "POST"}));
    expect(rejected.status).toBe(405);
    expect(new Headers(rejected.headers).get("Allow")).toBe("GET, OPTIONS, HEAD");
  });

  it("preserves the explicit slash alias when original-URL metadata is unrelated", async () => {
    const response = await handleCvJsonFunction(
      new HttpRequest({
        url: "https://example.test/api/cv-json/slash?format=resume",
        method: "GET",
        params: {trailingSlash: "slash"},
        headers: {"x-ms-original-url": "https://untrusted.test/"},
      }),
    );
    expect(response.status).toBe(308);
    expect(new Headers(response.headers).get("Location")).toBe("/rest/json?format=resume");
  });

  it.each(["GET", "HEAD"])("preserves public slash redirects after an SWA rewrite for %s", async (method) => {
    const response = await handleCvJsonFunction(
      new HttpRequest({
        url: "https://example.test/api/cv-json?format=minimal&pretty=true",
        method,
        headers: {"x-ms-original-url": "https://example.test/rest/json/?format=resume"},
      }),
    );

    expect(response.status).toBe(308);
    expect(new Headers(response.headers).get("Location")).toBe("/rest/json?format=minimal&pretty=true");
    expect(response.body).toBeUndefined();
  });

  it("preserves an already-public slash path without original-URL metadata", async () => {
    const response = await handleCvJsonFunction(new HttpRequest({url: "https://example.test/rest/json/?format=resume", method: "GET"}));

    expect(response.status).toBe(308);
    expect(new Headers(response.headers).get("Location")).toBe("/rest/json?format=resume");
  });

  it("never adopts the original-URL origin or query as the redirect destination", async () => {
    const response = await handleCvJsonFunction(
      new HttpRequest({
        url: "https://example.test/api/cv-json?format=minimal",
        method: "GET",
        headers: {"x-ms-original-url": "https://untrusted.test/rest/json/?format=resume"},
      }),
    );

    expect(response.status).toBe(308);
    expect(new Headers(response.headers).get("Location")).toBe("/rest/json?format=minimal");
  });

  it.each([
    "not-a-url",
    "https://example.test/rest/json/unknown",
    "ftp://example.test/rest/json/",
    "https://test:invalid@example.test/rest/json/",
  ])("ignores original-URL metadata that is not a valid public slash hint: %s", async (originalUrl) => {
    const response = await handleCvJsonFunction(
      new HttpRequest({
        url: "https://example.test/api/cv-json?format=minimal",
        method: "GET",
        headers: {"x-ms-original-url": originalUrl},
      }),
    );

    expect(response.status).toBe(200);
    expect(new Headers(response.headers).get("Location")).toBeNull();
  });

  it.each([
    {method: "POST", status: 405},
    {method: "OPTIONS", status: 204},
  ])("preserves $method handling for a rewritten public slash request", async ({method, status}) => {
    const response = await handleCvJsonFunction(
      new HttpRequest({
        url: "https://example.test/api/cv-json",
        method,
        headers: {"x-ms-original-url": "https://example.test/rest/json/"},
      }),
    );

    expect(response.status).toBe(status);
    expect(new Headers(response.headers).get("Location")).toBeNull();
  });

  it("rejects unrecognized API suffixes", async () => {
    expect(
      (
        await handleCvJsonFunction(
          new HttpRequest({
            url: "https://example.test/api/cv-json/unknown",
            method: "GET",
            params: {trailingSlash: "unknown"},
          }),
        )
      ).status,
    ).toBe(404);
  });
});
