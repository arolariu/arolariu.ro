// @vitest-environment node
/**
 * @fileoverview ESLint boundary and runtime immutability tests for the doctor pipeline.
 * @module scripts/doctor.readonly.test
 */

import {existsSync, readFileSync} from "node:fs";
import {spawn} from "node:child_process";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import ts from "typescript";
import {describe, expect, it, vi} from "vitest";
import {MonorepositoryConsoleLogger} from "./common/logger.ts";
import {createRepositoryPaths, type RepositoryPaths} from "./common/repository-paths.ts";
import type {RepositoryRequirements} from "./common/requirements.ts";
import {runDoctor} from "./doctor.ts";
import type {DiagnosticModule, DiagnosticModuleId, DiagnosticResult} from "./doctor.types.ts";
import type {RepositoryInspectionSession} from "./inspection/repository.ts";
import type {InspectionOutcome} from "./inspection/types.ts";

// ===== ESLint config reader =====

interface NoRestrictedImportsEntry {
  readonly name: string;
  readonly importNames?: readonly string[];
}

/**
 * Reads the `no-restricted-imports` paths from a named ESLint config variable in
 * `eslint.config.ts`. Throws when the variable or rule is not found so the test fails
 * RED before the restriction is added.
 */
function readNoRestrictedImportsPathsFromConfig(variableName: string): readonly NoRestrictedImportsEntry[] {
  const configPath = resolve(process.cwd(), "eslint.config.ts");
  const source = ts.createSourceFile(configPath, readFileSync(configPath, "utf8"), ts.ScriptTarget.Latest, true);

  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const decl of statement.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || decl.name.text !== variableName || !decl.initializer) continue;

      // Unwrap: defineConfig({…})[0] as Config
      let node: ts.Expression = decl.initializer;
      for (let i = 0; i < 4; i++) {
        if (
          ts.isAsExpression(node)
          || ts.isSatisfiesExpression(node)
          || ts.isNonNullExpression(node)
          || ts.isParenthesizedExpression(node)
        ) {
          node = node.expression;
        } else break;
      }
      if (ts.isElementAccessExpression(node)) node = node.expression;
      for (let i = 0; i < 4; i++) {
        if (
          ts.isAsExpression(node)
          || ts.isSatisfiesExpression(node)
          || ts.isNonNullExpression(node)
          || ts.isParenthesizedExpression(node)
        ) {
          node = node.expression;
        } else break;
      }

      if (!ts.isCallExpression(node) || node.arguments.length === 0) continue;
      const configArg = node.arguments[0];
      if (!configArg || !ts.isObjectLiteralExpression(configArg)) continue;

      const rulesProp = configArg.properties.find(
        (p): p is ts.PropertyAssignment =>
          ts.isPropertyAssignment(p)
          && ((ts.isIdentifier(p.name) && p.name.text === "rules") || (ts.isStringLiteral(p.name) && p.name.text === "rules")),
      );
      if (!rulesProp || !ts.isObjectLiteralExpression(rulesProp.initializer)) continue;

      const ruleProp = rulesProp.initializer.properties.find(
        (p): p is ts.PropertyAssignment =>
          ts.isPropertyAssignment(p) && ts.isStringLiteral(p.name) && p.name.text === "no-restricted-imports",
      );
      if (!ruleProp || !ts.isArrayLiteralExpression(ruleProp.initializer)) continue;

      const optionsElem = ruleProp.initializer.elements[1];
      if (!optionsElem || !ts.isObjectLiteralExpression(optionsElem)) continue;

      const pathsProp = optionsElem.properties.find(
        (p): p is ts.PropertyAssignment => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === "paths",
      );
      if (!pathsProp || !ts.isArrayLiteralExpression(pathsProp.initializer)) continue;

      return pathsProp.initializer.elements.flatMap((elem): NoRestrictedImportsEntry[] => {
        if (!ts.isObjectLiteralExpression(elem)) return [];
        let name: string | null = null;
        const importNames: string[] = [];

        for (const prop of elem.properties) {
          if (!ts.isPropertyAssignment(prop)) continue;
          const propKey = ts.isIdentifier(prop.name) ? prop.name.text : null;
          if (propKey === "name" && ts.isStringLiteral(prop.initializer)) {
            name = prop.initializer.text;
          } else if (propKey === "importNames" && ts.isArrayLiteralExpression(prop.initializer)) {
            for (const el of prop.initializer.elements) {
              if (ts.isStringLiteral(el)) importNames.push(el.text);
            }
          }
        }

        if (name === null) return [];
        return [{name, ...(importNames.length > 0 ? {importNames} : {})}];
      });
    }
  }

  throw new Error(`${variableName} with no-restricted-imports paths not found in eslint.config.ts`);
}

