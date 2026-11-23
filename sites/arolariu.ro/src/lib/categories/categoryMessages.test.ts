import english from "../../../messages/en.json";
import french from "../../../messages/fr.json";
import romanian from "../../../messages/ro.json";
import {describe, expect, it} from "vitest";
import {invoiceCategories, merchantCategories, productCategories} from "./categoryCatalog";

describe("category labels", () => {
  it.each([
    ["en", english],
    ["ro", romanian],
    ["fr", french],
  ] as const)("contains a translated label for every selectable category in %s", (_, dictionary) => {
    const translations = Reflect.get(dictionary, "categories") as Record<string, Record<string, string>>;
    for (const [domain, entries] of Object.entries({
      products: productCategories,
      merchants: merchantCategories,
      invoices: invoiceCategories,
    })) {
      expect(Object.keys(translations?.[domain] ?? {}).toSorted()).toEqual(entries.map(({key}) => key).toSorted());
      expect(Object.values(translations[domain] ?? {}).every((label) => label.trim() !== "")).toBe(true);
    }
  });
});
