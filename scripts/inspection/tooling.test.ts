// @vitest-environment node
/**
 * @fileoverview Contract tests for the pure envinfo tooling projection.
 * @module scripts/inspection/tooling.test
 */

import {describe, expect, it} from "vitest";

import {parseEnvinfoJson, type PackageFact, type ToolFact, type ToolingFacts} from "./tooling.ts";

/** Serializes an untrusted envinfo-shaped document exactly as the worker would hand it to the projection. */
function serialize(document: unknown): string {
  return JSON.stringify(document);
}

function toolNamed(facts: ToolingFacts, category: string, name: string): ToolFact | undefined {
  return facts.tools.find((tool) => tool.category === category && tool.name === name);
}

function packageNamed(facts: ToolingFacts, scope: PackageFact["scope"], name: string): PackageFact | undefined {
  return facts.packages.find((entry) => entry.scope === scope && entry.name === name);
}

describe("parseEnvinfoJson - System identity", () => {
  it("projects OS, CPU, and Memory descriptive strings and the shell object version without its path", () => {
    const facts = parseEnvinfoJson(
      serialize({
        System: {
          OS: "Windows 11 10.0.22631",
          CPU: "(16) x64 AMD Ryzen 7",
          Memory: "12.00 GB / 32.00 GB",
          Shell: {version: "5.1.22621", path: "C:\\Windows\\System32\\cmd.exe"},
        },
      }),
    );

    expect(facts.os).toBe("Windows 11 10.0.22631");
    expect(facts.cpu).toBe("(16) x64 AMD Ryzen 7");
    expect(facts.memory).toBe("12.00 GB / 32.00 GB");
    expect(facts.shell).toBe("5.1.22621");
    expect(serialize(facts)).not.toContain("cmd.exe");
    expect(serialize(facts)).not.toContain("System32");
  });

  it("strips the trailing path from a direct-string shell candidate", () => {
    const facts = parseEnvinfoJson(serialize({System: {Shell: "5.8.1 - /usr/bin/zsh"}}));

    expect(facts.shell).toBe("5.8.1");
    expect(serialize(facts)).not.toContain("/usr/bin/zsh");
  });

  it("omits System identity fields that are missing or non-string", () => {
    const facts = parseEnvinfoJson(serialize({System: {CPU: 42, Shell: {path: "/only/a/path"}}}));

    expect(facts.os).toBeUndefined();
    expect(facts.cpu).toBeUndefined();
    expect(facts.memory).toBeUndefined();
    expect(facts.shell).toBeUndefined();
    expect(serialize(facts)).not.toContain("/only/a/path");
  });

  it("never treats System, npmPackages, or npmGlobalPackages as generic tool categories", () => {
    const facts = parseEnvinfoJson(
      serialize({
        System: {OS: "Linux", Shell: "5.0 - /bin/bash"},
        npmPackages: {react: "18.0.0"},
        npmGlobalPackages: {typescript: "6.0.3"},
      }),
    );

    expect(facts.tools.some((tool) => tool.category === "System")).toBe(false);
    expect(facts.tools.some((tool) => tool.category === "npmPackages")).toBe(false);
    expect(facts.tools.some((tool) => tool.category === "npmGlobalPackages")).toBe(false);
  });
});

describe("parseEnvinfoJson - generic tools", () => {
  it("projects direct-string, object, and array version candidates while ignoring paths and unknown fields", () => {
    const facts = parseEnvinfoJson(
      serialize({
        Binaries: {
          Node: "20.11.0 - /usr/local/bin/node",
          npm: {version: "10.2.4", path: "/usr/local/bin/npm", extra: "ignored"},
          Watchman: {path: "/usr/local/bin/watchman"},
        },
        IDEs: {
          "VS Code": ["1.87.0", {version: "1.88.0-insiders", path: "/Applications/VSCode.app"}],
        },
      }),
    );

    expect(toolNamed(facts, "Binaries", "Node")).toEqual({category: "Binaries", name: "Node", found: true, version: "20.11.0"});
    expect(toolNamed(facts, "Binaries", "npm")).toEqual({category: "Binaries", name: "npm", found: true, version: "10.2.4"});
    expect(toolNamed(facts, "Binaries", "Watchman")).toEqual({category: "Binaries", name: "Watchman", found: true});
    expect(toolNamed(facts, "IDEs", "VS Code")).toEqual({category: "IDEs", name: "VS Code", found: true, version: "1.87.0"});

    const serialized = serialize(facts);
    expect(serialized).not.toContain("/usr/local/bin/node");
    expect(serialized).not.toContain("/usr/local/bin/npm");
    expect(serialized).not.toContain("ignored");
    expect(serialized).not.toContain("/Applications/VSCode.app");
  });

  it("marks canonical not-found markers as found:false without a version", () => {
    const facts = parseEnvinfoJson(
      serialize({
        Binaries: {Node: "Not Found", Yarn: "N/A"},
      }),
    );

    expect(toolNamed(facts, "Binaries", "Node")).toEqual({category: "Binaries", name: "Node", found: false});
    expect(toolNamed(facts, "Binaries", "Yarn")).toEqual({category: "Binaries", name: "Yarn", found: false});
  });

  it("keeps a present tool with no safe version as found:true and omits path-shaped or control-character candidates", () => {
    const facts = parseEnvinfoJson(
      serialize({
        Utilities: {
          OnlyPath: "/usr/bin/only",
          ControlChar: "1.2.3\u0007",
          WindowsPath: "C:\\tools\\thing.exe",
        },
      }),
    );

    expect(toolNamed(facts, "Utilities", "OnlyPath")).toEqual({category: "Utilities", name: "OnlyPath", found: true});
    expect(toolNamed(facts, "Utilities", "ControlChar")).toEqual({category: "Utilities", name: "ControlChar", found: true});
    expect(toolNamed(facts, "Utilities", "WindowsPath")).toEqual({category: "Utilities", name: "WindowsPath", found: true});

    const serialized = serialize(facts);
    expect(serialized).not.toContain("/usr/bin/only");
    expect(serialized).not.toContain("thing.exe");
    expect(serialized).not.toContain("\u0007");
  });

  it("sorts tools by category then name deterministically regardless of input order", () => {
    const facts = parseEnvinfoJson(
      serialize({
        Utilities: {Make: "4.3", Bazel: "7.0"},
        Binaries: {npm: "10.0.0", Node: "20.0.0"},
      }),
    );

    expect(facts.tools.map((tool) => `${tool.category}/${tool.name}`)).toEqual([
      "Binaries/Node",
      "Binaries/npm",
      "Utilities/Bazel",
      "Utilities/Make",
    ]);
  });
});

