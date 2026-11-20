import {setTimeout} from "node:timers/promises";
import {MonorepositoryConsoleLogger} from "../common/logger.ts";

type Site = "cv" | "status";
interface SmokeOptions {
  readonly attempts?: number;
  readonly retryDelayMs?: number;
  readonly expectedCommit?: string;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function json(response: Response, path: string): Promise<Record<string, unknown>> {
  assert(response.headers.get("Content-Type")?.includes("application/json"), `Expected JSON at ${path}.`);
  try {
    const body: unknown = await response.json();
    assert(isRecord(body), `Expected a JSON object at ${path}.`);
    return body;
  } catch {
    throw new Error(`Invalid JSON object at ${path}.`);
  }
}

async function verifySite(site: Site, baseUrl: string, expectedCommit?: string): Promise<void> {
  const origin = new URL(baseUrl);
  assert(origin.protocol === "https:" || origin.protocol === "http:", "Smoke checks require an HTTP URL.");
  const request = async (path: string, status = 200, init: RequestInit = {}): Promise<Response> => {
    const response = await fetch(new URL(path, origin), {
      ...init,
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    assert(response.status === status, `${init.method ?? "GET"} ${path}: expected ${status}, received ${response.status}.`);
    return response;
  };
  if (expectedCommit) {
    const marker = await json(await request("/deployment.json"), "/deployment.json");
    assert(marker["commit"] === expectedCommit, "Deployment marker does not match the requested commit.");
  }
  const root = await request("/");
  assert(root.headers.get("Content-Type")?.includes("text/html"), "Expected HTML at /.");
  const html = await root.text();
  const assets = [...html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/gu)]
    .map((match) => new URL(match[1] ?? "", origin))
    .filter((url) => url.origin === origin.origin && url.pathname.startsWith("/_app/immutable/"));
  assert(assets.length > 0, "Home page does not reference SvelteKit assets.");
  for (const asset of assets) {
    const response = await request(asset.pathname);
    const type = response.headers.get("Content-Type") ?? "";
    assert(
      asset.pathname.endsWith(".css") ? type.includes("text/css") : /(?:java|ecma)script/u.test(type),
      `Unexpected asset content type at ${asset.pathname}.`,
    );
  }
  await request("/missing-smoke-page", 404);
  await request("/_app/immutable/missing-smoke-asset.js", 404);
  await request("/api/missing-smoke-api", 404);
  await request("/api/sk_render", 404);
  if (site === "status") {
    await request("/api/cv-json", 404);
    await request("/rest/json", 404);
    return;
  }
  for (const path of ["/human", "/json", "/pdf"]) {
    const response = await request(path);
    assert(response.headers.get("Content-Type")?.includes("text/html"), `Expected HTML at ${path}.`);
  }
  const pdf = await request("/cv.pdf");
  assert(pdf.headers.get("Content-Type")?.includes("application/pdf"), "Expected a PDF at /cv.pdf.");
  assert((await pdf.text()).startsWith("%PDF-"), "Invalid PDF at /cv.pdf.");
  const full = await json(await request("/rest/json"), "/rest/json");
  assert(isRecord(full["resume"]) && isRecord(full["meta"]) && full["meta"]["format"] === "cv.bundle", "Invalid full CV bundle.");
  const minimal = await json(await request("/rest/json?format=minimal"), "/rest/json?format=minimal");
  assert(
    isRecord(minimal["basics"])
      && Array.isArray(minimal["work"])
      && !("resume" in minimal)
      && isRecord(minimal["meta"])
      && minimal["meta"]["format"] === "cv.minimal",
    "Minimal query was not preserved.",
  );
  for (const path of ["/rest/json?section=basics&format=minimal", "/api/cv-json?section=basics"]) {
    const section = await json(await request(path), path);
    assert(section["section"] === "basics" && isRecord(section["data"]), `Section query was not preserved at ${path}.`);
  }
  const pretty = await request("/rest/json?format=resume&pretty=true");
  assert((await pretty.text()).includes('\n  "'), "Pretty-print query was not preserved.");
  const invalidPath = "/rest/json?section=missing-smoke-section";
  const invalid = await json(await request(invalidPath, 404), invalidPath);
  assert(typeof invalid["error"] === "string" && Array.isArray(invalid["availableSections"]), "Invalid section error contract.");
  const raw = await request("/rest/json?format=resume");
  const copy = raw.clone();
  const resume = await json(copy, "/rest/json?format=resume");
  assert(
    typeof resume["$schema"] === "string" && isRecord(resume["basics"]) && !("resume" in resume),
    "Raw resume query was not preserved.",
  );
  const rawBody = await raw.text();
  const etag = raw.headers.get("ETag");
  assert(
    etag && raw.headers.get("Cache-Control")?.includes("max-age=300") && raw.headers.get("Access-Control-Allow-Origin") === "*",
    "Missing API cache/CORS/ETag headers.",
  );
  const conditional = await fetch(new URL("/rest/json?format=resume", origin), {
    headers: {"If-None-Match": etag},
    signal: AbortSignal.timeout(10_000),
    redirect: "manual",
    cache: "no-store",
  });
  if (conditional.status === 304) {
    assert(conditional.headers.get("ETag") === etag && (await conditional.text()) === "", "Invalid conditional 304 response.");
  } else {
    assert(
      conditional.status === 200 && conditional.headers.get("ETag") !== etag && conditional.headers.get("ETag"),
      "Conditional request returned neither 304 nor a changed ETag.",
    );
    await json(conditional.clone(), "/rest/json?format=resume");
    assert((await conditional.text()) !== rawBody, "Changed ETag without a changed resume.");
  }
  const head = await request("/rest/json", 200, {method: "HEAD"});
  assert((await head.text()) === "" && head.headers.get("Content-Type")?.includes("application/json"), "Invalid HEAD response.");
  const preflight = await request("/rest/json", 204, {method: "OPTIONS"});
  assert(
    (await preflight.text()) === ""
      && preflight.headers.get("Access-Control-Allow-Origin") === "*"
      && preflight.headers.get("Access-Control-Allow-Methods") === "GET, OPTIONS"
      && preflight.headers.get("Access-Control-Allow-Headers") === "Content-Type, If-None-Match"
      && preflight.headers.get("Access-Control-Max-Age") === "86400",
    "Invalid OPTIONS response.",
  );
  const post = await request("/rest/json", 405, {method: "POST"});
  assert(
    post.headers.get("Allow") === "GET, OPTIONS, HEAD" && (await post.text()) === "POST method not allowed",
    "Invalid method rejection.",
  );
  const slash = await request("/rest/json/?format=resume", 308);
  const location = slash.headers.get("Location");
  assert(
    location && new URL(location, origin).pathname === "/rest/json" && new URL(location, origin).search === "?format=resume",
    "Invalid CV API slash redirect.",
  );
}

/**
 * Verifies an uploaded static site and its public managed-API contract.
 * @param site - Site whose HTTP contract must pass.
 * @param baseUrl - Existing site's HTTP origin.
 * @param options - Bounded propagation retries and optional source marker.
 * @returns Resolves only after every check passes; never logs response payloads.
 */
export async function smokeSite(site: Site, baseUrl: string, options: Readonly<SmokeOptions> = {}): Promise<void> {
  const attempts = options.attempts ?? 6;
  assert(Number.isInteger(attempts) && attempts >= 1 && attempts <= 12, "Invalid smoke retry count.");
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await verifySite(site, baseUrl, options.expectedCommit);
      return;
    } catch (error) {
      if (attempt === attempts) throw error;
      await setTimeout(options.retryDelayMs ?? 10_000);
    }
  }
}

if (import.meta.main) {
  const site = process.argv[2];
  const baseUrl = process.argv[3];
  if ((site !== "cv" && site !== "status") || !baseUrl) throw new Error("Specify cv or status and the deployed URL.");
  await smokeSite(site, baseUrl, {...(process.env["COMMIT_SHA"] ? {expectedCommit: process.env["COMMIT_SHA"]} : {})});
  new MonorepositoryConsoleLogger("swa").success(`${site} deployment HTTP checks passed.`);
}
