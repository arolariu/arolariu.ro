// @vitest-environment node
/**
 * @fileoverview AST policy tests for the declarative command runtime boundary.
 * @module scripts.common.runtime-boundary.test
 */

import {existsSync, readFileSync} from "node:fs";
import ts from "typescript";
import {describe, expect, it} from "vitest";

import {
  commanderEntrypointSourcePaths,
  piscinaRuntimeBoundaryExclusionSourcePaths,
} from "../testing/architecture/script-entrypoint-definitions.ts";
import {
  discoverProductionScriptFiles,
  discoverScriptSourceFiles,
  isScriptConfigurationFile,
  isScriptTestFile,
} from "../testing/architecture/script-source-files.ts";
import {
  analyzeCommandEntrypointSource,
  collectTypeScriptModuleReferences,
  completeModuleNamespaceImportName,
} from "../testing/architecture/typescript-module-analysis.ts";

type RuntimeBoundaryRule =
  | "execa-import"
  | "legacy-cli-import"
  | "legacy-process-import"
  | "ambient-filesystem"
  | "ambient-http"
  | "ambient-network"
  | "ambient-process-control"
  | "ambient-os-state"
  | "ambient-timer"
  | "ambient-environment"
  | "direct-exit"
  | "manual-entrypoint"
  | "direct-output"
  | "explicit-concurrency";

interface RuntimeBoundaryViolation {
  readonly file: string;
  readonly line: number;
  readonly rule: RuntimeBoundaryRule;
}

const runtimeBoundaryExclusions = new Set([
  ...piscinaRuntimeBoundaryExclusionSourcePaths,
  "scripts/types/format.ts",
  "scripts/types/lint.ts",
]);

const directOutputAdapters = new Set(["scripts/adapters/node/node-terminal-sink.ts", "scripts/common/prompts.ts"]);

/**
 * Every production module the process may be started with directly.
 *
 * @remarks
 * Each entry must export a typed command singleton and hand direct-entry detection to the shared
 * `runIfMain()` on the command host. The four excluded format/lint entrypoints are deliberately
 * absent: RFC 0002 section 3.2 keeps them on Piscina outside the command runtime. Derived from the
 * authoritative {@link commanderEntrypointSourcePaths} inventory instead of a parallel list.
 */
const directEntrypoints: readonly string[] = commanderEntrypointSourcePaths;

/**
 * Production script source files scanned by the runtime-boundary, shared-entrypoint, and Doctor
 * capability policies.
 *
 * @remarks
 * This preserves the current policy surface, including `scripts/common/runtime.testing.ts`, while
 * excluding only the new non-production `scripts/testing/**` architecture and compatibility
 * support added by this cohort.
 */
const runtimeBoundaryScanSourcePaths = discoverScriptSourceFiles().filter(
  (sourcePath) => !isScriptTestFile(sourcePath) && !isScriptConfigurationFile(sourcePath) && !sourcePath.startsWith("scripts/testing/"),
);

/** Modules deleted with the declarative migration; no production module may reference them again. */
const removedCompatibilityModules: readonly string[] = ["scripts/common/cli.ts", "scripts/common/process.ts"];

/** Module specifiers that spawn an operating-system process outside the approved runner adapter. */
const processSpawningModules: ReadonlySet<string> = new Set(["node:child_process", "child_process"]);

/** Sole worker adapter allowed to reuse the Node process runner outside a command runtime scope. */
const workerShellAdapter = "scripts/workers/shell.ts";

/**
 * Module specifiers no Doctor production module may import, because each one would hand Doctor a
 * mutating, process-spawning, or otherwise non-opaque capability.
 */
const doctorForbiddenModules: ReadonlySet<string> = new Set([
  "execa",
  "node:child_process",
  "child_process",
  "node:fs",
  "node:fs/promises",
  "fs",
  "fs/promises",
  "node:os",
  "os",
  "./common/runtime.node.ts",
  "./adapters/execa/execa-process-runner.ts",
]);