describe("parseEnvinfoJson - packages", () => {
  it("projects local and global packages from direct strings and installed/wanted records, ignoring duplicates", () => {
    const facts = parseEnvinfoJson(
      serialize({
        npmPackages: {
          react: "18.2.0",
          "@arolariu/components": {wanted: "^0.1.0", installed: "0.1.0", duplicates: ["0.0.9"], extra: "ignored"},
        },
        npmGlobalPackages: {
          typescript: {installed: "6.0.3"},
        },
      }),
    );

    expect(packageNamed(facts, "local", "react")).toEqual({scope: "local", name: "react", installed: "18.2.0"});
    expect(packageNamed(facts, "local", "@arolariu/components")).toEqual({
      scope: "local",
      name: "@arolariu/components",
      installed: "0.1.0",
      wanted: "^0.1.0",
    });
    expect(packageNamed(facts, "global", "typescript")).toEqual({scope: "global", name: "typescript", installed: "6.0.3"});
    expect(serialize(facts)).not.toContain("ignored");
    expect(serialize(facts)).not.toContain("0.0.9");
  });

  it("sorts packages by scope then name deterministically", () => {
    const facts = parseEnvinfoJson(
      serialize({
        npmPackages: {zod: "3.0.0", axios: "1.0.0"},
        npmGlobalPackages: {nx: "23.0.0", eslint: "9.0.0"},
      }),
    );

    expect(facts.packages.map((entry) => `${entry.scope}/${entry.name}`)).toEqual([
      "global/eslint",
      "global/nx",
      "local/axios",
      "local/zod",
    ]);
  });

  it("throws a concise error when a present package record has no accepted version field", () => {
    expect(() => parseEnvinfoJson(serialize({npmPackages: {broken: {duplicates: ["1.0.0"]}}}))).toThrow(/package/i);
  });

  it("throws when a package record installed/wanted field is a non-string", () => {
    expect(() => parseEnvinfoJson(serialize({npmPackages: {broken: {installed: 123}}}))).toThrow(/package/i);
  });

  it("throws when a recognized package category is not an object", () => {
    expect(() => parseEnvinfoJson(serialize({npmPackages: "not-an-object"}))).toThrow();
  });
});

describe("parseEnvinfoJson - malformed input", () => {
  it("throws on invalid JSON without echoing the source", () => {
    let message = "";
    try {
      parseEnvinfoJson("{not valid json");
    } catch (error: unknown) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).not.toBe("");
    expect(message).not.toContain("not valid json");
  });

  it("throws when the root document is not a single object", () => {
    expect(() => parseEnvinfoJson(serialize([1, 2, 3]))).toThrow();
    expect(() => parseEnvinfoJson(serialize("string-root"))).toThrow();
    expect(() => parseEnvinfoJson(serialize(null))).toThrow();
  });

  it("ignores additive non-object top-level categories", () => {
    const facts = parseEnvinfoJson(serialize({Binaries: {Node: "20.0.0"}, FutureScalar: 7, FutureFlag: true}));

    expect(toolNamed(facts, "Binaries", "Node")?.version).toBe("20.0.0");
    expect(facts.tools).toHaveLength(1);
  });

  it("never leaks an executable path from any category into the serialized result", () => {
    const facts = parseEnvinfoJson(
      serialize({
        System: {Shell: {version: "1.0", path: "/secret/shell/path"}},
        Binaries: {Node: "20.0.0 - /secret/binary/path"},
        Languages: {Python: {version: "3.12.0", path: "/secret/python/path"}},
      }),
    );

    const serialized = serialize(facts);
    expect(serialized).not.toContain("/secret/shell/path");
    expect(serialized).not.toContain("/secret/binary/path");
    expect(serialized).not.toContain("/secret/python/path");
  });
});
