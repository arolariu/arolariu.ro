import {readFileSync} from "node:fs";
import {join} from "node:path";
import {describe, expect, it} from "vitest";

const root = join(import.meta.dirname, "..", "..");
const api = join(root, "sites", "api.arolariu.ro", "src", "Invoices", "Resources", "Categories");
const website = join(root, "sites", "arolariu.ro", "src", "data", "categories");

describe("flat category catalog mirrors", () => {
  it.each([
    ["products", 1100],
    ["merchants", 2100],
    ["invoices", 3100],
  ] as const)("ships the same complete %s catalog in both applications", (name, other) => {
    const file = `${name}.json`;
    const apiBytes = readFileSync(join(api, file));
    const websiteBytes = readFileSync(join(website, file));
    expect(apiBytes.equals(websiteBytes)).toBe(true);
    const entries = JSON.parse(apiBytes.toString("utf8")) as {id: number; key: string; label: string; isFood?: boolean}[];
    expect(entries).toHaveLength(100);
    expect(new Set(entries.map(({id}) => id)).size).toBe(100);
    expect(new Set(entries.map(({key}) => key)).size).toBe(100);
    expect(entries).toContainEqual(expect.objectContaining({id: other, key: "other"}));
    for (const entry of entries) {
      expect(Object.keys(entry).sort()).toEqual(name === "products" ? ["id", "isFood", "key", "label"] : ["id", "key", "label"]);
      expect(Number.isSafeInteger(entry.id) && entry.id > 0).toBe(true);
      expect(entry.key).toMatch(/^[a-z][a-zA-Z0-9]*$/u);
      expect(entry.label.trim()).not.toBe("");
      if (name === "products") expect(typeof entry.isFood).toBe("boolean");
    }
  });
});