/** Imported names no Doctor production module may take, even from an otherwise approved module. */
const doctorForbiddenImportNames: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ["./common/runtime.ts", new Set(["FileSystem"])],
  ["./core/process/process-runner.ts", new Set(["ProcessRunner"])],
]);
/**
 * Approved production adapter of RFC 0002 section 5.3. It owns ambient filesystem, fetch, timer,
 * OS-state, signal, and final `process.exitCode` assignment access. `process.exit()` stays
 * prohibited everywhere, including here.
 */
const runtimeNodeAdapter = "scripts/common/runtime.node.ts";

/**
 * Approved Node terminal adapter. It owns the terminal, `NO_COLOR`, and progress-interval policy
 * the presentation core is forbidden to read, so it holds the same narrow ambient timer and
 * environment exemption the runtime Node adapter already has, and nothing wider.
 */
const nodeTerminalAdapter = "scripts/adapters/node/node-terminal-sink.ts";

/** Every adapter allowed to read ambient terminal-policy state directly. */
const ambientTerminalPolicyAdapters: ReadonlySet<string> = new Set([runtimeNodeAdapter, nodeTerminalAdapter]);
const execaAdapter = "scripts/adapters/execa/execa-process-runner.ts";
const assignmentOperators = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.EqualsToken,
  ts.SyntaxKind.BarBarEqualsToken,
  ts.SyntaxKind.AmpersandAmpersandEqualsToken,
  ts.SyntaxKind.QuestionQuestionEqualsToken,
  ts.SyntaxKind.PlusEqualsToken,
  ts.SyntaxKind.MinusEqualsToken,
  ts.SyntaxKind.AsteriskEqualsToken,
  ts.SyntaxKind.AsteriskAsteriskEqualsToken,
  ts.SyntaxKind.SlashEqualsToken,
  ts.SyntaxKind.PercentEqualsToken,
  ts.SyntaxKind.LessThanLessThanEqualsToken,
  ts.SyntaxKind.GreaterThanGreaterThanEqualsToken,
  ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken,
  ts.SyntaxKind.AmpersandEqualsToken,
  ts.SyntaxKind.BarEqualsToken,
  ts.SyntaxKind.CaretEqualsToken,
]);
const comparisonOperators = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.EqualsEqualsToken,
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken,
]);

type AccessPath = readonly string[];
type AliasScope = Map<string, AccessPath | null>;

function normalizeFilePath(file: string): string {
  return file.replaceAll("\\", "/");
}

/**
 * Production script source files scanned by the runtime-boundary policy's static AST scan.
 *
 * @returns {@link discoverProductionScriptFiles} filtered by the existing runtime-boundary
 * exclusions; that graph-shaped scan already excludes `runtime.testing.ts` because it is
 * test-support source.
 */
function discoverRuntimeBoundaryProductionScripts(): readonly string[] {
  return discoverProductionScriptFiles().filter((file) => !runtimeBoundaryExclusions.has(file));
}

function isPropertyNameLike(
  node: ts.PropertyName | ts.Expression,
): node is ts.Identifier | ts.StringLiteral | ts.NumericLiteral | ts.NoSubstitutionTemplateLiteral {
  return ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node);
}

function declareBindingName(name: ts.BindingName, scope: AliasScope, accessPath: AccessPath | null): void {
  if (ts.isIdentifier(name)) {
    scope.set(name.text, accessPath);
    return;
  }

  if (ts.isObjectBindingPattern(name)) {
    for (const element of name.elements) {
      if (ts.isOmittedExpression(element)) {
        continue;
      }

      let elementAccessPath: AccessPath | null = null;
      if (element.dotDotDotToken === undefined && accessPath !== null) {
        const propertyName = element.propertyName ?? (ts.isIdentifier(element.name) ? element.name : undefined);
        if (propertyName !== undefined && isPropertyNameLike(propertyName)) {
          elementAccessPath = [...accessPath, propertyName.text];
        }
      }

      declareBindingName(element.name, scope, elementAccessPath);
    }

    return;
  }

  for (const [index, element] of name.elements.entries()) {
    if (ts.isOmittedExpression(element)) {
      continue;
    }

    const elementAccessPath = element.dotDotDotToken === undefined && accessPath !== null ? [...accessPath, `${index}`] : null;

    declareBindingName(element.name, scope, elementAccessPath);
  }
}

