/**
 * @fileoverview Verifies the CI broker boundary using the root compiler API.
 * @module scripts/ci-scripts-architecture-tests
 */
import {readFileSync, readdirSync} from "node:fs";
import {join, resolve} from "node:path";
import ts from "typescript";
import {describe, expect, it} from "vitest";
import entries from "../.github/scripts/helpers/sdk/fixtures/public-entrypoints.json";
import {PROVIDER_DESCRIPTORS} from "../.github/scripts/lib/hygiene/registry.ts";

const ciRoot = resolve(import.meta.dirname, "..", ".github", "scripts");
const sdkRoot = join(ciRoot, "helpers", "sdk");

describe("plan-aware hygiene workflow contract", () => {
  const workflow = readFileSync(resolve(ciRoot, "..", "workflows", "official-hygiene-check-v2.yml"), "utf8");
  function job(name: "detect" | "providers" | "gate"): string {
    const block = new RegExp(`^  ${name}:\\r?\\n([\\s\\S]*?)(?=^  [a-z][a-z-]*:|$(?![\\s\\S]))`, "m").exec(workflow)?.[1];
    if (!block) throw new Error(`Missing workflow job ${name}`);
    return block;
  }
  it("preserves six named providers, explicit scope default, and the complete gate graph", () => {
    expect(workflow).toMatch(/^name: "Code Hygiene Check \(v3\)"/m);
    expect(job("gate")).toMatch(/^    needs: \[detect, providers\]$/m);
    expect(job("gate")).toMatch(/^    if: always\(\)$/m);
    expect(workflow).toMatch(/^      scope:\r?\n(?:.*\r?\n)*?        default: affected/m);
    expect(PROVIDER_DESCRIPTORS.map((provider) => provider.name)).toEqual([
      "Prettier",
      "ESLint",
      "TypeScript Unit Tests",
      "DotNet Unit Tests",
      "Python Unit Tests",
      "Statistics",
    ]);
    expect(job("providers")).toMatch(/^    name: "🔧 \$\{\{ matrix.provider.label \}\}"$/m);
  });
  it("uses one durable plan, a six-entry plan matrix, and plan-owned setup flags", () => {
    expect(job("detect")).toMatch(/^    timeout-minutes: 15$/m);
    expect(job("providers")).toMatch(/^    if: needs.detect.result == 'success'$/m);
    expect(job("providers")).toMatch(/^      matrix: \$\{\{ fromJSON\(needs.detect.outputs.provider-matrix\) \}\}$/m);
    for (const [input, field] of [
      ["install-node-deps", "root-node-deps"],
      ["run-build-components", "build-components"],
      ["run-generate", "generate-artifacts"],
      ["dotnet", "needs-dotnet"],
      ["python", "needs-python"],
    ]) {
      expect(job("providers")).toMatch(new RegExp(`^          ${input}: \\$\\{\\{ matrix\\.provider\\.${field} \\}\\}$`, "m"));
    }
    expect(job("providers")).toContain("--plan");
    expect(job("gate")).toContain("--plan");
    expect(job("gate")).toMatch(/^          merge-multiple: false$/m);
    expect(workflow.match(/^\s+name: hygiene-plan$/gm)).toHaveLength(3);
  });
});

interface BoundaryViolation {
  readonly specifier: string;
  readonly line: number;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function manifest(packageName: string): Readonly<Record<string, unknown>> {
  const owner = packageName.split("/").slice(0, 2).join("/");
  const value: unknown = JSON.parse(readFileSync(join(ciRoot, "node_modules", owner, "package.json"), "utf8"));
  if (!isRecord(value)) throw new Error(`Invalid installed manifest for ${owner}`);
  return value;
}

function nativeDeclaration(packageName: string): string {
  const owner = packageName.split("/").slice(0, 2).join("/");
  const exports = manifest(packageName)["exports"];
  if (!isRecord(exports)) throw new Error(`Missing public export map for ${owner}`);
  const key = packageName === owner ? "." : `.${packageName.slice(owner.length)}`;
  const entry = exports[key];
  if (!isRecord(entry) || typeof entry["types"] !== "string") {
    throw new Error(`Missing public declarations for ${packageName}`);
  }
  return resolve(ciRoot, "node_modules", owner, entry["types"]);
}

function productionFiles(directory: string): string[] {
  return readdirSync(directory, {withFileTypes: true}).flatMap((entry) => {
    if (entry.name === "fixtures" || entry.name === "node_modules") return [];
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return productionFiles(path);
    return /\.(?:ts|js|mjs|cjs)$/.test(entry.name) && !/\.(?:test|spec|d)\.ts$/.test(entry.name) ? [path] : [];
  });
}

function findBoundaryViolations(source: string, file: string): readonly BoundaryViolation[] {
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const normalized = `/${file.replace(/\\/g, "/")}`;
  const nativeBoundary = normalized.includes("/helpers/sdk/");
  const workflowLayer = /\/(?:src|lib|types)\//.test(normalized);
  const resources = new Set([
    "fs",
    "fs/promises",
    "child_process",
    "http",
    "https",
    "http2",
    "net",
    "tls",
    "dgram",
    "worker_threads",
    "os",
  ]);
  const violations: BoundaryViolation[] = [];

  const record = (specifier: string, node: ts.Node): void => {
    const resource = specifier.replace(/^node:/, "");
    if (
      (!nativeBoundary && specifier.startsWith("@actions/"))
      || (workflowLayer && resources.has(resource))
      || (!nativeBoundary && specifier === "<opaque-import>")
    ) {
      violations.push({specifier, line: ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1});
    }
  };

  const visit = (node: ts.Node): void => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
      && node.moduleSpecifier
      && ts.isStringLiteral(node.moduleSpecifier)
    ) {
      record(node.moduleSpecifier.text, node);
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) {
      record(node.argument.literal.text, node);
    } else if (
      ts.isCallExpression(node)
      && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === "require"))
    ) {
      const argument = node.arguments[0];
      record(argument && ts.isStringLiteral(argument) ? argument.text : "<opaque-import>", node);
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  return violations;
}

