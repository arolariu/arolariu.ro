import {existsSync} from "node:fs";
import {fileURLToPath} from "node:url";

import {describe, expect, it} from "vitest";

async function navigation() {
  expect(existsSync(fileURLToPath(new URL("./navigation.ts", import.meta.url)))).toBe(true);
  return import("./navigation.ts");
}

describe("documentation navigation", () => {
  it("preserves the full site's thirteen landing destinations", async () => {
    const {getDocumentationNavigation} = await navigation();
    const full = getDocumentationNavigation("full");
    expect(full.allRows).toHaveLength(13);
    expect(full.iWantTo).toHaveLength(6);
    expect(full.startHere).toHaveLength(4);
    expect(full.resources).toHaveLength(3);
    expect(full.allRows[0]).toEqual({label: "hit the api from code", href: "/internals/dotnet/arolariu.Backend.Core/"});
    expect(full.allRows[12]).toEqual({label: "frontend guides", href: "/monorepo/frontend/"});
  });

  it("retains seven authored-prose destinations without local reference links", async () => {
    const {getDocumentationNavigation} = await navigation();
    const preview = getDocumentationNavigation("site-only");
    expect(preview.allRows.map((row) => row.href)).toEqual([
      "/monorepo/rfc/domain-driven-design-architecture/",
      "/monorepo/rfc/",
      "/monorepo/backend/opentelemetry-guide/",
      "/monorepo/",
      "/monorepo/rfc/",
      "/monorepo/backend/",
      "/monorepo/frontend/",
    ]);
    expect(preview.iWantTo).toHaveLength(3);
    expect(preview.startHere).toHaveLength(1);
    expect(preview.resources).toHaveLength(3);
  });

  it("keeps effect dependencies stable across renders and section offsets consistent", async () => {
    const {getDocumentationNavigation} = await navigation();
    const value = getDocumentationNavigation("site-only");
    expect(getDocumentationNavigation("site-only")).toBe(value);
    expect(value.allRows).toEqual([...value.iWantTo, ...value.startHere, ...value.resources]);
    expect(value.allRows[value.iWantTo.length]).toEqual(value.startHere[0]);
    expect(value.allRows[value.iWantTo.length + value.startHere.length]).toEqual(value.resources[0]);
  });
});