function getAccessPath(expression: ts.Expression, scopes: readonly AliasScope[]): AccessPath | null {
  if (
    ts.isParenthesizedExpression(expression)
    || ts.isAsExpression(expression)
    || ts.isSatisfiesExpression(expression)
    || ts.isNonNullExpression(expression)
  ) {
    return getAccessPath(expression.expression, scopes);
  }

  if (ts.isIdentifier(expression)) {
    for (let index = scopes.length - 1; index >= 0; index--) {
      const scope = scopes[index];
      if (scope?.has(expression.text)) {
        return scope.get(expression.text) ?? null;
      }
    }

    return [expression.text];
  }

  if (ts.isPropertyAccessExpression(expression)) {
    const receiver = getAccessPath(expression.expression, scopes);
    return receiver === null ? null : [...receiver, expression.name.text];
  }

  if (ts.isElementAccessExpression(expression) && isPropertyNameLike(expression.argumentExpression)) {
    const receiver = getAccessPath(expression.expression, scopes);
    return receiver === null ? null : [...receiver, expression.argumentExpression.text];
  }

  return null;
}

function startsWithPath(path: AccessPath, prefix: readonly string[]): boolean {
  return prefix.every((segment, index) => path[index] === segment);
}

function isDynamicImport(node: ts.CallExpression): boolean {
  return node.expression.kind === ts.SyntaxKind.ImportKeyword;
}

function visitFunction(
  node: ts.FunctionLikeDeclaration,
  scopes: readonly AliasScope[],
  visit: (node: ts.Node, scopes: readonly AliasScope[]) => void,
): void {
  const functionScope: AliasScope = new Map();
  if (node.name !== undefined && ts.isIdentifier(node.name)) {
    functionScope.set(node.name.text, null);
  }

  for (const [index, parameter] of node.parameters.entries()) {
    declareBindingName(parameter.name, functionScope, [`<parameter:${index}>`]);
  }

  const functionScopes = [...scopes, functionScope];
  for (const parameter of node.parameters) {
    if (parameter.initializer !== undefined) {
      visit(parameter.initializer, functionScopes);
    }
  }

  if (node.body !== undefined) {
    visit(node.body, functionScopes);
  }
}

