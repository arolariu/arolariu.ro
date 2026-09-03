// @vitest-environment node
/**
 * @fileoverview AST policy tests for the declarative command runtime boundary.
 * @module scripts.common.runtime-boundary.test
 */

import {existsSync, readdirSync, readFileSync} from "node:fs";
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
 * Every production module the process may be started with directly.
 *
 * @remarks
 * Each entry must export a typed command singleton and hand direct-entry detection to the shared
 * `runIfMain()` on the command host. The four excluded format/lint entrypoints are deliberately
 * absent: RFC 0002 section 3.2 keeps them on Piscina outside the command runtime.
 */
const directEntrypoints: readonly string[] = [
  "scripts/container-runtime/aspire.ts",
  "scripts/container-runtime/compose.ts",
  "scripts/container-runtime/image.ts",
  "scripts/container-runtime/selfhost.ts",
  "scripts/docs-assemble.ts",
  "scripts/doctor.ts",
  "scripts/generate.artifacts.ts",
  "scripts/generate.env.ts",
  "scripts/generate.gql.ts",
  "scripts/generate.i18n.ts",
  "scripts/generate.ts",
  "scripts/inspection/aggregate-worker.ts",
  "scripts/inspection/workspace.worker.ts",
  "scripts/setup.ts",
  "scripts/status.ts",
  "scripts/test-e2e.ts",
  "scripts/update-exchange-rates.ts",
];

/** Modules deleted with the declarative migration; no production module may reference them again. */
const removedCompatibilityModules: readonly string[] = [
  "scripts/common/cli.ts",
  "scripts/common/process.ts",
];

/** Module specifiers that spawn an operating-system process outside the approved runner adapter. */
const processSpawningModules: ReadonlySet<string> = new Set(["node:child_process", "child_process"]);

/** Sole worker adapter allowed to reuse the Node process runner outside a command runtime scope. */
const workerShellAdapter = "scripts/workers/shell.ts";
const wholeModuleImportName = "*";

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
  "./common/runner.execa.ts",
]);

/** Imported names no Doctor production module may take, even from an otherwise approved module. */
const doctorForbiddenImportNames: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ["./common/runtime.ts", new Set(["FileSystem"])],
  ["./common/runner.ts", new Set(["ProcessRunner"])],
]);
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

function isConfigurationFile(file: string): boolean {
  return /\.config\.(?:cjs|js|mjs|ts)$/.test(file);
}

function discoverProductionScripts(directory: string = "scripts"): readonly string[] {
  const files: string[] = [];

  for (const entry of readdirSync(directory, {withFileTypes: true})) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...discoverProductionScripts(path));
      continue;
    }

    const normalizedPath = normalizeFilePath(path);
    const extension = normalizedPath.slice(normalizedPath.lastIndexOf("."));
    if (productionScriptExtensions.has(extension) && !isTestFile(normalizedPath) && !isConfigurationFile(normalizedPath)) {
      files.push(normalizedPath);
    }
  }

  return files.toSorted();
}

function discoverRuntimeBoundaryProductionScripts(): readonly string[] {
  return discoverProductionScripts().filter(
    (file) => file !== "scripts/common/runtime.testing.ts" && !runtimeBoundaryExclusions.has(file),
  );
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
      || startsWithPath(path, ["process", "pid"])
      || startsWithPath(path, ["process", "version"])
      || startsWithPath(path, ["process", "versions"]);
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

/** One statically resolvable module specifier and the names it binds. */
interface ModuleImport {
  /** The literal module specifier text. */
  readonly specifier: string;
  /** Imported names; `*` represents access to the complete module namespace. */
  readonly names: readonly string[];
}

/**
 * Collects every statically resolvable module specifier of one source file.
 *
 * @param sourceText - Source text to parse.
 * @returns Static imports, re-exports, and literal dynamic imports, in source order.
 */
function collectModuleImports(sourceText: string): readonly ModuleImport[] {
  const source = ts.createSourceFile("module.ts", sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const imports: ModuleImport[] = [];

  function namesOf(clause: ts.ImportClause | undefined): readonly string[] {
    if (clause === undefined) {
      return [];
    }

    const names = new Set<string>();
    if (clause.name !== undefined) {
      names.add(wholeModuleImportName);
    }

    const bindings = clause?.namedBindings;
    if (bindings === undefined) {
      return [...names];
    }

    if (ts.isNamespaceImport(bindings)) {
      names.add(wholeModuleImportName);
      return [...names];
    }

    for (const element of bindings.elements) {
      const importedName = (element.propertyName ?? element.name).text;
      names.add(importedName === "default" ? wholeModuleImportName : importedName);
    }

    return [...names];
  }

  function namesOfExport(node: ts.ExportDeclaration): readonly string[] {
    const clause = node.exportClause;
    if (clause === undefined || ts.isNamespaceExport(clause)) {
      return [wholeModuleImportName];
    }

    return clause.elements.map((element) => {
      const exportedName = (element.propertyName ?? element.name).text;
      return exportedName === "default" ? wholeModuleImportName : exportedName;
    });
  }

  function visit(node: ts.Node): void {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      imports.push({specifier: node.moduleSpecifier.text, names: namesOf(node.importClause)});
    }

    if (ts.isExportDeclaration(node) && node.moduleSpecifier !== undefined && ts.isStringLiteral(node.moduleSpecifier)) {
      imports.push({specifier: node.moduleSpecifier.text, names: namesOfExport(node)});
    }

    if (ts.isCallExpression(node) && isDynamicImport(node) && node.arguments.length === 1) {
      const specifier = node.arguments[0];
      if (specifier !== undefined && (ts.isStringLiteral(specifier) || ts.isNoSubstitutionTemplateLiteral(specifier))) {
        imports.push({specifier: specifier.text, names: [wholeModuleImportName]});
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(source);
  return imports;
}

/** Structural facts a direct entrypoint must satisfy to stay inside the declarative contract. */
interface CommandEntrypointShape {
  /** Whether the module exports a `MonorepoCommand`-typed singleton. */
  readonly exportsCommandSingleton: boolean;
  /** Whether the module hands direct-entry detection to `runIfMain(import.meta.url)`. */
  readonly usesSharedRunIfMain: boolean;
}

function isImportMetaUrlArgument(argument: ts.Expression): boolean {
  return (
    ts.isPropertyAccessExpression(argument)
    && argument.name.text === "url"
    && ts.isMetaProperty(argument.expression)
    && argument.expression.keywordToken === ts.SyntaxKind.ImportKeyword
    && argument.expression.name.text === "meta"
  );
}

/**
 * Describes how one production module exposes and starts its command.
 *
 * @param sourceText - Source text to parse.
 * @returns Whether the module exports a command singleton and uses shared direct-entry detection.
 */
function analyzeCommandEntrypoint(sourceText: string): CommandEntrypointShape {
  const source = ts.createSourceFile("entrypoint.ts", sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let exportsCommandSingleton = false;
  let usesSharedRunIfMain = false;

  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue;
    }

    const isExported = statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) === true;
    if (!isExported) {
      continue;
    }

    for (const declaration of statement.declarationList.declarations) {
      const {type} = declaration;
      if (type !== undefined && ts.isTypeReferenceNode(type) && ts.isIdentifier(type.typeName) && type.typeName.text === "MonorepoCommand") {
        exportsCommandSingleton = true;
      }
    }
  }

  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node)
      && ts.isPropertyAccessExpression(node.expression)
      && node.expression.name.text === "runIfMain"
      && node.arguments.length === 1
      && node.arguments[0] !== undefined
      && isImportMetaUrlArgument(node.arguments[0])
    ) {
      usesSharedRunIfMain = true;
    }

    ts.forEachChild(node, visit);
  }

  visit(source);
  return {exportsCommandSingleton, usesSharedRunIfMain};
}

