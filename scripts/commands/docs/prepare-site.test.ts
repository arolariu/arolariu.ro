import {existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";

import {NodeServices} from "@effect/platform-node";
import {Effect} from "effect";
import {afterEach, describe, expect, it} from "vitest";

const directories: string[] = [];

async function preparation() {
  expect(existsSync(fileURLToPath(new URL("./prepare-site.ts", import.meta.url)))).toBe(true);
  return import("./prepare-site.ts");
}

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), "arolariu-docs-preview-"));
  directories.push(root);
  return root;
}

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, {recursive: true, force: true});
});

describe("docs-site preparation", () => {
  it("mirrors authored prose without reference extraction or working artifacts", async () => {
    const {prepareSiteDocs} = await preparation();
    const root = fixture();
    mkdirSync(join(root, "docs", "superpowers"), {recursive: true});
    writeFileSync(join(root, "docs", "README.md"), "# Authored documentation\n");
    writeFileSync(join(root, "docs", "superpowers", "private-plan.md"), "working artifact");
    const generated = join(root, "sites", "docs.arolariu.ro", "_generated");
    mkdirSync(generated, {recursive: true});
    writeFileSync(join(generated, "sentinel.txt"), "preserve");

    await Effect.runPromise(prepareSiteDocs(root).pipe(Effect.provide(NodeServices.layer)));

    const target = join(root, "sites", "docs.arolariu.ro", "docs", "monorepo");
    expect(readFileSync(join(target, "README.md"), "utf8")).toBe("# Authored documentation\n");
    expect(existsSync(join(target, "superpowers"))).toBe(false);
    expect(readFileSync(join(generated, "sentinel.txt"), "utf8")).toBe("preserve");
    expect(existsSync(join(generated, "dotnet-internals"))).toBe(false);
    expect(existsSync(join(generated, "experimental"))).toBe(false);
  });

  it("surfaces an absent prose source rather than fabricating a completed site", async () => {
    const {prepareSiteDocs} = await preparation();
    const root = fixture();
    await expect(Effect.runPromise(prepareSiteDocs(root).pipe(Effect.provide(NodeServices.layer)))).rejects.toThrow();
    expect(existsSync(join(root, "sites", "docs.arolariu.ro", "_generated"))).toBe(false);
  });
});
