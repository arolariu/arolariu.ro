import {createServer, type Server} from "node:http";
import {mkdtemp, readFile, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {HttpClient} from "../sdk/http-client.ts";
import type {RequestHandler} from "../sdk/http-interfaces.ts";
import {createHttpHelper, type IHttpHelper} from "./index.ts";

let server: Server;
let url: string;
let directory: string;
const helpers: IHttpHelper[] = [];
const oldNoProxy = process.env["NO_PROXY"];

beforeAll(async () => {
  process.env["NO_PROXY"] = "127.0.0.1,localhost";
  server = createServer((request, response) => {
    if (request.url === "/redirect") {
      response.writeHead(302, {location: "/json"});
      response.end();
    } else if (request.url === "/binary") {
      response.writeHead(200, {"content-type": "application/octet-stream"});
      response.end(Buffer.from([0, 255, 128, 10]));
    } else if (request.url === "/missing") {
      response.writeHead(404);
      response.end("missing");
    } else if (request.method === "HEAD") {
      response.writeHead(204);
      response.end();
    } else if (request.url === "/headers") {
      response.writeHead(200, {"content-type": "application/json"});
      response.end(JSON.stringify(request.headers));
    } else {
      response.writeHead(200, {"content-type": "application/json"});
      response.end('{"ok":true}');
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Loopback listener did not expose its address");
  url = `http://127.0.0.1:${address.port}`;
});
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "ci-http-"));
});
afterEach(async () => {
  for (const helper of helpers.splice(0)) {
    if ("dispose" in helper && typeof helper.dispose === "function") helper.dispose();
  }
  await rm(directory, {recursive: true, force: true});
});
afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  if (oldNoProxy === undefined) delete process.env["NO_PROXY"];
  else process.env["NO_PROXY"] = oldNoProxy;
});

describe("HTTP transport behavior", () => {
  it("applies native handlers and base headers as well as per-request headers", async () => {
    const handler: RequestHandler = {
      prepareRequest(options): void {
        options.headers = {...options.headers, "X-Prepared": "handler"};
      },
      canHandleAuthentication(): boolean {
        return false;
      },
      async handleAuthentication(): Promise<never> {
        throw new Error("Unexpected authentication challenge");
      },
    };
    const helper = createHttpHelper("custom-agent", {handlers: [handler], requestOptions: {headers: {"X-Native": "base"}}});
    helpers.push(helper);
    const result = await helper.get(`${url}/headers`, {headers: {"X-Request": "local"}});
    expect(result.body).toMatchObject({"user-agent": "custom-agent", "x-prepared": "handler", "x-native": "base", "x-request": "local"});
  });
  it("honors false and zero policy overrides in real requests and native client construction", async () => {
    const configurations: ConstructorParameters<typeof HttpClient>[] = [];
    const createClient = (...args: ConstructorParameters<typeof HttpClient>): HttpClient => {
      configurations.push(args);
      return new HttpClient(...args);
    };
    const helper = createHttpHelper("transport-test", {createClient});
    helpers.push(helper);
    const result = await helper.get(`${url}/redirect`, {allowRedirects: false, allowRetries: false, maxRetries: 0, timeout: 1234});
    expect(result.statusCode).toBe(302);
    expect(configurations.at(-1)?.[2]).toMatchObject({allowRedirects: false, allowRetries: false, maxRetries: 0, socketTimeout: 1234});
  });

  it("downloads original binary bytes rather than UTF-8 replacement characters", async () => {
    const helper = createHttpHelper();
    helpers.push(helper);
    const destination = join(directory, "binary.dat");
    await helper.download(`${url}/binary`, destination);
    expect([...(await readFile(destination))]).toEqual([0, 255, 128, 10]);
  });

  it("does not replace a destination with a failed HTTP response", async () => {
    const helper = createHttpHelper();
    helpers.push(helper);
    const destination = join(directory, "report.json");
    await writeFile(destination, "original");
    await expect(helper.download(`${url}/missing`, destination)).rejects.toMatchObject({statusCode: 404});
    expect(await readFile(destination, "utf8")).toBe("original");
  });

  it("finishes reading before disposing an owned request-specific client", async () => {
    const events: string[] = [];
    const createClient = (...args: ConstructorParameters<typeof HttpClient>): HttpClient => {
      const client = new HttpClient(...args);
      const get = client.get.bind(client);
      const dispose = client.dispose.bind(client);
      vi.spyOn(client, "get").mockImplementation(async (...request) => {
        const response = await get(...request);
        const read = response.readBody.bind(response);
        vi.spyOn(response, "readBody").mockImplementation(async () => {
          const body = await read();
          events.push("body-finished");
          return body;
        });
        return response;
      });
      vi.spyOn(client, "dispose").mockImplementation(() => {
        events.push("disposed");
        dispose();
      });
      return client;
    };
    const helper = createHttpHelper("transport-test", {createClient});
    helpers.push(helper);
    expect((await helper.get(`${url}/json`, {maxRetries: 0})).body).toEqual({ok: true});
    expect(events).toEqual(["body-finished", "disposed"]);
  });

  it("preserves an external error and disposes its owned client on rejection", async () => {
    const failure = new Error("external transport failure");
    const clients: HttpClient[] = [];
    const createClient = (...args: ConstructorParameters<typeof HttpClient>): HttpClient => {
      const client = new HttpClient(...args);
      vi.spyOn(client, "get").mockRejectedValue(failure);
      vi.spyOn(client, "dispose");
      clients.push(client);
      return client;
    };
    const helper = createHttpHelper("transport-test", {createClient});
    helpers.push(helper);
    await expect(helper.get(`${url}/json`, {maxRetries: 0})).rejects.toBe(failure);
    expect(clients.at(-1)?.dispose).toHaveBeenCalledOnce();
  });

  it("finishes body rejection before disposing its owned client and preserves the cause", async () => {
    const events: string[] = [];
    const failure = new Error("body decoding failure");
    const createClient = (...args: ConstructorParameters<typeof HttpClient>): HttpClient => {
      const client = new HttpClient(...args);
      const get = client.get.bind(client);
      const dispose = client.dispose.bind(client);
      vi.spyOn(client, "get").mockImplementation(async (...request) => {
        const response = await get(...request);
        const read = response.readBody.bind(response);
        vi.spyOn(response, "readBody").mockImplementation(async () => {
          await read();
          events.push("body-finished");
          throw failure;
        });
        return response;
      });
      vi.spyOn(client, "dispose").mockImplementation(() => {
        events.push("disposed");
        dispose();
      });
      return client;
    };
    const helper = createHttpHelper("transport-test", {createClient});
    helpers.push(helper);
    await expect(helper.get(`${url}/json`, {maxRetries: 0})).rejects.toBe(failure);
    expect(events).toEqual(["body-finished", "disposed"]);
  });

  it("returns a bodyless HEAD response", async () => {
    const helper = createHttpHelper();
    helpers.push(helper);
    const result = await helper.head(`${url}/json`);
    expect(result.statusCode).toBe(204);
    expect(result.body).toBeUndefined();
  });
});