/**
 * Finds every production module that starts itself through the shared command host.
 *
 * @returns Sorted module paths that call `runIfMain(import.meta.url)`.
 */
function discoverSharedEntrypointModules(): readonly string[] {
  return discoverProductionScripts().filter(
    (file) => analyzeCommandEntrypoint(readFileSync(file, "utf8")).usesSharedRunIfMain,
  );
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
  return collectModuleImports(sourceText).flatMap((moduleImport): readonly DoctorCapabilityViolation[] => {
    if (doctorForbiddenModules.has(moduleImport.specifier)) {
      return [{file, specifier: moduleImport.specifier}];
    }

    const forbiddenNames = doctorForbiddenImportNames.get(moduleImport.specifier);
    if (forbiddenNames === undefined) {
      return [];
    }

    return moduleImport.names
      .filter((name) => name === wholeModuleImportName || forbiddenNames.has(name))
      .map((name) => ({file, specifier: moduleImport.specifier, name}));
  });
}

/**
 * Scans the Doctor production surface for capabilities wider than read-only and opaque probes.
 *
 * @returns Every forbidden Doctor capability import.
 */
function scanDoctorCapabilities(): readonly DoctorCapabilityViolation[] {
  return discoverProductionScripts()
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
    const violations = discoverProductionScripts().flatMap((file) =>
      collectModuleImports(readFileSync(file, "utf8"))
        .filter(
          (moduleImport) =>
            processSpawningModules.has(moduleImport.specifier)
            || (moduleImport.specifier === "execa" && file !== execaAdapter),
        )
        .map((moduleImport) => ({file, specifier: moduleImport.specifier})),
    );

    expect(violations).toEqual([]);
    expect(collectModuleImports(readFileSync(execaAdapter, "utf8")).map((moduleImport) => moduleImport.specifier)).toContain("execa");
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
      scanRuntimeBoundaryRepository().filter(
        (violation) => violation.rule === "manual-entrypoint" || violation.rule === "direct-exit",
      ),
    ).toEqual([]);
  });

  it("starts every direct entrypoint through an exported command and shared runIfMain", () => {
    expect(discoverSharedEntrypointModules()).toEqual(directEntrypoints);

    const violations = directEntrypoints
      .map((file) => ({file, ...analyzeCommandEntrypoint(readFileSync(file, "utf8"))}))
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
      'import runner from "./common/runner.ts";',
      'export * from "./common/runner.ts";',
      'void import("./common/runtime.ts");',
    ].join("\n");

    expect(scanDoctorCapabilitySource("scripts/doctor.example.ts", source)).toEqual([
      {file: "scripts/doctor.example.ts", specifier: "./common/runtime.ts", name: "FileSystem"},
      {file: "scripts/doctor.example.ts", specifier: "./common/runtime.ts", name: "*"},
      {file: "scripts/doctor.example.ts", specifier: "./common/runner.ts", name: "*"},
      {file: "scripts/doctor.example.ts", specifier: "./common/runner.ts", name: "*"},
      {file: "scripts/doctor.example.ts", specifier: "./common/runtime.ts", name: "*"},
    ]);
  });

  it("keeps the worker shell on the generic process runner", () => {
    const specifiers = collectModuleImports(readFileSync(workerShellAdapter, "utf8"));

    expect(specifiers).toContainEqual({specifier: "../common/runtime.node.ts", names: ["nodeProcessRunner"]});
    expect(
      specifiers.filter(
        (moduleImport) => processSpawningModules.has(moduleImport.specifier) || moduleImport.specifier === "execa",
      ),
    ).toEqual([]);
  });
});