describe("CI SDK architecture", () => {
  it("covers every supported entrypoint of each declared Actions package", () => {
    const raw: unknown = JSON.parse(readFileSync(join(ciRoot, "package.json"), "utf8"));
    if (!isRecord(raw) || !isRecord(raw["dependencies"])) throw new Error("Invalid CI package dependencies");
    const expected = Object.keys(raw["dependencies"])
      .filter((name) => name.startsWith("@actions/"))
      .flatMap((name) => {
        const exports = manifest(name)["exports"];
        if (!isRecord(exports)) throw new Error(`Missing export map for ${name}`);
        return Object.keys(exports).map((key) => (key === "." ? name : `${name}${key.slice(1)}`));
      });

    expect(entries.map((entry) => entry.package).sort()).toEqual(expected.sort());
  });

  const declarations = entries.map((entry) => nativeDeclaration(entry.package));
  const facades = entries.map((entry) => join(sdkRoot, entry.facade));
  const configuration = ts.readConfigFile(join(ciRoot, "tsconfig.json"), ts.sys.readFile);
  const options = ts.parseJsonConfigFileContent(configuration.config, ts.sys, ciRoot).options;
  const program = ts.createProgram([...declarations, ...facades], {...options, incremental: false, noEmit: true});
  const checker = program.getTypeChecker();

  const publicSymbols = (path: string): Map<string, ts.Symbol> => {
    const source = program.getSourceFile(path);
    const symbol = source && checker.getSymbolAtLocation(source);
    return new Map(
      symbol
        ? checker
            .getExportsOfModule(symbol)
            .map((item) => [item.name, item.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(item) : item])
        : [],
    );
  };

  it.each(entries)("preserves public value and type declarations for $package", (entry) => {
    const upstream = publicSymbols(nativeDeclaration(entry.package));
    const facade = publicSymbols(join(sdkRoot, entry.facade));
    expect([...facade.keys()].sort()).toEqual([...upstream.keys()].sort());
    for (const [name, symbol] of upstream) {
      expect(facade.get(name), `${entry.package}.${name}`).toBe(symbol);
    }
  });

  it("detects type-only, dynamic, and opaque SDK bypasses", () => {
    const violations = findBoundaryViolations(
      'import type {ExecOptions} from "@actions/exec"; await import("@actions/core"); require(variable);',
      "helpers/example.ts",
    );
    expect(violations.map((item) => item.specifier)).toEqual(["@actions/exec", "@actions/core", "<opaque-import>"]);
    expect(findBoundaryViolations('export * from "@actions/core";', "helpers/sdk/core.ts")).toEqual([]);
  });

  it("rejects SDK and resource bypasses in static/type/dynamic/require workflow imports", () => {
    const violations = findBoundaryViolations(
      'import type {AnnotationProperties} from "@actions/core"; await import("@actions/exec"); require("node:fs"); import type {Dirent} from "fs";',
      "src/example.ts",
    );
    expect(violations.map((violation) => violation.specifier)).toEqual(["@actions/core", "@actions/exec", "node:fs", "fs"]);
  });

  it("keeps every production workflow/service behind the helper broker boundary", () => {
    const violations = ["helpers", "lib", "src", "types"]
      .flatMap((directory) => productionFiles(join(ciRoot, directory)))
      .flatMap((path) => findBoundaryViolations(readFileSync(path, "utf8"), path).map((item) => ({file: path, ...item})));
    expect(violations).toEqual([]);
  });

  it("keeps external SDK imports inside native helper facades", () => {
    const violations = productionFiles(join(ciRoot, "helpers")).flatMap((path) =>
      findBoundaryViolations(readFileSync(path, "utf8"), path).map((item) => ({file: path, ...item})),
    );
    expect(violations).toEqual([]);
  });
});
