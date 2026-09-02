// @vitest-environment node
/**
 * @fileoverview AST policy tests for the declarative command runtime boundary.
 * @module scripts.common.runtime-boundary.test
 */

import {readdirSync, readFileSync} from "node:fs";
import {join} from "node:path";
import ts from "typescript";
import {describe, expect, it} from "vitest";

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
  "scripts/format.ts",
  "scripts/lint.ts",
  "scripts/workers/format.worker.ts",
  "scripts/workers/lint.worker.ts",
  "scripts/types/format.ts",
  "scripts/types/lint.ts",
]);

const productionScriptExtensions = new Set([".ts", ".js", ".mjs", ".cjs"]);
const directOutputAdapters = new Set(["scripts/common/logger.ts", "scripts/common/prompts.ts"]);
/**
 * Approved production adapter of RFC 0002 section 5.3. It owns ambient filesystem, fetch, timer,
 * OS-state, signal, and final `process.exitCode` assignment access. `process.exit()` stays
 * prohibited everywhere, including here.
 */
const runtimeNodeAdapter = "scripts/common/runtime.node.ts";
const execaAdapter = "scripts/common/runner.execa.ts";
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

function isTestFile(file: string): boolean {
  return /\.(?:spec|test)\.(?:cjs|js|mjs|ts)$/.test(file);
}

function discoverRuntimeBoundaryProductionScripts(directory: string = "scripts"): readonly string[] {
  const files: string[] = [];

  for (const entry of readdirSync(directory, {withFileTypes: true})) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...discoverRuntimeBoundaryProductionScripts(path));
      continue;
    }

    const normalizedPath = normalizeFilePath(path);
    const extension = normalizedPath.slice(normalizedPath.lastIndexOf("."));
    if (
      productionScriptExtensions.has(extension)
      && !isTestFile(normalizedPath)
      && normalizedPath !== "scripts/common/runtime.testing.ts"
      && !runtimeBoundaryExclusions.has(normalizedPath)
    ) {
      files.push(normalizedPath);
    }
  }

  return files.toSorted();
}

