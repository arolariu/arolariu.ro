import * as native from "node:fs/promises";
import {tmpdir} from "node:os";
import {join, relative} from "node:path";
import {Readable} from "node:stream";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {createFileSystemHelper, withTemporaryDirectory} from "./index.ts";

vi.mock("node:fs/promises", {spy: true});

let directory: string;
const files = createFileSystemHelper();

beforeEach(async () => {
  directory = await native.mkdtemp(join(tmpdir(), "ci-evidence-"));
});
afterEach(async () => {
  await native.rm(directory, {recursive: true, force: true});
});

describe("filesystem evidence contracts", () => {
  it("keeps an owned temporary directory alive through awaited work, then removes it", async () => {
    let owned = "";
    expect(
      await withTemporaryDirectory("ci-lifetime-", async (path) => {
        owned = path;
        await native.writeFile(join(path, "evidence.txt"), "done");
        return files.exists(path);
      }),
    ).toBe(true);
    expect(await files.exists(owned)).toBe(false);
  });
  it("cleans an owned directory on rejection without replacing the original error", async () => {
    const error = new Error("callback failed");
    let owned = "";
    await expect(
      withTemporaryDirectory("ci-lifetime-", async (path) => {
        owned = path;
        throw error;
      }),
    ).rejects.toBe(error);
    expect(await files.exists(owned)).toBe(false);
  });
  it("does not treat permission failure as a nonexistent path", async () => {
    const denied = Object.assign(new Error("denied"), {code: "EACCES"});
    vi.mocked(native.access).mockRejectedValueOnce(denied);
    await expect(files.exists(join(directory, "report.json"))).rejects.toBe(denied);
  });

  it("enforces byte rather than character limits while reading", async () => {
    expect(files.readTextBounded).toBeTypeOf("function");
    const path = join(directory, "unicode.txt");
    await native.writeFile(path, "\u00e9\u00e9");
    await expect(files.readTextBounded(path, 3)).rejects.toThrow(/exceed|limit/i);
    expect(await files.readTextBounded(path, 4)).toBe("\u00e9\u00e9");
  });

  it("applies a decoder to parsed JSON instead of asserting its generic type", async () => {
    expect(files.readValidatedJson).toBeTypeOf("function");
    const path = join(directory, "report.json");
    await native.writeFile(path, '{"ok":"not-a-boolean"}');
    const decode = (value: unknown): {ok: boolean} => {
      if (typeof value === "object" && value !== null && "ok" in value && typeof value.ok === "boolean") return {ok: value.ok};
      throw new Error("Expected boolean ok");
    };
    await expect(files.readValidatedJson(path, decode, 100)).rejects.toThrow("Expected boolean ok");
    await native.writeFile(path, '{"ok":true}');
    expect(await files.readValidatedJson(path, decode, 100)).toEqual({ok: true});
  });

  it("honors finite traversal depth and does not mutate a global regex", async () => {
    await native.mkdir(join(directory, "sub", "deep"), {recursive: true});
    await Promise.all([
      native.writeFile(join(directory, "one.txt"), ""),
      native.writeFile(join(directory, "two.txt"), ""),
      native.writeFile(join(directory, "sub", "inside.txt"), ""),
      native.writeFile(join(directory, "sub", "deep", "last.txt"), ""),
    ]);
    const pattern = /\.txt$/g;
    pattern.lastIndex = 7;
    const names = (paths: readonly string[]): string[] => paths.map((path) => relative(directory, path).replace(/\\/g, "/")).sort();
    expect(names(await files.find(directory, pattern, 0))).toEqual(["one.txt", "two.txt"]);
    expect(names(await files.find(directory, pattern, 1))).toEqual(["one.txt", "sub/inside.txt", "two.txt"]);
    expect(names(await files.find(directory, pattern, -1))).toEqual(["one.txt", "sub/deep/last.txt", "sub/inside.txt", "two.txt"]);
    expect(pattern.lastIndex).toBe(7);
    expect(names(await files.list(directory, {maxDepth: 1, pattern}))).toEqual(["one.txt", "sub/inside.txt", "two.txt"]);
  });

  it("replaces JSON evidence atomically without retaining temporary siblings", async () => {
    expect(files.writeJsonAtomic).toBeTypeOf("function");
    const path = join(directory, "report.json");
    await native.writeFile(path, "original");
    await files.writeJsonAtomic(path, {ok: true});
    expect(JSON.parse(await native.readFile(path, "utf8"))).toEqual({ok: true});
    expect(await native.readdir(directory)).toEqual(["report.json"]);
  });

  it("preserves original bytes and cleans its temporary sibling after a stream fails", async () => {
    expect(files.writeStreamAtomic).toBeTypeOf("function");
    const path = join(directory, "report.json");
    await native.writeFile(path, "original");
    const broken = Readable.from(
      (async function* () {
        yield "partial";
        throw new Error("stream failed");
      })(),
    );
    await expect(files.writeStreamAtomic(path, broken)).rejects.toThrow("stream failed");
    expect(await native.readFile(path, "utf8")).toBe("original");
    expect(await native.readdir(directory)).toEqual(["report.json"]);
  });

  it("does not replace an existing directory or leave a failed replacement behind", async () => {
    expect(files.writeJsonAtomic).toBeTypeOf("function");
    const path = join(directory, "destination");
    await native.mkdir(path);
    await native.writeFile(join(path, "protected.txt"), "original");
    await expect(files.writeJsonAtomic(path, {ok: true})).rejects.toThrow();
    expect(await native.readFile(join(path, "protected.txt"), "utf8")).toBe("original");
    expect(await native.readdir(directory)).toEqual(["destination"]);
  });
});
