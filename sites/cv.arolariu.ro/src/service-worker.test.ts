// @vitest-environment node

import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

class LifetimeEvent extends Event {
  lifetime?: Promise<unknown>;

  waitUntil(promise: Promise<unknown>): void {
    this.lifetime = promise;
  }
}

class WorkerFetchEvent extends LifetimeEvent {
  response?: Promise<Response>;

  readonly request: Request;

  constructor(request: Request) {
    super("fetch");
    this.request = request;
  }

  respondWith(response: Promise<Response>): void {
    this.response = response;
  }
}

describe("CV service worker", () => {
  const origin = "https://cv.example.test";
  const currentCache = "cv-cache-test-version";
  const addAll = vi.fn<Cache["addAll"]>();
  const put = vi.fn<Cache["put"]>();
  const match = vi.fn<CacheStorage["match"]>();
  const remove = vi.fn<CacheStorage["delete"]>();
  const open = vi.fn<(name: string) => Promise<Pick<Cache, "addAll" | "put">>>();
  const keys = vi.fn<CacheStorage["keys"]>();
  const fetchResponse = vi.fn<typeof fetch>();
  const skipWaiting = vi.fn<() => Promise<void>>();
  const claim = vi.fn<() => Promise<void>>();
  let worker: EventTarget;

  beforeEach(async () => {
    worker = Object.assign(new EventTarget(), {location: new URL(origin), skipWaiting, clients: {claim}});
    vi.stubGlobal("self", worker);
    vi.stubGlobal("caches", {match, open, keys, delete: remove});
    vi.stubGlobal("fetch", fetchResponse.mockRejectedValue(new Error("Offline")));
    open.mockResolvedValue({addAll, put});
    vi.resetModules();
    await import("./service-worker");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("precaches the build assets and static files before requesting activation", async () => {
    const install = new LifetimeEvent("install");
    const precache = Promise.withResolvers<void>();
    addAll.mockReturnValue(precache.promise);

    worker.dispatchEvent(install);
    await Promise.resolve();

    expect(open).toHaveBeenCalledExactlyOnceWith(currentCache);
    expect(addAll).toHaveBeenCalledExactlyOnceWith(["/_app/immutable/entry.js", "/cv.pdf"]);
    expect(skipWaiting).not.toHaveBeenCalled();

    precache.resolve();
    await install.lifetime;

    expect(skipWaiting).toHaveBeenCalledOnce();
  });

  it("removes old caches but leaves the current one available to claimed clients", async () => {
    const activate = new LifetimeEvent("activate");
    keys.mockResolvedValue(["cv-cache-old", currentCache]);

    worker.dispatchEvent(activate);
    await activate.lifetime;

    expect(remove).toHaveBeenCalledExactlyOnceWith("cv-cache-old");
    expect(claim).toHaveBeenCalledOnce();
  });

  it.each([
    ["POST", `${origin}/human`],
    ["GET", "https://assets.example.test/font.woff2"],
    ["GET", `${origin}/api/health`],
    ["GET", `${origin}/rest/json`],
  ])("does not intercept %s %s", (method, url) => {
    const event = new WorkerFetchEvent(new Request(url, {method}));

    worker.dispatchEvent(event);

    expect(event.response).toBeUndefined();
    expect(match).not.toHaveBeenCalled();
    expect(fetchResponse).not.toHaveBeenCalled();
  });

  it("returns cached HTML while a successful background request refreshes it", async () => {
    const event = new WorkerFetchEvent(new Request(`${origin}/human`));
    const fresh = Promise.withResolvers<Response>();
    match.mockResolvedValueOnce(new Response("cached page"));
    fetchResponse.mockReturnValueOnce(fresh.promise);

    worker.dispatchEvent(event);
    const response = await event.response;

    await expect(response?.text()).resolves.toBe("cached page");
    expect(put).not.toHaveBeenCalled();

    const page = new Response("updated page");
    fresh.resolve(page);
    await event.lifetime;

    expect(put).toHaveBeenCalledExactlyOnceWith(event.request, page);
  });

  it("serves the network response on a cache miss even if the background cache write fails", async () => {
    const event = new WorkerFetchEvent(new Request(`${origin}/humans.txt`));
    const network = new Response("updated public content");
    match.mockResolvedValue(undefined);
    fetchResponse.mockResolvedValue(network);
    put.mockRejectedValue(new DOMException("Cache is full", "QuotaExceededError"));

    worker.dispatchEvent(event);
    const response = await event.response;
    await event.lifetime;

    expect(response).toBe(network);
    await expect(response?.text()).resolves.toBe("updated public content");
    expect(put).toHaveBeenCalledOnce();
    const [request, cachedCopy] = put.mock.calls[0] ?? [];
    expect(request).toBe(event.request);
    expect(cachedCopy).not.toBe(network);
    await expect(cachedCopy?.text()).resolves.toBe("updated public content");
  });

  it("does not cache an upstream error on a cache miss", async () => {
    const event = new WorkerFetchEvent(new Request(`${origin}/human`));
    match.mockResolvedValue(undefined);
    fetchResponse.mockResolvedValue(new Response("Temporarily unavailable", {status: 502}));

    worker.dispatchEvent(event);
    const response = await event.response;

    expect(response?.status).toBe(502);
    expect(put).not.toHaveBeenCalled();
    expect(event.lifetime).toBeUndefined();
  });

  it("serves the cached shell on offline HTML navigation but not for a missing asset", async () => {
    const navigation = new WorkerFetchEvent(new Request(`${origin}/human`, {headers: {Accept: "text/html"}}));
    const asset = new WorkerFetchEvent(new Request(`${origin}/missing.css`));
    match.mockImplementation(async (request) => (request === "/" ? new Response("offline shell") : undefined));

    worker.dispatchEvent(navigation);
    worker.dispatchEvent(asset);
    const [page, missing] = await Promise.all([navigation.response, asset.response]);

    await expect(page?.text()).resolves.toBe("offline shell");
    expect(missing?.status).toBe(503);
    expect(put).not.toHaveBeenCalled();
  });

  it("activates early only for an explicit SKIP_WAITING message", () => {
    worker.dispatchEvent(new MessageEvent("message"));
    worker.dispatchEvent(new MessageEvent("message", {data: {type: "unrelated"}}));

    expect(skipWaiting).not.toHaveBeenCalled();

    worker.dispatchEvent(new MessageEvent("message", {data: {type: "SKIP_WAITING"}}));

    expect(skipWaiting).toHaveBeenCalledOnce();
  });
});