function isPropertyNameLike(
  node: ts.PropertyName | ts.Expression,
): node is ts.Identifier | ts.StringLiteral | ts.NumericLiteral | ts.NoSubstitutionTemplateLiteral {
  return (
    ts.isIdentifier(node)
    || ts.isStringLiteral(node)
    || ts.isNumericLiteral(node)
    || ts.isNoSubstitutionTemplateLiteral(node)
  );
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

    const elementAccessPath =
      element.dotDotDotToken === undefined && accessPath !== null ? [...accessPath, `${index}`] : null;

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

function visitFunction(node: ts.FunctionLikeDeclaration, scopes: readonly AliasScope[], visit: (node: ts.Node, scopes: readonly AliasScope[]) => void): void {
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

function scanRuntimeBoundarySource(
  file: string,
  sourceText: string,
): readonly RuntimeBoundaryViolation[] {
  const normalizedFile = normalizeFilePath(file);
  const source = ts.createSourceFile(
    normalizedFile,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
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

    if (
      specifier === "node:timers"
      || specifier === "node:timers/promises"
      || specifier === "timers"
      || specifier === "timers/promises"
    ) {
      add(node, "ambient-timer");
    }
  }

  function isDirectOutputPath(path: AccessPath): boolean {
    return (path.length === 2 && path[0] === "console")
      || (path.length === 3 && path[0] === "process" && (path[1] === "stdout" || path[1] === "stderr") && path[2] === "write");
  }

  function isAmbientTimerCallPath(path: AccessPath): boolean {
    return (path.length === 1 && (path[0] === "setTimeout" || path[0] === "setInterval"))
      || (path.length === 2 && path[0] === "performance" && path[1] === "now")
      || (path.length === 2 && path[0] === "Date" && path[1] === "now");
  }

  function isAmbientEnvironmentPath(path: AccessPath): boolean {
    return startsWithPath(path, ["process", "env"]);
  }

  function isAmbientOsStatePath(path: AccessPath): boolean {
    return startsWithPath(path, ["process", "argv"])
      || startsWithPath(path, ["process", "execPath"])
      || startsWithPath(path, ["process", "platform"])
      || startsWithPath(path, ["process", "arch"])
      || startsWithPath(path, ["process", "pid"]);
  }

  function isAmbientOsStateCallPath(path: AccessPath): boolean {
    return isAmbientOsStatePath(path) || startsWithPath(path, ["process", "cwd"]);
  }

  function isAmbientProcessControlPath(path: AccessPath): boolean {
    return startsWithPath(path, ["process", "chdir"])
      || startsWithPath(path, ["process", "kill"])
      || startsWithPath(path, ["process", "on"])
      || startsWithPath(path, ["process", "once"])
      || startsWithPath(path, ["process", "addListener"])
      || startsWithPath(path, ["process", "removeListener"])
      || startsWithPath(path, ["process", "off"]);
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
    return ts.isPropertyAccessExpression(expression)
      && expression.name.text === "url"
      && ts.isMetaProperty(expression.expression)
      && expression.expression.keywordToken === ts.SyntaxKind.ImportKeyword
      && expression.expression.name.text === "meta";
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
    return !(
      (ts.isPropertyAccessExpression(node.parent) || ts.isElementAccessExpression(node.parent))
      && node.parent.expression === node
    );
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

        const accessPath =
          isConstant && declaration.initializer !== undefined ? getAccessPath(declaration.initializer, scopes) : null;

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

        if (isAmbientTimerCallPath(path) && normalizedFile !== runtimeNodeAdapter) {
          add(node, "ambient-timer");
        }

        if (isAmbientOsStateCallPath(path) && normalizedFile !== runtimeNodeAdapter) {
          add(node, "ambient-os-state");
        }

        if (isAmbientProcessControlPath(path) && normalizedFile !== runtimeNodeAdapter) {
          add(node, "ambient-process-control");
        }

        if (
          path.length === 2
          && path[0] === "Promise"
          && (path[1] === "all" || path[1] === "allSettled")
        ) {
          add(node, "explicit-concurrency");
        }
      }
    }

    if (
      (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node))
      && isOutermostAccessPathExpression(node)
    ) {
      const path = getAccessPath(node, scopes);
      if (path !== null && normalizedFile !== runtimeNodeAdapter) {
        if (isAmbientEnvironmentPath(path)) {
          add(node, "ambient-environment");
        }

        if (isAmbientOsStatePath(path)) {
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
        && (
          (expressionContainsImportMetaUrl(node.left) && expressionContainsAccessPath(node.right, scopes, (path) => startsWithPath(path, ["process", "argv"])))
          || (expressionContainsImportMetaUrl(node.right) && expressionContainsAccessPath(node.left, scopes, (path) => startsWithPath(path, ["process", "argv"])))
        )
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
    (left, right) =>
      left.file.localeCompare(right.file)
      || left.line - right.line
      || left.rule.localeCompare(right.rule),
  );
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
    const source = [
      "process.exitCode = 1;",
      "const processAlias = process;",
      "processAlias.exitCode ??= 2;",
    ].join("\n");

    expect(scanRuntimeBoundarySource("scripts/common/runtime.node.ts", source)).toEqual([]);
    expect(scanRuntimeBoundarySource("scripts/common/commander.ts", source)).toEqual([
      {file: "scripts/common/commander.ts", line: 1, rule: "direct-exit"},
      {file: "scripts/common/commander.ts", line: 3, rule: "direct-exit"},
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
    [
      "flags os export specifiers",
      'export * from "node:os";',
      [{file: "scripts/example.ts", line: 1, rule: "ambient-os-state"}],
    ],
    [
      "flags timer dynamic imports",
      'await import("timers/promises");',
      [{file: "scripts/example.ts", line: 1, rule: "ambient-timer"}],
    ],
    [
      "flags execa dynamic imports",
      'await import("execa");',
      [{file: "scripts/example.ts", line: 1, rule: "execa-import"}],
    ],
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

  it("captures the current production runtime-boundary debt", () => {
    const violations = discoverRuntimeBoundaryProductionScripts().flatMap((fileName) =>
      scanRuntimeBoundarySource(fileName, readFileSync(fileName, "utf8")),
    );

    expect(violations).toMatchInlineSnapshot(`
      [
        {
          "file": "scripts/common/cli.ts",
          "line": 61,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/common/cli.ts",
          "line": 67,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/common/index.ts",
          "line": 11,
          "rule": "legacy-process-import",
        },
        {
          "file": "scripts/common/index.ts",
          "line": 89,
          "rule": "ambient-environment",
        },
        {
          "file": "scripts/common/index.ts",
          "line": 94,
          "rule": "ambient-environment",
        },
        {
          "file": "scripts/common/index.ts",
          "line": 100,
          "rule": "ambient-environment",
        },
        {
          "file": "scripts/common/index.ts",
          "line": 105,
          "rule": "ambient-environment",
        },
        {
          "file": "scripts/common/index.ts",
          "line": 147,
          "rule": "ambient-timer",
        },
        {
          "file": "scripts/common/logger.ts",
          "line": 161,
          "rule": "ambient-environment",
        },
        {
          "file": "scripts/common/logger.ts",
          "line": 163,
          "rule": "ambient-timer",
        },
        {
          "file": "scripts/container-runtime/adapters.ts",
          "line": 6,
          "rule": "legacy-process-import",
        },
        {
          "file": "scripts/container-runtime/aspire.ts",
          "line": 8,
          "rule": "legacy-cli-import",
        },
        {
          "file": "scripts/container-runtime/aspire.ts",
          "line": 10,
          "rule": "legacy-process-import",
        },
        {
          "file": "scripts/container-runtime/aspire.ts",
          "line": 43,
          "rule": "ambient-environment",
        },
        {
          "file": "scripts/container-runtime/aspire.ts",
          "line": 93,
          "rule": "ambient-environment",
        },
        {
          "file": "scripts/container-runtime/aspire.ts",
          "line": 107,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/container-runtime/aspire.ts",
          "line": 107,
          "rule": "manual-entrypoint",
        },
        {
          "file": "scripts/container-runtime/aspire.ts",
          "line": 111,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/container-runtime/compose.ts",
          "line": 8,
          "rule": "legacy-cli-import",
        },
        {
          "file": "scripts/container-runtime/compose.ts",
          "line": 10,
          "rule": "legacy-process-import",
        },
        {
          "file": "scripts/container-runtime/compose.ts",
          "line": 91,
          "rule": "ambient-environment",
        },
        {
          "file": "scripts/container-runtime/compose.ts",
          "line": 107,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/container-runtime/compose.ts",
          "line": 107,
          "rule": "manual-entrypoint",
        },
        {
          "file": "scripts/container-runtime/compose.ts",
          "line": 111,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/container-runtime/image.ts",
          "line": 8,
          "rule": "legacy-cli-import",
        },
        {
          "file": "scripts/container-runtime/image.ts",
          "line": 10,
          "rule": "legacy-process-import",
        },
        {
          "file": "scripts/container-runtime/image.ts",
          "line": 156,
          "rule": "ambient-environment",
        },
        {
          "file": "scripts/container-runtime/image.ts",
          "line": 191,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/container-runtime/image.ts",
          "line": 191,
          "rule": "manual-entrypoint",
        },
        {
          "file": "scripts/container-runtime/image.ts",
          "line": 195,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/container-runtime/preflight.ts",
          "line": 8,
          "rule": "legacy-process-import",
        },
        {
          "file": "scripts/container-runtime/preflight.ts",
          "line": 58,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/container-runtime/selfhost.ts",
          "line": 7,
          "rule": "ambient-filesystem",
        },
        {
          "file": "scripts/container-runtime/selfhost.ts",
          "line": 9,
          "rule": "ambient-timer",
        },
        {
          "file": "scripts/container-runtime/selfhost.ts",
          "line": 11,
          "rule": "legacy-cli-import",
        },
        {
          "file": "scripts/container-runtime/selfhost.ts",
          "line": 13,
          "rule": "legacy-process-import",
        },
        {
          "file": "scripts/container-runtime/selfhost.ts",
          "line": 177,
          "rule": "ambient-http",
        },
        {
          "file": "scripts/container-runtime/selfhost.ts",
          "line": 277,
          "rule": "ambient-environment",
        },
        {
          "file": "scripts/container-runtime/selfhost.ts",
          "line": 278,
          "rule": "ambient-environment",
        },
        {
          "file": "scripts/container-runtime/selfhost.ts",
          "line": 302,
          "rule": "ambient-environment",
        },
        {
          "file": "scripts/container-runtime/selfhost.ts",
          "line": 338,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/container-runtime/selfhost.ts",
          "line": 338,
          "rule": "manual-entrypoint",
        },
        {
          "file": "scripts/container-runtime/selfhost.ts",
          "line": 400,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/container-runtime/traefik.ts",
          "line": 6,
          "rule": "ambient-filesystem",
        },
        {
          "file": "scripts/container-runtime/types.ts",
          "line": 43,
          "rule": "direct-exit",
        },
        {
          "file": "scripts/docs-assemble.normalize.ts",
          "line": 25,
          "rule": "ambient-filesystem",
        },
        {
          "file": "scripts/docs-assemble.ts",
          "line": 20,
          "rule": "ambient-filesystem",
        },
        {
          "file": "scripts/docs-assemble.ts",
          "line": 23,
          "rule": "legacy-cli-import",
        },
        {
          "file": "scripts/docs-assemble.ts",
          "line": 25,
          "rule": "legacy-process-import",
        },
        {
          "file": "scripts/docs-assemble.ts",
          "line": 470,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/docs-assemble.ts",
          "line": 494,
          "rule": "explicit-concurrency",
        },
        {
          "file": "scripts/docs-assemble.ts",
          "line": 535,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/docs-assemble.ts",
          "line": 536,
          "rule": "manual-entrypoint",
        },
        {
          "file": "scripts/docs-assemble.ts",
          "line": 539,
          "rule": "direct-exit",
        },
        {
          "file": "scripts/docs-assemble.ts",
          "line": 543,
          "rule": "direct-exit",
        },
        {
          "file": "scripts/doctor.diagnostics.ts",
          "line": 13,
          "rule": "legacy-process-import",
        },
        {
          "file": "scripts/doctor.svelte.ts",
          "line": 389,
          "rule": "explicit-concurrency",
        },
        {
          "file": "scripts/doctor.ts",
          "line": 35,
          "rule": "legacy-process-import",
        },
        {
          "file": "scripts/doctor.ts",
          "line": 161,
          "rule": "ambient-http",
        },
        {
          "file": "scripts/doctor.ts",
          "line": 278,
          "rule": "ambient-timer",
        },
        {
          "file": "scripts/doctor.ts",
          "line": 279,
          "rule": "ambient-timer",
        },
        {
          "file": "scripts/doctor.ts",
          "line": 289,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/doctor.ts",
          "line": 290,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/doctor.ts",
          "line": 291,
          "rule": "ambient-environment",
        },
        {
          "file": "scripts/doctor.ts",
          "line": 330,
          "rule": "explicit-concurrency",
        },
        {
          "file": "scripts/doctor.ts",
          "line": 365,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/doctor.ts",
          "line": 406,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/doctor.ts",
          "line": 407,
          "rule": "manual-entrypoint",
        },
        {
          "file": "scripts/doctor.ts",
          "line": 410,
          "rule": "direct-exit",
        },
        {
          "file": "scripts/doctor.ts",
          "line": 414,
          "rule": "direct-exit",
        },
        {
          "file": "scripts/doctor.workspace.ts",
          "line": 17,
          "rule": "ambient-filesystem",
        },
        {
          "file": "scripts/doctor.workspace.ts",
          "line": 18,
          "rule": "ambient-filesystem",
        },
        {
          "file": "scripts/doctor.workspace.ts",
          "line": 21,
          "rule": "legacy-process-import",
        },
        {
          "file": "scripts/doctor.workspace.ts",
          "line": 305,
          "rule": "explicit-concurrency",
        },
        {
          "file": "scripts/doctor.workspace.ts",
          "line": 1125,
          "rule": "explicit-concurrency",
        },
        {
          "file": "scripts/generate.artifacts.ts",
          "line": 6,
          "rule": "ambient-filesystem",
        },
        {
          "file": "scripts/generate.artifacts.ts",
          "line": 7,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/generate.artifacts.ts",
          "line": 10,
          "rule": "legacy-process-import",
        },
        {
          "file": "scripts/generate.artifacts.ts",
          "line": 256,
          "rule": "ambient-http",
        },
        {
          "file": "scripts/generate.artifacts.ts",
          "line": 345,
          "rule": "explicit-concurrency",
        },
        {
          "file": "scripts/generate.artifacts.ts",
          "line": 387,
          "rule": "explicit-concurrency",
        },
        {
          "file": "scripts/generate.artifacts.ts",
          "line": 397,
          "rule": "explicit-concurrency",
        },
        {
          "file": "scripts/generate.artifacts.ts",
          "line": 412,
          "rule": "explicit-concurrency",
        },
        {
          "file": "scripts/generate.artifacts.ts",
          "line": 634,
          "rule": "ambient-timer",
        },
        {
          "file": "scripts/generate.artifacts.ts",
          "line": 772,
          "rule": "ambient-timer",
        },
        {
          "file": "scripts/generate.artifacts.ts",
          "line": 932,
          "rule": "ambient-timer",
        },
        {
          "file": "scripts/generate.artifacts.ts",
          "line": 1191,
          "rule": "ambient-timer",
        },
        {
          "file": "scripts/generate.artifacts.ts",
          "line": 1532,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/generate.artifacts.ts",
          "line": 1550,
          "rule": "explicit-concurrency",
        },
        {
          "file": "scripts/generate.artifacts.ts",
          "line": 1844,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/generate.artifacts.ts",
          "line": 1857,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/generate.artifacts.ts",
          "line": 1936,
          "rule": "explicit-concurrency",
        },
        {
          "file": "scripts/generate.env.ts",
          "line": 14,
          "rule": "ambient-filesystem",
        },
        {
          "file": "scripts/generate.env.ts",
          "line": 18,
          "rule": "legacy-cli-import",
        },
        {
          "file": "scripts/generate.env.ts",
          "line": 120,
          "rule": "ambient-environment",
        },
        {
          "file": "scripts/generate.env.ts",
          "line": 122,
          "rule": "ambient-environment",
        },
        {
          "file": "scripts/generate.env.ts",
          "line": 137,
          "rule": "ambient-environment",
        },
        {
          "file": "scripts/generate.env.ts",
          "line": 157,
          "rule": "ambient-http",
        },
        {
          "file": "scripts/generate.env.ts",
          "line": 445,
          "rule": "ambient-environment",
        },
        {
          "file": "scripts/generate.env.ts",
          "line": 447,
          "rule": "ambient-environment",
        },
        {
          "file": "scripts/generate.env.ts",
          "line": 448,
          "rule": "ambient-timer",
        },
        {
          "file": "scripts/generate.env.ts",
          "line": 464,
          "rule": "ambient-timer",
        },
        {
          "file": "scripts/generate.env.ts",
          "line": 465,
          "rule": "ambient-environment",
        },
        {
          "file": "scripts/generate.env.ts",
          "line": 519,
          "rule": "ambient-environment",
        },
        {
          "file": "scripts/generate.env.ts",
          "line": 539,
          "rule": "ambient-environment",
        },
        {
          "file": "scripts/generate.env.ts",
          "line": 540,
          "rule": "ambient-environment",
        },
        {
          "file": "scripts/generate.env.ts",
          "line": 627,
          "rule": "direct-exit",
        },
        {
          "file": "scripts/generate.env.ts",
          "line": 635,
          "rule": "direct-exit",
        },
        {
          "file": "scripts/generate.env.ts",
          "line": 638,
          "rule": "direct-exit",
        },
        {
          "file": "scripts/generate.gql.ts",
          "line": 12,
          "rule": "ambient-filesystem",
        },
        {
          "file": "scripts/generate.gql.ts",
          "line": 14,
          "rule": "legacy-cli-import",
        },
        {
          "file": "scripts/generate.gql.ts",
          "line": 42,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/generate.gql.ts",
          "line": 54,
          "rule": "ambient-timer",
        },
        {
          "file": "scripts/generate.gql.ts",
          "line": 79,
          "rule": "direct-exit",
        },
        {
          "file": "scripts/generate.gql.ts",
          "line": 87,
          "rule": "direct-exit",
        },
        {
          "file": "scripts/generate.gql.ts",
          "line": 90,
          "rule": "direct-exit",
        },
        {
          "file": "scripts/generate.i18n.ts",
          "line": 22,
          "rule": "ambient-filesystem",
        },
        {
          "file": "scripts/generate.i18n.ts",
          "line": 24,
          "rule": "legacy-cli-import",
        },
        {
          "file": "scripts/generate.i18n.ts",
          "line": 449,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/generate.i18n.ts",
          "line": 454,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/generate.i18n.ts",
          "line": 520,
          "rule": "direct-exit",
        },
        {
          "file": "scripts/generate.i18n.ts",
          "line": 528,
          "rule": "direct-exit",
        },
        {
          "file": "scripts/generate.i18n.ts",
          "line": 531,
          "rule": "direct-exit",
        },
        {
          "file": "scripts/generate.ts",
          "line": 12,
          "rule": "legacy-cli-import",
        },
        {
          "file": "scripts/generate.ts",
          "line": 75,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/generate.ts",
          "line": 188,
          "rule": "direct-exit",
        },
        {
          "file": "scripts/generate.ts",
          "line": 206,
          "rule": "direct-exit",
        },
        {
          "file": "scripts/generate.ts",
          "line": 209,
          "rule": "direct-exit",
        },
        {
          "file": "scripts/inspection/aggregate-worker.ts",
          "line": 77,
          "rule": "ambient-timer",
        },
        {
          "file": "scripts/inspection/aggregate-worker.ts",
          "line": 87,
          "rule": "ambient-timer",
        },
        {
          "file": "scripts/inspection/aggregate-worker.ts",
          "line": 243,
          "rule": "ambient-timer",
        },
        {
          "file": "scripts/inspection/aggregate-worker.ts",
          "line": 254,
          "rule": "explicit-concurrency",
        },
        {
          "file": "scripts/inspection/aggregate-worker.ts",
          "line": 309,
          "rule": "explicit-concurrency",
        },
        {
          "file": "scripts/inspection/aggregate-worker.ts",
          "line": 379,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/inspection/aggregate-worker.ts",
          "line": 380,
          "rule": "manual-entrypoint",
        },
        {
          "file": "scripts/inspection/aggregate-worker.ts",
          "line": 384,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/inspection/aggregate.ts",
          "line": 20,
          "rule": "legacy-process-import",
        },
        {
          "file": "scripts/inspection/aggregate.ts",
          "line": 387,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/inspection/dotnet.ts",
          "line": 13,
          "rule": "ambient-filesystem",
        },
        {
          "file": "scripts/inspection/dotnet.ts",
          "line": 16,
          "rule": "legacy-process-import",
        },
        {
          "file": "scripts/inspection/dotnet.ts",
          "line": 1136,
          "rule": "explicit-concurrency",
        },
        {
          "file": "scripts/inspection/frontend.ts",
          "line": 14,
          "rule": "ambient-filesystem",
        },
        {
          "file": "scripts/inspection/frontend.ts",
          "line": 558,
          "rule": "explicit-concurrency",
        },
        {
          "file": "scripts/inspection/frontend.ts",
          "line": 797,
          "rule": "explicit-concurrency",
        },
        {
          "file": "scripts/inspection/infrastructure.ts",
          "line": 16,
          "rule": "ambient-filesystem",
        },
        {
          "file": "scripts/inspection/infrastructure.ts",
          "line": 19,
          "rule": "legacy-process-import",
        },
        {
          "file": "scripts/inspection/infrastructure.ts",
          "line": 440,
          "rule": "explicit-concurrency",
        },
        {
          "file": "scripts/inspection/infrastructure.ts",
          "line": 466,
          "rule": "explicit-concurrency",
        },
        {
          "file": "scripts/inspection/infrastructure.ts",
          "line": 677,
          "rule": "explicit-concurrency",
        },
        {
          "file": "scripts/inspection/infrastructure.ts",
          "line": 725,
          "rule": "explicit-concurrency",
        },
        {
          "file": "scripts/inspection/packages.ts",
          "line": 11,
          "rule": "ambient-filesystem",
        },
        {
          "file": "scripts/inspection/packages.ts",
          "line": 425,
          "rule": "explicit-concurrency",
        },
        {
          "file": "scripts/inspection/probes.ts",
          "line": 6,
          "rule": "legacy-process-import",
        },
        {
          "file": "scripts/inspection/probes.ts",
          "line": 438,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/inspection/probes.ts",
          "line": 726,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/inspection/python.ts",
          "line": 11,
          "rule": "ambient-filesystem",
        },
        {
          "file": "scripts/inspection/python.ts",
          "line": 15,
          "rule": "legacy-process-import",
        },
        {
          "file": "scripts/inspection/python.ts",
          "line": 1112,
          "rule": "explicit-concurrency",
        },
        {
          "file": "scripts/inspection/python.ts",
          "line": 1155,
          "rule": "explicit-concurrency",
        },
        {
          "file": "scripts/inspection/python.ts",
          "line": 1232,
          "rule": "explicit-concurrency",
        },
        {
          "file": "scripts/inspection/python.ts",
          "line": 1281,
          "rule": "explicit-concurrency",
        },
        {
          "file": "scripts/inspection/repository.ts",
          "line": 23,
          "rule": "legacy-process-import",
        },
        {
          "file": "scripts/inspection/workspace.ts",
          "line": 15,
          "rule": "ambient-filesystem",
        },
        {
          "file": "scripts/inspection/workspace.ts",
          "line": 16,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/inspection/workspace.ts",
          "line": 18,
          "rule": "legacy-process-import",
        },
        {
          "file": "scripts/inspection/workspace.ts",
          "line": 321,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/inspection/workspace.worker.ts",
          "line": 24,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/inspection/workspace.worker.ts",
          "line": 25,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/inspection/workspace.worker.ts",
          "line": 29,
          "rule": "ambient-environment",
        },
        {
          "file": "scripts/inspection/workspace.worker.ts",
          "line": 30,
          "rule": "ambient-environment",
        },
        {
          "file": "scripts/setup.dotnet.ts",
          "line": 25,
          "rule": "legacy-process-import",
        },
        {
          "file": "scripts/setup.dotnet.ts",
          "line": 332,
          "rule": "explicit-concurrency",
        },
        {
          "file": "scripts/setup.dotnet.ts",
          "line": 983,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/setup.infrastructure.ts",
          "line": 20,
          "rule": "ambient-filesystem",
        },
        {
          "file": "scripts/setup.infrastructure.ts",
          "line": 23,
          "rule": "legacy-process-import",
        },
        {
          "file": "scripts/setup.infrastructure.ts",
          "line": 704,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/setup.infrastructure.ts",
          "line": 705,
          "rule": "ambient-environment",
        },
        {
          "file": "scripts/setup.python.ts",
          "line": 24,
          "rule": "ambient-filesystem",
        },
        {
          "file": "scripts/setup.python.ts",
          "line": 26,
          "rule": "legacy-process-import",
        },
        {
          "file": "scripts/setup.python.ts",
          "line": 27,
          "rule": "legacy-process-import",
        },
        {
          "file": "scripts/setup.python.ts",
          "line": 240,
          "rule": "explicit-concurrency",
        },
        {
          "file": "scripts/setup.python.ts",
          "line": 245,
          "rule": "explicit-concurrency",
        },
        {
          "file": "scripts/setup.python.ts",
          "line": 691,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/setup.react.ts",
          "line": 27,
          "rule": "ambient-filesystem",
        },
        {
          "file": "scripts/setup.react.ts",
          "line": 30,
          "rule": "legacy-process-import",
        },
        {
          "file": "scripts/setup.react.ts",
          "line": 220,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/setup.react.ts",
          "line": 237,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/setup.svelte.ts",
          "line": 25,
          "rule": "legacy-process-import",
        },
        {
          "file": "scripts/setup.ts",
          "line": 21,
          "rule": "legacy-cli-import",
        },
        {
          "file": "scripts/setup.ts",
          "line": 22,
          "rule": "legacy-process-import",
        },
        {
          "file": "scripts/setup.ts",
          "line": 353,
          "rule": "ambient-timer",
        },
        {
          "file": "scripts/setup.ts",
          "line": 383,
          "rule": "ambient-environment",
        },
        {
          "file": "scripts/setup.ts",
          "line": 384,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/setup.ts",
          "line": 516,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/setup.ts",
          "line": 543,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/setup.ts",
          "line": 544,
          "rule": "manual-entrypoint",
        },
        {
          "file": "scripts/setup.ts",
          "line": 547,
          "rule": "direct-exit",
        },
        {
          "file": "scripts/setup.ts",
          "line": 551,
          "rule": "direct-exit",
        },
        {
          "file": "scripts/setup.types.ts",
          "line": 8,
          "rule": "legacy-process-import",
        },
        {
          "file": "scripts/setup.workspace.ts",
          "line": 6,
          "rule": "ambient-filesystem",
        },
        {
          "file": "scripts/setup.workspace.ts",
          "line": 9,
          "rule": "legacy-process-import",
        },
        {
          "file": "scripts/setup.workspace.ts",
          "line": 222,
          "rule": "explicit-concurrency",
        },
        {
          "file": "scripts/setup.workspace.ts",
          "line": 493,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/setup.workspace.ts",
          "line": 552,
          "rule": "explicit-concurrency",
        },
        {
          "file": "scripts/status.ts",
          "line": 33,
          "rule": "ambient-filesystem",
        },
        {
          "file": "scripts/status.ts",
          "line": 37,
          "rule": "legacy-cli-import",
        },
        {
          "file": "scripts/status.ts",
          "line": 40,
          "rule": "legacy-process-import",
        },
        {
          "file": "scripts/status.ts",
          "line": 248,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/status.ts",
          "line": 412,
          "rule": "explicit-concurrency",
        },
        {
          "file": "scripts/status.ts",
          "line": 478,
          "rule": "explicit-concurrency",
        },
        {
          "file": "scripts/status.ts",
          "line": 582,
          "rule": "explicit-concurrency",
        },
        {
          "file": "scripts/status.ts",
          "line": 805,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/status.ts",
          "line": 850,
          "rule": "ambient-environment",
        },
        {
          "file": "scripts/status.ts",
          "line": 851,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/status.ts",
          "line": 852,
          "rule": "ambient-timer",
        },
        {
          "file": "scripts/status.ts",
          "line": 857,
          "rule": "explicit-concurrency",
        },
        {
          "file": "scripts/status.ts",
          "line": 888,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/status.ts",
          "line": 889,
          "rule": "manual-entrypoint",
        },
        {
          "file": "scripts/status.ts",
          "line": 892,
          "rule": "direct-exit",
        },
        {
          "file": "scripts/status.ts",
          "line": 896,
          "rule": "direct-exit",
        },
        {
          "file": "scripts/test-e2e.ts",
          "line": 11,
          "rule": "ambient-filesystem",
        },
        {
          "file": "scripts/test-e2e.ts",
          "line": 14,
          "rule": "legacy-cli-import",
        },
        {
          "file": "scripts/test-e2e.ts",
          "line": 16,
          "rule": "legacy-process-import",
        },
        {
          "file": "scripts/test-e2e.ts",
          "line": 585,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/test-e2e.ts",
          "line": 586,
          "rule": "ambient-environment",
        },
        {
          "file": "scripts/test-e2e.ts",
          "line": 609,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/test-e2e.ts",
          "line": 658,
          "rule": "ambient-os-state",
        },
        {
          "file": "scripts/test-e2e.ts",
          "line": 660,
          "rule": "direct-exit",
        },
        {
          "file": "scripts/test-e2e.ts",
          "line": 663,
          "rule": "direct-exit",
        },
        {
          "file": "scripts/update-exchange-rates.ts",
          "line": 23,
          "rule": "ambient-filesystem",
        },
        {
          "file": "scripts/update-exchange-rates.ts",
          "line": 26,
          "rule": "legacy-cli-import",
        },
        {
          "file": "scripts/update-exchange-rates.ts",
          "line": 186,
          "rule": "ambient-timer",
        },
        {
          "file": "scripts/update-exchange-rates.ts",
          "line": 221,
          "rule": "ambient-timer",
        },
        {
          "file": "scripts/update-exchange-rates.ts",
          "line": 300,
          "rule": "ambient-timer",
        },
        {
          "file": "scripts/update-exchange-rates.ts",
          "line": 308,
          "rule": "ambient-http",
        },
        {
          "file": "scripts/update-exchange-rates.ts",
          "line": 465,
          "rule": "direct-exit",
        },
        {
          "file": "scripts/update-exchange-rates.ts",
          "line": 475,
          "rule": "direct-exit",
        },
        {
          "file": "scripts/update-exchange-rates.ts",
          "line": 480,
          "rule": "direct-exit",
        },
      ]
    `);
  });
});