// ===== Test fixtures =====

const MODULE_ORDER: readonly DiagnosticModuleId[] = ["workspace", "dotnet", "react", "svelte", "python", "infrastructure"];
const REPRESENTATIVE_ID: Readonly<Record<DiagnosticModuleId, string>> = {
  workspace: "workspace.repository-root",
  dotnet: "dotnet.executable",
  react: "react.packages",
  svelte: "svelte.cv.packages",
  python: "python.runtime",
  infrastructure: "infrastructure.selection",
};

function passCheck(id: string, module: DiagnosticModuleId): DiagnosticResult {
  return {id, module, name: id, status: "pass", summary: `${id} healthy.`, evidence: [], potentialCauses: [], fixes: [], durationMs: 1};
}

function createFakeModules(): Readonly<{modules: readonly DiagnosticModule[]}> {
  const modules = MODULE_ORDER.map((id): DiagnosticModule => ({
    id,
    title: id,
    run: async (): Promise<readonly DiagnosticResult[]> => [passCheck(REPRESENTATIVE_ID[id], id)],
  }));
  return {modules};
}

const FIXED_REPOSITORY_PATHS: RepositoryPaths = createRepositoryPaths(resolve("C:\\fixture\\arolariu.ro"));
const FIXED_REQUIREMENTS: RepositoryRequirements = {
  node: {major: 24, minor: 0, patch: 0},
  npm: {major: 11, minor: 0, patch: 0},
  dotnet: {major: 10, minor: 0, patch: 0},
  python: {major: 3, minor: 12, patch: 0},
  packages: new Map(),
};

function createFakeInspectionSession(): RepositoryInspectionSession {
  return {
    inspect: async (_key: string): Promise<InspectionOutcome<unknown>> => ({
      kind: "unavailable" as const,
      reason: "Fake session for immutability test",
      durationMs: 0,
    }),
    invalidate: (): void => {},
    updateInfrastructureEngine: (): void => {},
  } as unknown as RepositoryInspectionSession;
}

function fixedDependencies() {
  let tick = 0;
  return {
    resolveRepositoryPaths: () => FIXED_REPOSITORY_PATHS,
    loadRepositoryRequirements: async () => ({status: "valid" as const, requirements: FIXED_REQUIREMENTS}),
    network: {
      get: vi.fn(async () => ({status: "unavailable" as const, durationMs: 0, error: "Fake network probe"})),
    },
    platform: "win32" as NodeJS.Platform,
    arch: "x64",
    env: {} as NodeJS.ProcessEnv,
    now: () => (tick += 1),
    timestamp: () => "2026-08-31T00:00:00.000Z",
    inspection: createFakeInspectionSession(),
    probes: {
      run: vi.fn(async () => {
        throw new Error("Probes must not be invoked by fake modules.");
      }),
    },
    logger: new MonorepositoryConsoleLogger("doctor", {verbose: false}),
  };
}

// ===== ESLint boundary tests =====

