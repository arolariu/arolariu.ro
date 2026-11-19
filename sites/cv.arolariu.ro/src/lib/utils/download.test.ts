import {afterEach, describe, expect, it, vi} from "vitest";
import {downloadBlob, downloadJSON, downloadText} from "./download";

function captureDownload() {
  const createUrl = vi.spyOn(URL, "createObjectURL");
  const revokeUrl = vi.spyOn(URL, "revokeObjectURL");
  const downloads: {anchor: HTMLAnchorElement; connectedAtClick: boolean}[] = [];
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    downloads.push({anchor: this, connectedAtClick: this.isConnected});
  });
  function downloadedBlob(): Blob {
    const blob = createUrl.mock.calls[0]?.[0];
    if (!(blob instanceof Blob)) throw new TypeError("Expected a Blob at the object URL boundary");
    return blob;
  }
  return {createUrl, revokeUrl, downloads, downloadedBlob};
}

describe("CV downloads", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    ["plain text", "greeting.txt", "Hello\nBună ziua", undefined, "text/plain"],
    ["CSV", "data.csv", "name,age\nJohn,30", "text/csv", "text/csv"],
    ["empty text", "empty.txt", "", undefined, "text/plain"],
  ] as const)("downloads %s with its original contents and releases its temporary resources", async (_kind, name, text, mime, type) => {
    const {downloadedBlob, revokeUrl, downloads} = captureDownload();

    const result = downloadText(text, name, mime);

    expect(result).toMatchObject({ok: true});
    expect(downloads).toEqual([{anchor: expect.any(HTMLAnchorElement), connectedAtClick: true}]);
    expect(downloads[0]?.anchor.download).toBe(name);
    expect(downloads[0]?.anchor).not.toBeInTheDocument();
    expect(revokeUrl).toHaveBeenCalledExactlyOnceWith(downloads[0]?.anchor.href);
    const blob = downloadedBlob();
    expect(blob).toMatchObject({type});
    await expect(blob.text()).resolves.toBe(text);
  });

  it("uses the object's JSON representation and indents nested values with two spaces", async () => {
    const {downloadedBlob, downloads} = captureDownload();
    const data = {
      toJSON: () => ({contact: {name: "Ada"}}),
    };

    const result = downloadJSON(data, "cv.json");

    expect(result).toMatchObject({ok: true});
    expect(downloads[0]?.anchor.download).toBe("cv.json");
    const blob = downloadedBlob();
    expect(blob).toMatchObject({type: "application/json"});
    await expect(blob.text()).resolves.toBe('{\n  "contact": {\n    "name": "Ada"\n  }\n}');
  });

  it.each([
    ["array", [1, 2], "[\n  1,\n  2\n]"],
    ["null", null, "null"],
    ["boolean", false, "false"],
    ["string", "CV", '"CV"'],
    ["number", 42, "42"],
  ] as const)("downloads a top-level JSON %s without wrapping it", async (_kind, data, json) => {
    const {downloadedBlob} = captureDownload();

    const result = downloadJSON(data, "cv.json");

    expect(result).toMatchObject({ok: true});
    await expect(downloadedBlob().text()).resolves.toBe(json);
  });

  it("downloads a prebuilt binary blob without changing its bytes", async () => {
    const {downloadedBlob, revokeUrl, downloads} = captureDownload();
    const blob = new Blob([new Uint8Array([0, 1, 255])], {type: "application/octet-stream"});

    const result = downloadBlob(blob, "cv.bin");

    expect(result).toMatchObject({ok: true});
    const captured = downloadedBlob();
    expect(captured).toBe(blob);
    expect(downloads[0]?.anchor.download).toBe("cv.bin");
    expect(downloads[0]?.anchor).not.toBeInTheDocument();
    expect(revokeUrl).toHaveBeenCalledExactlyOnceWith(downloads[0]?.anchor.href);
    expect(new Uint8Array(await captured.arrayBuffer())).toEqual(new Uint8Array([0, 1, 255]));
  });

  it("rejects circular JSON without starting a download", () => {
    const {createUrl, downloads} = captureDownload();
    const data: Record<string, unknown> = {};
    data["self"] = data;

    const result = downloadJSON(data, "cv.json");

    expect(result).toMatchObject({ok: false, error: expect.any(TypeError)});
    expect(createUrl).not.toHaveBeenCalled();
    expect(downloads).toEqual([]);
  });

  it.each(["text", "JSON", "blob"] as const)("does not download %s during server rendering", (kind) => {
    const createUrl = vi.spyOn(URL, "createObjectURL");
    const blob = new Blob(["cv"]);
    vi.stubGlobal("window", undefined);

    const result = {
      text: () => downloadText("cv", "cv.txt"),
      JSON: () => downloadJSON({text: "cv"}, "cv.json"),
      blob: () => downloadBlob(blob, "cv.bin"),
    }[kind]();

    expect(result).toMatchObject({ok: false, error: {message: "download not available (SSR)"}});
    expect(createUrl).not.toHaveBeenCalled();
  });

  it.each([new Error("Blob allocation failed"), "Blob allocation failed"])("normalizes a Blob constructor failure (%s)", (reason) => {
    const {createUrl, downloads} = captureDownload();
    vi.stubGlobal(
      "Blob",
      class extends Blob {
        constructor() {
          super();
          throw reason;
        }
      },
    );

    const result = downloadText("cv", "cv.txt");

    expect(result).toMatchObject({ok: false, error: expect.any(Error)});
    expect(result.ok ? undefined : result.error.message).toBe("Blob allocation failed");
    expect(createUrl).not.toHaveBeenCalled();
    expect(downloads).toEqual([]);
  });

  it.each([new Error("Object URL unavailable"), "Object URL unavailable"])("normalizes an object URL failure (%s)", (reason) => {
    const {createUrl, revokeUrl, downloads} = captureDownload();
    createUrl.mockImplementation(() => {
      throw reason;
    });

    const result = downloadBlob(new Blob(["cv"]), "cv.bin");

    expect(result).toMatchObject({ok: false, error: expect.any(Error)});
    expect(result.ok ? undefined : result.error.message).toBe("Object URL unavailable");
    expect(revokeUrl).not.toHaveBeenCalled();
    expect(downloads).toEqual([]);
  });
});
