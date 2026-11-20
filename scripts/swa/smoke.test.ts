import {afterEach, describe, expect, it, vi} from "vitest";
import {smokeSite} from "./smoke.ts";

type Fault = "none" | "query" | "api-html" | "asset-html" | "missing" | "options" | "conditional" | "unavailable" | "stale";

function transport(fault: Fault = "none", changedResume = false, hasApi = true): typeof fetch {
  return vi.fn<typeof fetch>(async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input);
    const method = init?.method ?? "GET";
    if (fault === "unavailable") return new Response(null, {status: 503});
    if (url.pathname === "/deployment.json") return Response.json({commit: fault === "stale" ? "old" : "current"});
    if (url.pathname.includes("missing-smoke")) return new Response("Not Found", {status: fault === "missing" ? 200 : 404});
    if (url.pathname.startsWith("/_app/immutable/")) {
      return new Response(fault === "asset-html" ? "<html>fallback</html>" : "asset", {
        headers: {"Content-Type": fault === "asset-html" ? "text/html" : url.pathname.endsWith(".js") ? "text/javascript" : "text/css"},
      });
    }
    if (url.pathname === "/cv.pdf") return new Response("%PDF-1.7", {headers: {"Content-Type": "application/pdf"}});
    if (url.pathname === "/rest/json/") return new Response(null, {status: 308, headers: {Location: "/rest/json?format=resume"}});
    if (hasApi && (url.pathname === "/rest/json" || url.pathname === "/api/cv-json")) {
      if (fault === "api-html") return new Response("<html>fallback</html>", {headers: {"Content-Type": "text/html"}});
      const cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, If-None-Match",
      };
      if (method === "OPTIONS")
        return new Response(null, {status: fault === "options" ? 200 : 204, headers: {...cors, "Access-Control-Max-Age": "86400"}});
      if (method === "POST") return new Response("POST method not allowed", {status: 405, headers: {Allow: "GET, OPTIONS, HEAD"}});
      if (method === "HEAD") return new Response(null, {headers: {...cors, "Content-Type": "application/json"}});
      const resume = {$schema: "https://example.test/schema.json", basics: {name: "Example"}, work: [], meta: {lastModified: "first"}};
      const section = fault === "query" ? null : url.searchParams.get("section");
      if (section === "missing-smoke-section")
        return Response.json({error: "Section not found", availableSections: ["basics"]}, {status: 404});
      const format = fault === "query" ? null : url.searchParams.get("format");
      const headers = {
        ...cors,
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
        ETag: '"cv-first"',
      };
      if (new Headers(init?.headers).has("If-None-Match")) {
        if (fault === "conditional") return Response.json(resume, {headers});
        if (changedResume) return Response.json({...resume, meta: {lastModified: "second"}}, {headers: {...headers, ETag: '"cv-second"'}});
        return new Response(null, {status: 304, headers});
      }
      const body = section
        ? {section, data: resume.basics, meta: {source: "cv.arolariu.ro"}}
        : format === "resume"
          ? resume
          : format === "minimal"
            ? {basics: resume.basics, work: [], meta: {format: "cv.minimal"}}
            : {resume, meta: {format: "cv.bundle"}};
      return new Response(JSON.stringify(body, null, url.searchParams.get("pretty") === "true" ? 2 : undefined), {headers});
    }
    if (["/", "/human", "/json", "/pdf"].includes(url.pathname)) {
      return new Response(
        '<!doctype html><link rel="stylesheet" href="/_app/immutable/app.css"><script src="/_app/immutable/app.js"></script>',
        {
          headers: {"Content-Type": "text/html"},
        },
      );
    }
    return new Response("Not Found", {status: fault === "missing" ? 200 : 404});
  });
}

afterEach(() => vi.unstubAllGlobals());

const options = {attempts: 1, retryDelayMs: 0, expectedCommit: "current"};

describe("SWA deployment smoke checks", () => {
  it.each(["cv", "status"] as const)("accepts the %s deployment contract", async (site) => {
    vi.stubGlobal("fetch", transport("none", false, site === "cv"));
    await expect(smokeSite(site, "https://site.test", options)).resolves.toBeUndefined();
  });

  it("accepts a changed raw resume from another cold Function instance", async () => {
    vi.stubGlobal("fetch", transport("none", true));
    await expect(smokeSite("cv", "https://site.test", options)).resolves.toBeUndefined();
  });

  it.each([
    {fault: "query", message: /Minimal query/u},
    {fault: "api-html", message: /Expected JSON/u},
    {fault: "asset-html", message: /Unexpected asset/u},
    {fault: "missing", message: /expected 404/u},
    {fault: "options", message: /expected 204/u},
    {fault: "conditional", message: /neither 304/u},
    {fault: "stale", message: /marker/u},
  ] satisfies {fault: Fault; message: RegExp}[])("rejects a deployment with $fault behavior", async ({fault, message}) => {
    vi.stubGlobal("fetch", transport(fault));
    await expect(smokeSite("cv", "https://site.test", options)).rejects.toThrow(message);
  });

  it("fails after bounded retries when the site remains unavailable", async () => {
    const fetcher = transport("unavailable");
    vi.stubGlobal("fetch", fetcher);
    await expect(smokeSite("status", "https://site.test", {...options, attempts: 2})).rejects.toThrow(/503/u);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("retries propagation before accepting the new deployment", async () => {
    const healthy = transport("none", false, false);
    let remainingFailures = 1;
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (...args) => (remainingFailures-- > 0 ? new Response(null, {status: 503}) : healthy(...args))),
    );
    await expect(smokeSite("status", "https://site.test", {...options, attempts: 2})).resolves.toBeUndefined();
  });
});