describe("doctor ESLint boundary restrictions", () => {
  it("doctorReadOnlyConfig bans execa and node:child_process imports", () => {
    const paths = readNoRestrictedImportsPathsFromConfig("doctorReadOnlyConfig");
    const names = paths.map((p) => p.name);
    expect(names).toContain("execa");
    expect(names).toContain("node:child_process");
  });

  it("doctorReadOnlyConfig bans mutating node:fs named imports", () => {
    const paths = readNoRestrictedImportsPathsFromConfig("doctorReadOnlyConfig");
    const fsPaths = paths.filter((p) => p.name === "node:fs");
    const fsImportNames = fsPaths.flatMap((p) => p.importNames ?? []);
    expect(fsImportNames).toEqual(
      expect.arrayContaining([
        "writeFile",
        "writeFileSync",
        "rm",
        "rmSync",
        "rename",
        "renameSync",
        "mkdir",
        "mkdirSync",
        "appendFile",
        "appendFileSync",
      ]),
    );
  });

  it("doctorReadOnlyConfig bans mutating node:fs/promises named imports", () => {
    const paths = readNoRestrictedImportsPathsFromConfig("doctorReadOnlyConfig");
    const fsPaths = paths.filter((p) => p.name === "node:fs/promises");
    const fsImportNames = fsPaths.flatMap((p) => p.importNames ?? []);
    expect(fsImportNames).toEqual(expect.arrayContaining(["writeFile", "rm", "rename", "mkdir", "appendFile"]));
  });

  it("doctorModuleIsolationConfig bans defaultCommandRunner and CommandRunner from process.ts", () => {
    const paths = readNoRestrictedImportsPathsFromConfig("doctorModuleIsolationConfig");
    const processPaths = paths.filter((p) => p.name === "./common/process.ts");
    const importNames = processPaths.flatMap((p) => p.importNames ?? []);
    expect(importNames).toEqual(expect.arrayContaining(["defaultCommandRunner", "CommandRunner"]));
  });
});

// ===== Runtime immutability tests =====

describe("doctor runtime immutability", () => {
  it("quick doctor does not create .nx or .arolariu directories", async () => {
    const root = resolve(process.cwd());
    const nxPath = resolve(root, ".nx");
    const arolaruPath = resolve(root, ".arolariu");

    const nxExistedBefore = existsSync(nxPath);
    const arolaruExistedBefore = existsSync(arolaruPath);

    const entrypoint = fileURLToPath(new URL("./doctor.ts", import.meta.url));
    await new Promise<void>((resolvePromise, reject) => {
      const child = spawn(process.execPath, [entrypoint, "--quick"], {
        cwd: root,
        stdio: ["ignore", "ignore", "ignore"],
        env: {...process.env, FORCE_COLOR: "0"},
      });
      child.once("error", reject);
      child.once("close", () => resolvePromise());
    });

    if (!nxExistedBefore) {
      expect(existsSync(nxPath), ".nx must not be created by quick doctor").toBe(false);
    }
    expect(existsSync(arolaruPath), ".arolariu must not be created by quick doctor").toBe(arolaruExistedBefore);
  }, 120_000);

  it("full-profile runDoctor with injected inspection session does not create .nx or .arolariu", async () => {
    const root = resolve(process.cwd());
    const nxPath = resolve(root, ".nx");
    const arolaruPath = resolve(root, ".arolariu");

    const nxExistedBefore = existsSync(nxPath);
    const arolaruExistedBefore = existsSync(arolaruPath);

    const {modules} = createFakeModules();
    await runDoctor(
      {quick: false, verbose: false},
      {
        ...fixedDependencies(),
        modules,
      },
    );

    if (!nxExistedBefore) {
      expect(existsSync(nxPath), ".nx must not be created during full-profile immutability test").toBe(false);
    }
    expect(existsSync(arolaruPath), ".arolariu must not be created during full-profile immutability test").toBe(arolaruExistedBefore);
  });
});