function scanRuntimeBoundarySource(file: string, sourceText: string): readonly RuntimeBoundaryViolation[] {
  const normalizedFile = normalizeFilePath(file);
  const source = ts.createSourceFile(normalizedFile, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const violations: RuntimeBoundaryViolation[] = [];
  const seen = new Set<string>();

  function add(node: ts.Node, rule: RuntimeBoundaryRule): void {
    const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
    const key = `${normalizedFile}:${line}:${rule}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    violations.push({file: normalizedFile, line, rule});
  }

  function addModuleSpecifierViolation(node: ts.Node, specifier: string): void {
    if (specifier === "execa" && normalizedFile !== execaAdapter) {
      add(node, "execa-import");
    }

    if (specifier.endsWith("/common/cli.ts") || specifier === "./common/cli.ts" || specifier === "./cli.ts") {
      add(node, "legacy-cli-import");
    }

    if (specifier.endsWith("/common/process.ts") || specifier === "./common/process.ts" || specifier === "./process.ts") {
      add(node, "legacy-process-import");
    }

    if (normalizedFile === runtimeNodeAdapter) {
      return;
    }

    if (specifier === "node:fs" || specifier === "node:fs/promises" || specifier === "fs" || specifier === "fs/promises") {
      add(node, "ambient-filesystem");
    }

    if (specifier === "node:child_process" || specifier === "child_process") {
      add(node, "ambient-process-control");
    }

    if (
      specifier === "node:http"
      || specifier === "node:https"
      || specifier === "node:net"
      || specifier === "http"
      || specifier === "https"
      || specifier === "net"
    ) {
      add(node, "ambient-network");
    }

    if (specifier === "node:os" || specifier === "os") {
      add(node, "ambient-os-state");
    }

    if (specifier === "node:timers" || specifier === "node:timers/promises" || specifier === "timers" || specifier === "timers/promises") {
      add(node, "ambient-timer");
    }
  }

  function isDirectOutputPath(path: AccessPath): boolean {
    return (
      (path.length === 2 && path[0] === "console")
      || (path.length === 3 && path[0] === "process" && (path[1] === "stdout" || path[1] === "stderr") && path[2] === "write")
    );
  }

  function isAmbientTimerCallPath(path: AccessPath): boolean {
    return (
      (path.length === 1 && (path[0] === "setTimeout" || path[0] === "setInterval"))
      || (path.length === 2 && path[0] === "performance" && path[1] === "now")
      || (path.length === 2 && path[0] === "Date" && path[1] === "now")
    );
  }

  function isAmbientEnvironmentPath(path: AccessPath): boolean {
    return startsWithPath(path, ["process", "env"]);
  }

  function isAmbientOsStatePath(path: AccessPath): boolean {
    return (
      startsWithPath(path, ["process", "argv"])
      || startsWithPath(path, ["process", "execPath"])
      || startsWithPath(path, ["process", "platform"])
      || startsWithPath(path, ["process", "arch"])
      || startsWithPath(path, ["process", "pid"])
      || startsWithPath(path, ["process", "version"])
      || startsWithPath(path, ["process", "versions"])
    );
  }

  function isAmbientOsStateCallPath(path: AccessPath): boolean {
    return isAmbientOsStatePath(path) || startsWithPath(path, ["process", "cwd"]);
  }

  function isAmbientProcessControlPath(path: AccessPath): boolean {
    return (
      startsWithPath(path, ["process", "chdir"])
      || startsWithPath(path, ["process", "kill"])
      || startsWithPath(path, ["process", "on"])
      || startsWithPath(path, ["process", "once"])
      || startsWithPath(path, ["process", "addListener"])
      || startsWithPath(path, ["process", "removeListener"])
      || startsWithPath(path, ["process", "off"])
    );
  }

  function expressionContainsAccessPath(
    expression: ts.Expression,
    scopes: readonly AliasScope[],
    predicate: (path: AccessPath) => boolean,
  ): boolean {
    let found = false;

    function visitExpression(node: ts.Node): void {
      if (found) {
        return;
      }

      if (ts.isExpression(node)) {
        const path = getAccessPath(node, scopes);
        if (path !== null && predicate(path)) {
          found = true;
          return;
        }
      }

      ts.forEachChild(node, visitExpression);
    }

    visitExpression(expression);
    return found;
  }

  function isImportMetaUrlExpression(expression: ts.Expression): boolean {
    return (
      ts.isPropertyAccessExpression(expression)
      && expression.name.text === "url"
      && ts.isMetaProperty(expression.expression)
      && expression.expression.keywordToken === ts.SyntaxKind.ImportKeyword
      && expression.expression.name.text === "meta"
    );
  }

  function expressionContainsImportMetaUrl(expression: ts.Expression): boolean {
    let found = false;

    function visitExpression(node: ts.Node): void {
      if (found) {
        return;
      }

      if (ts.isExpression(node) && isImportMetaUrlExpression(node)) {
        found = true;
        return;
      }

      ts.forEachChild(node, visitExpression);
    }

    visitExpression(expression);
    return found;
  }

  function isOutermostAccessPathExpression(node: ts.Expression): boolean {
    return !((ts.isPropertyAccessExpression(node.parent) || ts.isElementAccessExpression(node.parent)) && node.parent.expression === node);
  }

  function visit(node: ts.Node, scopes: readonly AliasScope[]): void {
    if (ts.isSourceFile(node) || ts.isBlock(node) || ts.isModuleBlock(node)) {
      const blockScopes = [...scopes, new Map<string, AccessPath | null>()];
      for (const statement of node.statements) {
        visit(statement, blockScopes);
      }
      return;
    }

    const scope = scopes.at(-1);
    if (scope === undefined) {
      throw new Error("Runtime boundary traversal requires an active lexical scope.");
    }

    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      addModuleSpecifierViolation(node, node.moduleSpecifier.text);
    }

    if (ts.isExportDeclaration(node) && node.moduleSpecifier !== undefined && ts.isStringLiteral(node.moduleSpecifier)) {
      addModuleSpecifierViolation(node, node.moduleSpecifier.text);
    }

    if (ts.isVariableDeclarationList(node)) {
      const isConstant = (node.flags & ts.NodeFlags.Const) !== 0;
      for (const declaration of node.declarations) {
        if (declaration.initializer !== undefined) {
          visit(declaration.initializer, scopes);
        }

        const accessPath = isConstant && declaration.initializer !== undefined ? getAccessPath(declaration.initializer, scopes) : null;

        declareBindingName(declaration.name, scope, accessPath);
      }
      return;
    }

    if (ts.isFunctionDeclaration(node)) {
      if (node.name !== undefined) {
        scope.set(node.name.text, null);
      }

      visitFunction(node, scopes, visit);
      return;
    }

    if (
      ts.isFunctionExpression(node)
      || ts.isArrowFunction(node)
      || ts.isMethodDeclaration(node)
      || ts.isConstructorDeclaration(node)
      || ts.isGetAccessorDeclaration(node)
      || ts.isSetAccessorDeclaration(node)
    ) {
      visitFunction(node, scopes, visit);
      return;
    }

    if (ts.isClassDeclaration(node) && node.name !== undefined) {
      scope.set(node.name.text, null);
    }

    if (ts.isCallExpression(node)) {
      if (isDynamicImport(node) && node.arguments.length === 1) {
        const specifier = node.arguments[0];
        if (specifier !== undefined && (ts.isStringLiteral(specifier) || ts.isNoSubstitutionTemplateLiteral(specifier))) {
          addModuleSpecifierViolation(node, specifier.text);
        }
      }

      const path = getAccessPath(node.expression, scopes);
      if (path !== null) {
        if (isDirectOutputPath(path) && !directOutputAdapters.has(normalizedFile)) {
          add(node, "direct-output");
        }

        if (path.length === 2 && path[0] === "process" && path[1] === "exit") {
          add(node, "direct-exit");
        }

        if (path.length === 1 && path[0] === "fetch" && normalizedFile !== runtimeNodeAdapter) {
          add(node, "ambient-http");
        }

        if (isAmbientTimerCallPath(path) && !ambientTerminalPolicyAdapters.has(normalizedFile)) {
          add(node, "ambient-timer");
        }

        if (isAmbientOsStateCallPath(path) && normalizedFile !== runtimeNodeAdapter) {
          add(node, "ambient-os-state");
        }

        if (isAmbientProcessControlPath(path) && normalizedFile !== runtimeNodeAdapter) {
          add(node, "ambient-process-control");
        }

        if (path.length === 2 && path[0] === "Promise" && (path[1] === "all" || path[1] === "allSettled")) {
          add(node, "explicit-concurrency");
        }
      }
    }

    if ((ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) && isOutermostAccessPathExpression(node)) {
      const path = getAccessPath(node, scopes);
      if (path !== null) {
        if (isAmbientEnvironmentPath(path) && !ambientTerminalPolicyAdapters.has(normalizedFile)) {
          add(node, "ambient-environment");
        }

        if (isAmbientOsStatePath(path) && normalizedFile !== runtimeNodeAdapter) {
          add(node, "ambient-os-state");
        }
      }
    }

    if (ts.isBinaryExpression(node)) {
      const leftPath = getAccessPath(node.left, scopes);
      if (
        leftPath !== null
        && startsWithPath(leftPath, ["process", "exitCode"])
        && assignmentOperators.has(node.operatorToken.kind)
        && normalizedFile !== runtimeNodeAdapter
      ) {
        add(node, "direct-exit");
      }

      if (
        comparisonOperators.has(node.operatorToken.kind)
        && ((expressionContainsImportMetaUrl(node.left)
          && expressionContainsAccessPath(node.right, scopes, (path) => startsWithPath(path, ["process", "argv"])))
          || (expressionContainsImportMetaUrl(node.right)
            && expressionContainsAccessPath(node.left, scopes, (path) => startsWithPath(path, ["process", "argv"]))))
      ) {
        add(node, "manual-entrypoint");
      }
    }

    if (ts.isNewExpression(node) && (node.arguments?.length ?? 0) === 0) {
      const path = getAccessPath(node.expression, scopes);
      if (path !== null && path.length === 1 && path[0] === "Date" && normalizedFile !== runtimeNodeAdapter) {
        add(node, "ambient-timer");
      }
    }

    ts.forEachChild(node, (child) => visit(child, scopes));
  }

  visit(source, []);
  return violations.toSorted(
    (left, right) => left.file.localeCompare(right.file) || left.line - right.line || left.rule.localeCompare(right.rule),
  );
}

/**
 * Scans every included production script against the runtime boundary rules.
 *
 * @returns The complete, deterministically ordered production runtime-boundary debt.
 */
function scanRuntimeBoundaryRepository(): readonly RuntimeBoundaryViolation[] {
  return discoverRuntimeBoundaryProductionScripts().flatMap((fileName) =>
    scanRuntimeBoundarySource(fileName, readFileSync(fileName, "utf8")),
  );
}

/**
 * Finds every production module that starts itself through the shared command host.
 *
 * @returns Sorted module paths that call `runIfMain(import.meta.url)`.
 */
function discoverSharedEntrypointModules(): readonly string[] {
  return runtimeBoundaryScanSourcePaths.filter((file) => analyzeCommandEntrypointSource(readFileSync(file, "utf8")).usesSharedRunIfMain);
}

/** One Doctor module import that would widen Doctor beyond read-only, opaque capabilities. */
interface DoctorCapabilityViolation {
  /** Doctor module holding the import. */
  readonly file: string;
  /** Module specifier that carries the forbidden capability. */
  readonly specifier: string;
  /** Imported name when the module itself is approved but the name is not. */
  readonly name?: string;
}

function scanDoctorCapabilitySource(file: string, sourceText: string): readonly DoctorCapabilityViolation[] {
  return collectTypeScriptModuleReferences(sourceText).references.flatMap((moduleReference): readonly DoctorCapabilityViolation[] => {
    if (doctorForbiddenModules.has(moduleReference.specifier)) {
      return [{file, specifier: moduleReference.specifier}];
    }

    const forbiddenNames = doctorForbiddenImportNames.get(moduleReference.specifier);
    if (forbiddenNames === undefined) {
      return [];
    }

    return moduleReference.importedNames
      .filter((name) => name === completeModuleNamespaceImportName || forbiddenNames.has(name))
      .map((name) => ({file, specifier: moduleReference.specifier, name}));
  });
}

/**
 * Scans the Doctor production surface for capabilities wider than read-only and opaque probes.
 *
 * @returns Every forbidden Doctor capability import.
 */
function scanDoctorCapabilities(): readonly DoctorCapabilityViolation[] {
  return runtimeBoundaryScanSourcePaths
    .filter((file) => /^scripts\/doctor[.\w-]*\.ts$/.test(file))
    .flatMap((file) => scanDoctorCapabilitySource(file, readFileSync(file, "utf8")));
}

describe("runtime boundary policy", () => {
  it("keeps the exact production exclusions", () => {
    expect([...runtimeBoundaryExclusions]).toEqual([
      "scripts/format.ts",
      "scripts/lint.ts",
      "scripts/workers/format.worker.ts",
      "scripts/workers/lint.worker.ts",
      "scripts/types/format.ts",
      "scripts/types/lint.ts",
    ]);
  });

  it("detects aliased process exit and fetch usage", () => {
    const source = [
      "const processAlias = process;",
      "processAlias.exitCode = 1;",
      "const request = fetch;",
      "await request('https://example.test');",
    ].join("\n");

    expect(scanRuntimeBoundarySource("scripts/example.ts", source)).toEqual([
      {file: "scripts/example.ts", line: 2, rule: "direct-exit"},
      {file: "scripts/example.ts", line: 4, rule: "ambient-http"},
    ]);
  });

  it("allows only the runtime Node adapter to assign the final exit code", () => {
    const source = ["process.exitCode = 1;", "const processAlias = process;", "processAlias.exitCode ??= 2;"].join("\n");

    expect(scanRuntimeBoundarySource("scripts/common/runtime.node.ts", source)).toEqual([]);
    expect(scanRuntimeBoundarySource("scripts/core/command/abstract-monorepo-command.ts", source)).toEqual([
      {file: "scripts/core/command/abstract-monorepo-command.ts", line: 1, rule: "direct-exit"},
      {file: "scripts/core/command/abstract-monorepo-command.ts", line: 3, rule: "direct-exit"},
    ]);
  });

  it("keeps flagging process.exit() inside the runtime Node adapter", () => {
    const source = ["process.exit(1);", "const exit = process.exit;", "exit(2);"].join("\n");

    expect(scanRuntimeBoundarySource("scripts/common/runtime.node.ts", source)).toEqual([
      {file: "scripts/common/runtime.node.ts", line: 1, rule: "direct-exit"},
      {file: "scripts/common/runtime.node.ts", line: 3, rule: "direct-exit"},
    ]);
  });

  it.each<readonly [string, string, RuntimeBoundaryViolation[]]>([
    [
      "flags bare filesystem imports",
      'import {readFileSync} from "fs";',
      [{file: "scripts/example.ts", line: 1, rule: "ambient-filesystem"}],
    ],
    [
      "flags bare process-control imports",
      'import {execFile} from "child_process";',
      [{file: "scripts/example.ts", line: 1, rule: "ambient-process-control"}],
    ],
    ["flags os export specifiers", 'export * from "node:os";', [{file: "scripts/example.ts", line: 1, rule: "ambient-os-state"}]],
    ["flags timer dynamic imports", 'await import("timers/promises");', [{file: "scripts/example.ts", line: 1, rule: "ambient-timer"}]],
    ["flags execa dynamic imports", 'await import("execa");', [{file: "scripts/example.ts", line: 1, rule: "execa-import"}]],
    [
      "flags legacy process dynamic imports",
      'await import("./common/process.ts");',
      [{file: "scripts/example.ts", line: 1, rule: "legacy-process-import"}],
    ],
    [
      "flags legacy cli dynamic imports",
      'await import("./common/cli.ts");',
      [{file: "scripts/example.ts", line: 1, rule: "legacy-cli-import"}],
    ],
  ])("%s", (_label, source, expected) => {
    expect(scanRuntimeBoundarySource("scripts/example.ts", source)).toEqual(expected);
  });

  it("detects timer, environment, output, concurrency, and entrypoint violations", () => {
    const source = [
      "const pause = setTimeout;",
      "pause(() => undefined, 10);",
      "const measure = performance.now;",
      "measure();",
      "Date.now();",
      "new Date();",
      "void process.env.PATH;",
      "process.cwd();",
      "process.chdir('next');",
      "process.kill(process.pid);",
      "process.on('SIGINT', () => undefined);",
      "console.log('visible');",
      "await Promise.allSettled([]);",
      "const isMain = fileURLToPath(import.meta.url) === resolve(process.argv[1]);",
    ].join("\n");

    expect(scanRuntimeBoundarySource("scripts/example.ts", source)).toEqual([
      {file: "scripts/example.ts", line: 2, rule: "ambient-timer"},
      {file: "scripts/example.ts", line: 4, rule: "ambient-timer"},
      {file: "scripts/example.ts", line: 5, rule: "ambient-timer"},
      {file: "scripts/example.ts", line: 6, rule: "ambient-timer"},
      {file: "scripts/example.ts", line: 7, rule: "ambient-environment"},
      {file: "scripts/example.ts", line: 8, rule: "ambient-os-state"},
      {file: "scripts/example.ts", line: 9, rule: "ambient-process-control"},
      {file: "scripts/example.ts", line: 10, rule: "ambient-os-state"},
      {file: "scripts/example.ts", line: 10, rule: "ambient-process-control"},
      {file: "scripts/example.ts", line: 11, rule: "ambient-process-control"},
      {file: "scripts/example.ts", line: 12, rule: "direct-output"},
      {file: "scripts/example.ts", line: 13, rule: "explicit-concurrency"},
      {file: "scripts/example.ts", line: 14, rule: "ambient-os-state"},
      {file: "scripts/example.ts", line: 14, rule: "manual-entrypoint"},
    ]);
  });

  it("flags the running Node runtime version as ambient OS state", () => {
    const source = [
      "const major = process.versions.node;",
      'void process.versions["node"];',
      "void process.version;",
      "const {versions} = process;",
      "void versions.node;",
    ].join("\n");

    expect(scanRuntimeBoundarySource("scripts/example.ts", source)).toEqual([
      {file: "scripts/example.ts", line: 1, rule: "ambient-os-state"},
      {file: "scripts/example.ts", line: 2, rule: "ambient-os-state"},
      {file: "scripts/example.ts", line: 3, rule: "ambient-os-state"},
      {file: "scripts/example.ts", line: 5, rule: "ambient-os-state"},
    ]);
  });

  it("leaves no production runtime-boundary debt", () => {
    expect(scanRuntimeBoundaryRepository()).toEqual([]);
  });

  it("keeps every production script free of direct Execa and child-process imports", () => {
    const violations = runtimeBoundaryScanSourcePaths.flatMap((file) =>
      collectTypeScriptModuleReferences(readFileSync(file, "utf8"))
        .references.filter(
          (moduleReference) =>
            processSpawningModules.has(moduleReference.specifier) || (moduleReference.specifier === "execa" && file !== execaAdapter),
        )
        .map((moduleReference) => ({file, specifier: moduleReference.specifier})),
    );

    expect(violations).toEqual([]);
    expect(
      collectTypeScriptModuleReferences(readFileSync(execaAdapter, "utf8")).references.map((moduleReference) => moduleReference.specifier),
    ).toContain("execa");
  });

  it("removed every compatibility module and every reference to one", () => {
    expect(removedCompatibilityModules.filter((file) => existsSync(file))).toEqual([]);
    expect(
      scanRuntimeBoundaryRepository().filter(
        (violation) => violation.rule === "legacy-cli-import" || violation.rule === "legacy-process-import",
      ),
    ).toEqual([]);
  });

  it("leaves no manual direct-entry detection or direct process exit in production", () => {
    expect(
      scanRuntimeBoundaryRepository().filter((violation) => violation.rule === "manual-entrypoint" || violation.rule === "direct-exit"),
    ).toEqual([]);
  });

  it("starts every direct entrypoint through an exported command and shared runIfMain", () => {
    expect(discoverSharedEntrypointModules()).toEqual(directEntrypoints);

    const violations = directEntrypoints
      .map((file) => ({file, ...analyzeCommandEntrypointSource(readFileSync(file, "utf8"))}))
      .filter((entrypoint) => !entrypoint.exportsCommandSingleton || !entrypoint.usesSharedRunIfMain);

    expect(violations).toEqual([]);
  });

  it("keeps doctor modules on read-only and opaque capabilities", () => {
    expect(scanDoctorCapabilities()).toEqual([]);
  });

  it("rejects named and whole-module imports that widen Doctor capabilities", () => {
    const source = [
      'import type {FileSystem, Clock} from "./common/runtime.ts";',
      'import * as runtime from "./common/runtime.ts";',
      'import runner from "./core/process/process-runner.ts";',
      'export * from "./core/process/process-runner.ts";',
      'void import("./common/runtime.ts");',
    ].join("\n");

    expect(scanDoctorCapabilitySource("scripts/doctor.example.ts", source)).toEqual([
      {file: "scripts/doctor.example.ts", specifier: "./common/runtime.ts", name: "FileSystem"},
      {file: "scripts/doctor.example.ts", specifier: "./common/runtime.ts", name: "*"},
      {file: "scripts/doctor.example.ts", specifier: "./core/process/process-runner.ts", name: "*"},
      {file: "scripts/doctor.example.ts", specifier: "./core/process/process-runner.ts", name: "*"},
      {file: "scripts/doctor.example.ts", specifier: "./common/runtime.ts", name: "*"},
    ]);
  });

  it("keeps the worker shell on the generic process runner", () => {
    const specifiers = collectTypeScriptModuleReferences(readFileSync(workerShellAdapter, "utf8")).references;

    expect(specifiers).toContainEqual({
      specifier: "../common/runtime.node.ts",
      importedNames: ["nodeProcessRunner"],
      referenceKind: "import",
      typeOnly: false,
    });
    expect(
      specifiers.filter(
        (moduleReference) => processSpawningModules.has(moduleReference.specifier) || moduleReference.specifier === "execa",
      ),
    ).toEqual([]);
  });
});
