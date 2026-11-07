/**
 * @fileoverview HTTP conveniences characterized through public native clients.
 * @module github/scripts/helpers/http/tests
 */
import {IncomingMessage, type IncomingHttpHeaders} from "node:http";
import {Socket} from "node:net";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {HttpClient, HttpClientResponse} from "../sdk/http-client.ts";
import {createHttpHelper, type IHttpHelper} from "./index.ts";

function response(body = "{}", status: number | undefined = 200, headers: IncomingHttpHeaders = {}): HttpClientResponse {
  const message = new IncomingMessage(new Socket());
  message.statusCode = status;
  message.headers = headers;
  message.complete = true;
  message.push(body);
  message.push(null);
  return new HttpClientResponse(message);
}

describe("HttpHelper", () => {
  const url = "https://not-a-network-request.invalid/data";
  let client: HttpClient;
  let helper: IHttpHelper;

  beforeEach(() => {
    client = new HttpClient("unit-test");
    for (const method of ["get", "post", "put", "patch", "del", "head", "request"] as const) {
      vi.spyOn(client, method).mockRejectedValue(new Error(`Unexpected external ${method} call`));
    }
    helper = createHttpHelper("unit-test", {createClient: () => client});
  });
  afterEach(() => {
    helper.dispose();
    vi.restoreAllMocks();
  });

  it("parses JSON and forwards custom GET headers", async () => {
    vi.mocked(client.get).mockResolvedValue(response('{"data":"test"}'));
    const result = await helper.get<{data: string}>(url, {headers: {Authorization: "opaque"}});
    expect(result).toMatchObject({statusCode: 200, success: true, body: {data: "test"}});
    expect(client.get).toHaveBeenCalledWith(url, expect.objectContaining({Authorization: "opaque"}));
  });

  it.each(["post", "put", "patch"] as const)("serializes %s JSON and preserves custom headers", async (method) => {
    vi.mocked(client[method]).mockResolvedValue(response('{"id":123}', 201));
    const result = await helper[method]<{id: number}>(url, {name: "test"}, {headers: {Authorization: "opaque"}});
    expect(result.body).toEqual({id: 123});
    expect(client[method]).toHaveBeenCalledWith(
      url,
      '{"name":"test"}',
      expect.objectContaining({"Content-Type": "application/json", Authorization: "opaque"}),
    );
  });

  it.each(["post", "put", "patch"] as const)("sends an empty %s body when omitted", async (method) => {
    vi.mocked(client[method]).mockResolvedValue(response());
    await helper[method](url);
    expect(client[method]).toHaveBeenCalledWith(url, "", expect.any(Object));
  });

  it("uses the native DELETE operation", async () => {
    vi.mocked(client.del).mockResolvedValue(response("", 204));
    expect(await helper.delete(url)).toMatchObject({statusCode: 204, success: true, body: ""});
    expect(client.del).toHaveBeenCalledWith(url, expect.objectContaining({Accept: "application/json"}));
  });

  it("returns HEAD metadata without reading a body", async () => {
    const raw = response("", 204);
    const read = vi.spyOn(raw, "readBody");
    vi.mocked(client.head).mockResolvedValue(raw);
    expect(await helper.head(url)).toMatchObject({statusCode: 204, body: undefined});
    expect(read).not.toHaveBeenCalled();
  });

  it.each([
    {body: {data: "value"}, sent: '{"data":"value"}'},
    {body: "raw string body", sent: "raw string body"},
    {body: undefined, sent: ""},
  ])("sends explicit methods and body $sent", async ({body, sent}) => {
    vi.mocked(client.request).mockResolvedValue(response('{"result":"success"}'));
    expect((await helper.request("OPTIONS", url, body)).body).toEqual({result: "success"});
    expect(client.request).toHaveBeenCalledWith("OPTIONS", url, sent, expect.any(Object));
  });

  it.each([
    {name: "get", method: "get", invoke: (): Promise<unknown> => helper.get(url)},
    {name: "post", method: "post", invoke: (): Promise<unknown> => helper.post(url, {})},
    {name: "put", method: "put", invoke: (): Promise<unknown> => helper.put(url, {})},
    {name: "patch", method: "patch", invoke: (): Promise<unknown> => helper.patch(url, {})},
    {name: "delete", method: "del", invoke: (): Promise<unknown> => helper.delete(url)},
    {name: "head", method: "head", invoke: (): Promise<unknown> => helper.head(url)},
    {name: "request", method: "request", invoke: (): Promise<unknown> => helper.request("OPTIONS", url)},
    {name: "download", method: "get", invoke: (): Promise<unknown> => helper.download(url, "must-not-be-created")},
  ] as const)("preserves native $name error identity", async ({method, invoke}) => {
    const failure = new Error("Native boundary failure");
    vi.mocked(client[method]).mockRejectedValue(failure);
    await expect(invoke()).rejects.toBe(failure);
  });

  it.each([
    {body: "Plain text response", status: 200, success: true, expected: "Plain text response"},
    {body: "", status: 204, success: true, expected: ""},
    {body: "Not Found", status: 404, success: false, expected: "Not Found"},
    {body: "{}", status: 302, success: false, expected: {}},
  ])("retains body and status evidence for HTTP $status", async ({body, status, success, expected}) => {
    vi.mocked(client.get).mockResolvedValue(response(body, status));
    expect(await helper.get(url)).toMatchObject({statusCode: status, success, body: expected});
  });

  it("normalizes string and repeated headers", async () => {
    vi.mocked(client.get).mockResolvedValue(
      response("{}", 200, {
        "content-type": "application/json",
        "x-custom-header": "custom-value",
        "set-cookie": ["cookie1=value1", "cookie2=value2"],
      }),
    );
    expect((await helper.get(url)).headers).toEqual({
      "content-type": "application/json",
      "x-custom-header": "custom-value",
      "set-cookie": "cookie1=value1, cookie2=value2",
    });
  });

  it("does not describe absent status evidence as success", async () => {
    const raw = response();
    raw.message.statusCode = undefined;
    vi.mocked(client.get).mockResolvedValue(raw);
    expect(await helper.get(url)).toMatchObject({statusCode: 0, success: false});
  });
});
