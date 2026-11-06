import {existsSync} from "node:fs";
import {fileURLToPath} from "node:url";

import type {Config} from "@docusaurus/types";
import {afterEach, describe, expect, it, vi} from "vitest";

async function siteMode() {
  expect(existsSync(fileURLToPath(new URL("./siteMode.ts", import.meta.url)))).toBe(true);
  return import("./siteMode.ts");
}

function pluginIds(config: Config): readonly string[] {
  return (config.plugins ?? []).flatMap((plugin) => {
    if (!Array.isArray(plugin)) return [];
    const options: unknown = plugin[1];
    return typeof options === "object" && options !== null && "id" in options && typeof options.id === "string" ? [options.id] : [];
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("documentation site mode", () => {
  it.each([
    [undefined, "full"],
    ["0", "full"],
    ["1", "site-only"],
  ] as const)("resolves the explicit switch %s to %s", async (input, expected) => {
    const {readDocsSiteMode} = await siteMode();
    expect(readDocsSiteMode(input)).toBe(expected);
  });

  it.each(["", "true", "yes", "2"])("rejects an invalid explicit switch %s", async (input) => {
    const {readDocsSiteMode} = await siteMode();
    expect(() => readDocsSiteMode(input)).toThrow(/AROLARIU_DOCS_SITE_ONLY/);
  });

  it.each([
    ["/internals/dotnet", false],
    ["/internals/dotnet/Core/", false],
    ["/reference/typescript/", false],
    ["/reference/typescript?search=component", false],
    ["/internals/experimental/config", false],
    ["/internals/dotnet-extra", true],
    ["/reference/typescript-extra", true],
    ["/monorepo/frontend/", true],
    ["https://api.arolariu.ro/index.html", true],
  ])("scopes the site-only destination %s", async (href, expected) => {
    const {includesDocumentationPath} = await siteMode();
    expect(includesDocumentationPath(String(href), "site-only")).toBe(expected);
    expect(includesDocumentationPath(String(href), "full")).toBe(true);
  });

  it("omits generated reference plugins and navigation only in explicit site-only mode", async () => {
    vi.stubEnv("AROLARIU_DOCS_SITE_ONLY", "1");
    const {default: config} = await import("../../docusaurus.config.ts");
    expect(pluginIds(config)).toEqual(["monorepo"]);
    expect(config.customFields).toMatchObject({docsSiteOnly: true});
    expect(config.themeConfig).toMatchObject({
      navbar: {items: expect.not.arrayContaining([expect.objectContaining({to: "/internals/dotnet"})])},
    });
  });

  it("preserves all normal reference plugins by default", async () => {
    vi.stubEnv("AROLARIU_DOCS_SITE_ONLY", undefined);
    const {default: config} = await import("../../docusaurus.config.ts");
    expect(pluginIds(config)).toEqual(["monorepo", "dotnet-internals", "ts-reference", "python-internals"]);
    expect(config.customFields).toMatchObject({docsSiteOnly: false});
  });
});
