import {existsSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";
import entries from "./fixtures/public-entrypoints.json";

async function loadFacade(file: string): Promise<object | undefined> {
  const url = new URL(file, import.meta.url);
  if (!existsSync(fileURLToPath(url))) return undefined;
  const facade: object = await import(url.href);
  return facade;
}

describe("native SDK broker surface", () => {
  it.each(entries)("preserves the public runtime bindings of $package", async (entry) => {
    const upstream: object = await import(entry.package);
    const facade = await loadFacade(entry.facade);

    expect(facade, `No importable broker for ${entry.package}`).toBeDefined();
    if (!facade) return;

    expect(Object.keys(facade).sort()).toEqual(Object.keys(upstream).sort());
    for (const name of Object.keys(upstream)) {
      const actual: unknown = Reflect.get(facade, name);
      const expected: unknown = Reflect.get(upstream, name);
      expect(actual, `${entry.package}.${name}`).toBe(expected);
    }
  });

  it("preserves the default artifact client", async () => {
    const upstream = await import("@actions/artifact");
    const facade = await loadFacade("artifact.ts");
    expect(facade && Reflect.get(facade, "default")).toBe(upstream.default);
  });
});
