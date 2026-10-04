// @vitest-environment node
/**
 * @fileoverview AST policy tests for the declarative command runtime boundary.
 * @module scripts.common.runtime-boundary.test
 */

import {existsSync, readdirSync, readFileSync} from "node:fs";
import {join, posix} from "node:path";
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
const directOutputAdapters = new Set([
  "scripts/common/logger.ts",
  "scripts/platform/Output.ts",
]);

/**
 * Effect platform layer (RFC 0002 section 21). Like `runtime.node.ts`, it is the sanctioned owner
 * of ambient `process.*`, timer, and `node:*` access, and the only home of `@effect/platform-node`
 * besides the CLI entrypoint.
 */
const platformLayerDirectory = "scripts/platform/";

/**
 * The single effect/cli entrypoint. It starts the program with `NodeRuntime.runMain`, so it may
 * import `@effect/platform-node` and read `process.argv` inside its `import.meta.main` block, but
 * no other ambient state.
 */
const cliEntrypoint = "scripts/cli.ts";

/** Directory of the effect/cli command families (`scripts/commands/<family>/cli.ts`). */
const commandFamiliesDirectory = "scripts/commands/";

/**
 * Production modules outside {@link commandFamiliesDirectory} that may import `effect/cli`: the
 * root entrypoint, the exit-code mapping, which classifies `CliError` usage failures as exit `2`,
 * and the `Prompts` platform service, which runs effect/cli `Prompt`s.
 */
const effectCliConsumers: readonly string[] = [cliEntrypoint, "scripts/platform/exit.ts", "scripts/platform/Prompts.ts"];

/** Modules allowed to start an Effect runtime (Effect `run*`, `ManagedRuntime.make`, and `NodeRuntime.runMain`). */
const sanctionedEffectRunners: readonly string[] = [
  cliEntrypoint,
  "scripts/platform/Output.ts",
  "scripts/platform/testing.ts",
  "scripts/platform/worker.ts",
];

/** Effect runtime entry points; each one starts executing a program outside the caller's fiber. */
const effectRunnerNames: ReadonlySet<string> = new Set([
  "runCallback",
  "runCallbackWith",
  "runFork",
  "runForkWith",
  "runPromise",
  "runPromiseExit",
  "runPromiseExitWith",
  "runPromiseWith",
  "runSync",
  "runSyncExit",
  "runSyncExitWith",
  "runSyncWith",
]);

/** Legacy modules kept only for the frozen format/lint closure, plus the barrel re-exporting them. */
const legacyKernelModule = /^scripts\/common\/(?:runtime\.node|runner[\w.-]*|logger|index)\.ts$/;

/**
 * Command families migrated to native Effect. Their modules and tests may not import a value from
 * the legacy modules ({@link legacyKernelModule}: `runtime.node`, `runner`, `logger`, and their
 * siblings and barrel); a clause-level `import type` stays tolerated. `scripts/inspection` (the
 * shared read-only inspection layer of Doctor and Status) and `scripts/container-runtime` (the
 * container programs behind `dev`, `containers`, and Setup/Doctor engine selection) are not CLI
 * families, so they have no `cli.ts`. The test-support module
 * `scripts/container-runtime/selfhost.testing.ts` lives beside the programs it drives and imports
 * `scripts/platform/testing.ts`; that is tolerated because the rule targets only the legacy kernel.
 */
const effectNativeFamilies: readonly string[] = [
  "scripts/commands/containers",
  "scripts/commands/dev",
  "scripts/commands/docs",
  "scripts/commands/doctor",
  "scripts/commands/e2e",
  "scripts/commands/generate",
  "scripts/commands/rates",
  "scripts/commands/setup",
  "scripts/commands/status",
  "scripts/container-runtime",
  "scripts/inspection",
];

/**
 * The inspection worker entrypoints. Their parents spawn them as native Node child processes; each
 * one starts only through `runWorker(...)` (`scripts/platform/worker.ts`) inside its
 * `import.meta.main` block, so the platform layer — not the worker — reads `process.argv` and maps
 * the exit code.
 */
const workerEntrypoints: readonly string[] = [
  "scripts/inspection/aggregate-worker.ts",
  "scripts/inspection/workspace.worker.ts",
];

/**
 * Every production module the process may be started with directly: the effect/cli entrypoint, the
 * two inspection workers, and the excluded Piscina-hosted format/lint orchestrators (RFC 0002
 * section 3.2).
 */
const directEntrypoints: readonly string[] = [
  cliEntrypoint,
  "scripts/format.ts",
  ...workerEntrypoints,
  "scripts/lint.ts",
].toSorted();

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
 * Families held to the read-only capability profile: the repository inspection layer and the
 * Doctor and Status commands built on it. Every production module under them, CLI adapters
 * included, is scanned.
 */
const readOnlyFamilies: readonly string[] = ["scripts/commands/doctor", "scripts/commands/status", "scripts/inspection"];

/**
 * Module specifiers (rebased onto `scripts/`) no read-only family module may import, because each
 * one would hand it a mutating, process-spawning, prompting, or otherwise non-opaque capability.
 */
const readOnlyForbiddenModules: ReadonlySet<string> = new Set([
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
  "effect/FileSystem",
  "./platform/Prompts.ts",
]);

/**
 * Imported names no read-only family module may take, even from an otherwise approved module (a
 * whole-module import of one of these modules counts too): the mutating Effect `FileSystem`, the
 * unrestricted Effect `HttpClient`, the atomic writer, and the legacy mutating filesystem and
 * process-runner ports.
 */
const readOnlyForbiddenImportNames: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ["./common/runner.ts", new Set(["ProcessRunner"])],
  ["./platform/Files.ts", new Set(["writeTextAtomic"])],
  ["effect", new Set(["FileSystem"])],
  ["effect/http", new Set(["HttpClient"])],
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

/**
 * Process fixtures of the platform tests. They are started as real child processes, so one may be a
 * direct entrypoint that runs `NodeRuntime.runMain` (`cancellable-cli.ts`); every production scan,
 * including the direct-entrypoint and sanctioned-runner rules, skips them.
 */
const platformFixturesDirectory = "scripts/platform/__fixtures__/";

function isTestFixture(file: string): boolean {
  return file.startsWith(platformFixturesDirectory);
}

/** Matches a call-site wrapper or comment marker a cohort left behind for its own removal. */
const temporaryCohortMarker = /cohort \d+ temporary/iu;

/** Matches the Effect-to-Promise wrapper deleted in cohort 6. */
const removedRunEffectWrapper = /\brunEffectOrThrow\b/u;

/** This policy file, which spells the removed wrapper name in {@link removedRunEffectWrapper}. */
const runtimeBoundaryPolicyFile = "scripts/common/runtime-boundary.test.ts";

/**
 * Lists every source or documentation file under `scripts/`, tests included.
 *
 * @returns Sorted repository-relative paths of `.ts`, `.js`, `.mjs`, `.cjs`, and `.md` files outside
 * `node_modules` and `__generated__`.
 */
function discoverScriptsTextFiles(): readonly string[] {
  return readdirSync("scripts", {recursive: true, withFileTypes: true})
    .filter((entry) => entry.isFile() && /\.(?:[cm]?js|ts|md)$/u.test(entry.name))
    .map((entry) => normalizeFilePath(join(entry.parentPath, entry.name)))
    .filter((file) => !/\/(?:node_modules|__generated__)\//u.test(file))
    .toSorted();
}

/** Whether a module may touch ambient process, timer, filesystem, network, and OS state. */
function ownsAmbientRuntime(file: string): boolean {
  return file === runtimeNodeAdapter || file.startsWith(platformLayerDirectory);
}

/**
 * Whether an ambient OS-state access is a direct entrypoint reading its invocation arguments.
 *
 * @param file - Repository-relative module path.
 * @param path - Resolved access path.
 * @param inEntryBlock - Whether the access sits inside an `if (import.meta.main)` block.
 * @returns `true` only for `process.argv` inside the `import.meta.main` block of {@link cliEntrypoint}.
 */
function isCliEntrypointArgv(file: string, path: AccessPath, inEntryBlock: boolean): boolean {
  return inEntryBlock && file === cliEntrypoint && startsWithPath(path, ["process", "argv"]);
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
    if (
      productionScriptExtensions.has(extension)
      && !isTestFile(normalizedPath)
      && !isConfigurationFile(normalizedPath)
      && !isTestFixture(normalizedPath)
    ) {
      files.push(normalizedPath);
    }
  }

  return files.toSorted();
}

function discoverRuntimeBoundaryProductionScripts(): readonly string[] {
  return discoverProductionScripts().filter((file) => !runtimeBoundaryExclusions.has(file));
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
  /** Nesting depth of `if (import.meta.main)` blocks around the visited node. */
  let entryBlockDepth = 0;

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

    if (ownsAmbientRuntime(normalizedFile)) {
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

    if (ts.isIfStatement(node) && isImportMetaMain(node.expression)) {
      entryBlockDepth++;
      visit(node.thenStatement, scopes);
      entryBlockDepth--;
      if (node.elseStatement !== undefined) {
        visit(node.elseStatement, scopes);
      }
      return;
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

        if (path.length === 1 && path[0] === "fetch" && !ownsAmbientRuntime(normalizedFile)) {
          add(node, "ambient-http");
        }

        if (isAmbientTimerCallPath(path) && !ownsAmbientRuntime(normalizedFile)) {
          add(node, "ambient-timer");
        }

        if (
          isAmbientOsStateCallPath(path)
          && !ownsAmbientRuntime(normalizedFile)
          && !isCliEntrypointArgv(normalizedFile, path, entryBlockDepth > 0)
        ) {
          add(node, "ambient-os-state");
        }

        if (isAmbientProcessControlPath(path) && !ownsAmbientRuntime(normalizedFile)) {
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
      if (path !== null && !ownsAmbientRuntime(normalizedFile)) {
        if (isAmbientEnvironmentPath(path)) {
          add(node, "ambient-environment");
        }

        if (isAmbientOsStatePath(path) && !isCliEntrypointArgv(normalizedFile, path, entryBlockDepth > 0)) {
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
      if (path !== null && path.length === 1 && path[0] === "Date" && !ownsAmbientRuntime(normalizedFile)) {
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

/** Structural facts a direct entrypoint must satisfy. */
interface CommandEntrypointShape {
  /** Whether every `import.meta.main` block of the module consists of exactly one `runWorker(...)` call. */
  readonly startsThroughRunWorker: boolean;
  /** Whether the module guards its process start with `import.meta.main`. */
  readonly usesImportMetaMain: boolean;
}

function isImportMetaMain(node: ts.Node): boolean {
  return (
    ts.isPropertyAccessExpression(node)
    && node.name.text === "main"
    && ts.isMetaProperty(node.expression)
    && node.expression.keywordToken === ts.SyntaxKind.ImportKeyword
    && node.expression.name.text === "meta"
  );
}

/**
 * Checks whether a statement is exactly one `runWorker(...)` call, optionally wrapped in a block.
 *
 * @param statement - The `import.meta.main` branch.
 * @returns Whether the branch only calls `runWorker`.
 */
function isRunWorkerStart(statement: ts.Statement): boolean {
  const statements = ts.isBlock(statement) ? statement.statements : [statement];
  const [only] = statements;
  return (
    statements.length === 1
    && only !== undefined
    && ts.isExpressionStatement(only)
    && ts.isCallExpression(only.expression)
    && ts.isIdentifier(only.expression.expression)
    && only.expression.expression.text === "runWorker"
  );
}

/**
 * Describes how one production module starts itself.
 *
 * @param sourceText - Source text to parse.
 * @returns Whether the module starts itself under `import.meta.main`, and whether every such block
 * only calls `runWorker`.
 */
function analyzeCommandEntrypoint(sourceText: string): CommandEntrypointShape {
  const source = ts.createSourceFile("entrypoint.ts", sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let usesImportMetaMain = false;
  let entryBlocks = 0;
  let runWorkerBlocks = 0;

  function visit(node: ts.Node): void {
    if (isImportMetaMain(node)) {
      usesImportMetaMain = true;
    }
    if (ts.isIfStatement(node) && isImportMetaMain(node.expression)) {
      entryBlocks += 1;
      if (node.elseStatement === undefined && isRunWorkerStart(node.thenStatement)) {
        runWorkerBlocks += 1;
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(source);
  return {startsThroughRunWorker: entryBlocks > 0 && entryBlocks === runWorkerBlocks, usesImportMetaMain};
}

/**
 * Finds every production module that can start itself as the process entrypoint.
 *
 * @returns Sorted module paths that reference `import.meta.main`.
 */
function discoverDirectEntrypointModules(): readonly string[] {
  return discoverProductionScripts().filter(
    (file) => analyzeCommandEntrypoint(readFileSync(file, "utf8")).usesImportMetaMain,
  );
}

/** One read-only family import that would widen the family beyond read-only, opaque capabilities. */
interface ReadOnlyCapabilityViolation {
  /** Read-only family module holding the import. */
  readonly file: string;
  /** Module specifier that carries the forbidden capability. */
  readonly specifier: string;
  /** Imported name when the module itself is approved but the name is not. */
  readonly name?: string;
}

/**
 * Normalizes a relative import specifier to the `./`-prefixed form it would have from `scripts/`,
 * so the read-only capability guard matches the same modules wherever a family file is nested.
 *
 * @param file - Repository-relative posix path of the importing file.
 * @param specifier - Import specifier as written in the source.
 * @returns The specifier rebased onto `scripts/`, or the original bare specifier.
 */
function normalizeScriptsSpecifier(file: string, specifier: string): string {
  if (!specifier.startsWith(".")) {
    return specifier;
  }

  return `./${posix.relative("scripts", posix.join(posix.dirname(file), specifier))}`;
}

/**
 * Lists the imports of one read-only family module that widen it beyond read-only capabilities.
 *
 * @param file - Repository-relative posix path of the module.
 * @param sourceText - Source text to parse.
 * @returns Every forbidden module import, or forbidden name taken from an approved module.
 */
function scanReadOnlyCapabilitySource(file: string, sourceText: string): readonly ReadOnlyCapabilityViolation[] {
  return collectModuleImports(sourceText).flatMap((moduleImport): readonly ReadOnlyCapabilityViolation[] => {
    const specifier = normalizeScriptsSpecifier(file, moduleImport.specifier);
    if (readOnlyForbiddenModules.has(specifier)) {
      return [{file, specifier}];
    }

    const forbiddenNames = readOnlyForbiddenImportNames.get(specifier);
    if (forbiddenNames === undefined) {
      return [];
    }

    return moduleImport.names
      .filter((name) => name === wholeModuleImportName || forbiddenNames.has(name))
      .map((name) => ({file, specifier, name}));
  });
}

/**
 * Lists every production module of the {@link readOnlyFamilies}.
 *
 * @returns Sorted repository-relative production module paths.
 */
function discoverReadOnlyFamilyModules(): readonly string[] {
  return discoverProductionScripts().filter((file) => readOnlyFamilies.some((family) => file.startsWith(`${family}/`)));
}

/** One reference to an Effect runtime entry point. */
interface EffectRunnerUse {
  /** Module holding the reference. */
  readonly file: string;
  /** One-based source line of the reference. */
  readonly line: number;
  /** Qualified entry point, for example `Effect.runPromise` or `ManagedRuntime.make`. */
  readonly api: string;
}

/**
 * Finds every reference to an Effect runtime entry point, through named, aliased, or namespace
 * imports of `effect`, `effect/Effect`, `effect/ManagedRuntime`, `@effect/platform-node`, and
 * `@effect/platform-node/NodeRuntime`.
 *
 * @param file - Repository-relative module path reported with each use.
 * @param sourceText - Source text to parse.
 * @returns Every runner reference, in source order.
 */
function scanEffectRunnerSource(file: string, sourceText: string): readonly EffectRunnerUse[] {
  const source = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const effectRoots = new Set<string>();
  const effectModules = new Set<string>();
  const managedRuntimeModules = new Set<string>();
  const platformNodeRoots = new Set<string>();
  const nodeRuntimeModules = new Set<string>();
  const uses: EffectRunnerUse[] = [];

  function add(node: ts.Node, api: string): void {
    uses.push({file, line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, api});
  }

  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }

    const specifier = statement.moduleSpecifier.text;
    const clause = statement.importClause;
    const bindings = clause?.namedBindings;
    const wholeModuleNames = [
      ...(clause?.name === undefined ? [] : [clause.name.text]),
      ...(bindings !== undefined && ts.isNamespaceImport(bindings) ? [bindings.name.text] : []),
    ];

    if (specifier === "effect") {
      wholeModuleNames.forEach((name) => effectRoots.add(name));
    }

    if (specifier === "effect/Effect") {
      wholeModuleNames.forEach((name) => effectModules.add(name));
    }

    if (specifier === "effect/ManagedRuntime") {
      wholeModuleNames.forEach((name) => managedRuntimeModules.add(name));
    }

    if (specifier === "@effect/platform-node") {
      wholeModuleNames.forEach((name) => platformNodeRoots.add(name));
    }

    if (specifier === "@effect/platform-node/NodeRuntime") {
      wholeModuleNames.forEach((name) => nodeRuntimeModules.add(name));
    }

    if (bindings === undefined || !ts.isNamedImports(bindings)) {
      continue;
    }

    for (const element of bindings.elements) {
      const importedName = (element.propertyName ?? element.name).text;
      if (specifier === "effect" && importedName === "Effect") {
        effectModules.add(element.name.text);
      } else if (specifier === "effect" && importedName === "ManagedRuntime") {
        managedRuntimeModules.add(element.name.text);
      } else if (specifier === "effect/Effect" && effectRunnerNames.has(importedName)) {
        add(element, `Effect.${importedName}`);
      } else if (specifier === "effect/ManagedRuntime" && importedName === "make") {
        add(element, "ManagedRuntime.make");
      } else if (specifier === "@effect/platform-node" && importedName === "NodeRuntime") {
        nodeRuntimeModules.add(element.name.text);
      } else if (specifier === "@effect/platform-node/NodeRuntime" && importedName === "runMain") {
        add(element, "NodeRuntime.runMain");
      }
    }
  }

  function qualify(path: AccessPath): readonly string[] {
    const [head, ...members] = path;
    if (head === undefined) {
      return [];
    }

    if (effectRoots.has(head) || platformNodeRoots.has(head)) {
      return members;
    }

    if (nodeRuntimeModules.has(head)) {
      return ["NodeRuntime", ...members];
    }

    if (effectModules.has(head)) {
      return ["Effect", ...members];
    }

    return managedRuntimeModules.has(head) ? ["ManagedRuntime", ...members] : [];
  }

  function apiOf(path: AccessPath): string | undefined {
    const qualified = qualify(path);
    const [module, member] = qualified;
    if (qualified.length !== 2 || member === undefined) {
      return undefined;
    }

    if (module === "Effect" && effectRunnerNames.has(member)) {
      return `Effect.${member}`;
    }

    if (module === "NodeRuntime" && member === "runMain") {
      return "NodeRuntime.runMain";
    }

    return module === "ManagedRuntime" && member === "make" ? "ManagedRuntime.make" : undefined;
  }

  function visit(node: ts.Node): void {
    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
      const path = getAccessPath(node, []);
      const api = path === null ? undefined : apiOf(path);
      if (api !== undefined) {
        add(node, api);
        return;
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(source);
  return uses;
}

/**
 * Resolves a relative module specifier against the importing module.
 *
 * @param file - Repository-relative importing module path.
 * @param specifier - Module specifier as written.
 * @returns The repository-relative target path, or `undefined` for package specifiers.
 */
function resolveRelativeSpecifier(file: string, specifier: string): string | undefined {
  return specifier.startsWith(".") ? posix.join(posix.dirname(file), specifier) : undefined;
}

/**
 * Lists the legacy-kernel modules one platform module imports.
 *
 * @param file - Repository-relative platform module path.
 * @param sourceText - Source text to parse.
 * @returns Every import of a legacy-kernel module, as `{file, target}` pairs.
 */
function scanLegacyKernelImportSource(file: string, sourceText: string): readonly {file: string; target: string}[] {
  return collectModuleImports(sourceText).flatMap((moduleImport) => {
    const target = resolveRelativeSpecifier(file, moduleImport.specifier);
    return target !== undefined && legacyKernelModule.test(target) ? [{file, target}] : [];
  });
}

/**
 * Lists every module, test included, under the given directories.
 *
 * @param directories - Repository-relative directories to walk.
 * @returns Sorted repository-relative `.ts` module paths.
 */
function discoverModulesUnder(directories: readonly string[]): readonly string[] {
  return directories
    .flatMap((directory) =>
      readdirSync(directory, {recursive: true, withFileTypes: true})
        .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
        .map((entry) => normalizeFilePath(join(entry.parentPath, entry.name))),
    )
    .toSorted();
}

/**
 * Lists the legacy-kernel modules one module loads at runtime.
 *
 * @remarks
 * Only a clause-level `import type` / `export type` is erased. An import whose every specifier is
 * an inline `type` still loads the module under type stripping, so it counts as a value import, as
 * do side-effect, namespace, re-export, and literal dynamic imports.
 *
 * @param file - Repository-relative importing module path.
 * @param sourceText - Source text to parse.
 * @returns Every runtime import of a legacy-kernel module, as `{file, target}` pairs.
 */
function scanLegacyKernelValueImportSource(file: string, sourceText: string): readonly {file: string; target: string}[] {
  const source = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const specifiers: string[] = [];

  function visit(node: ts.Node): void {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && node.importClause?.isTypeOnly !== true) {
      specifiers.push(node.moduleSpecifier.text);
    }

    if (
      ts.isExportDeclaration(node)
      && !node.isTypeOnly
      && node.moduleSpecifier !== undefined
      && ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text);
    }

    if (ts.isCallExpression(node) && isDynamicImport(node)) {
      const specifier = node.arguments[0];
      if (specifier !== undefined && (ts.isStringLiteral(specifier) || ts.isNoSubstitutionTemplateLiteral(specifier))) {
        specifiers.push(specifier.text);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(source);
  return specifiers.flatMap((specifier) => {
    const target = resolveRelativeSpecifier(file, specifier);
    return target !== undefined && legacyKernelModule.test(target) ? [{file, target}] : [];
  });
}

/**
 * Lists the `effect/cli` module imports of one production module.
 *
 * @param file - Repository-relative module path reported with each import.
 * @param sourceText - Source text to parse.
 * @returns Every static import, re-export, or literal dynamic import of `effect/cli` or a subpath.
 */
function scanEffectCliImportSource(file: string, sourceText: string): readonly {file: string; specifier: string}[] {
  return collectModuleImports(sourceText)
    .filter((moduleImport) => moduleImport.specifier === "effect/cli" || moduleImport.specifier.startsWith("effect/cli/"))
    .map((moduleImport) => ({file, specifier: moduleImport.specifier}));
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
    expect(scanRuntimeBoundarySource("scripts/commands/example.ts", source)).toEqual([
      {file: "scripts/commands/example.ts", line: 1, rule: "direct-exit"},
      {file: "scripts/commands/example.ts", line: 3, rule: "direct-exit"},
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

  it("only sanctioned modules are direct entrypoints", () => {
    expect(discoverDirectEntrypointModules()).toEqual(directEntrypoints);

    const violations = workerEntrypoints
      .map((file) => ({file, ...analyzeCommandEntrypoint(readFileSync(file, "utf8"))}))
      .filter((entrypoint) => !entrypoint.startsThroughRunWorker);

    expect(violations).toEqual([]);
  });

  it("recognizes only a lone runWorker call as a worker entry block", () => {
    expect(analyzeCommandEntrypoint("if (import.meta.main) {\n  runWorker(worker);\n}")).toEqual({
      startsThroughRunWorker: true,
      usesImportMetaMain: true,
    });
    expect(analyzeCommandEntrypoint("if (import.meta.main) runWorker(worker);").startsThroughRunWorker).toBe(true);
    expect(analyzeCommandEntrypoint("if (import.meta.main) {\n  runWorker(worker);\n  start();\n}").startsThroughRunWorker).toBe(false);
    expect(analyzeCommandEntrypoint("if (import.meta.main) {\n  await worker.invoke();\n}").startsThroughRunWorker).toBe(false);
    expect(analyzeCommandEntrypoint("if (import.meta.main) runWorker(worker); else start();").startsThroughRunWorker).toBe(false);
    expect(analyzeCommandEntrypoint("export const x = 1;")).toEqual({startsThroughRunWorker: false, usesImportMetaMain: false});
  });

  it("sanctions neither process.argv nor the exit code in the inspection workers, even inside import.meta.main", () => {
    const source = [
      "const args = process.argv.slice(2);",
      "process.exitCode = 1;",
      "if (import.meta.main) {",
      "  const entryArgs = process.argv.slice(2);",
      "  process.exitCode = 1;",
      "  void process.env.PATH;",
      "  process.exit(1);",
      "}",
    ].join("\n");

    for (const worker of workerEntrypoints) {
      expect(scanRuntimeBoundarySource(worker, source)).toEqual([
        {file: worker, line: 1, rule: "ambient-os-state"},
        {file: worker, line: 2, rule: "direct-exit"},
        {file: worker, line: 4, rule: "ambient-os-state"},
        {file: worker, line: 5, rule: "direct-exit"},
        {file: worker, line: 6, rule: "ambient-environment"},
        {file: worker, line: 7, rule: "direct-exit"},
      ]);
    }
    expect(scanRuntimeBoundarySource("scripts/example.ts", source)).toEqual([
      {file: "scripts/example.ts", line: 1, rule: "ambient-os-state"},
      {file: "scripts/example.ts", line: 2, rule: "direct-exit"},
      {file: "scripts/example.ts", line: 4, rule: "ambient-os-state"},
      {file: "scripts/example.ts", line: 5, rule: "direct-exit"},
      {file: "scripts/example.ts", line: 6, rule: "ambient-environment"},
      {file: "scripts/example.ts", line: 7, rule: "direct-exit"},
    ]);
  });

  it("read-only families never import mutating capabilities", () => {
    const familyModules = discoverReadOnlyFamilyModules();
    const violations = familyModules.flatMap((file) => scanReadOnlyCapabilitySource(file, readFileSync(file, "utf8")));

    expect(familyModules).toEqual(
      expect.arrayContaining([
        "scripts/commands/doctor/cli.ts",
        "scripts/commands/doctor/modules/react.ts",
        "scripts/commands/status/index.ts",
        "scripts/inspection/session.ts",
        "scripts/inspection/workspace.worker.ts",
      ]),
    );
    expect(violations).toEqual([]);
  });

  it("detects every import form that widens a read-only family", () => {
    const source = [
      'import {Effect, FileSystem} from "effect";',
      'import type {FileSystem as Files} from "effect";',
      'import * as FS from "effect/FileSystem";',
      'import {HttpClient, HttpClientError} from "effect/http";',
      'export {HttpClient} from "effect/http";',
      'import {Prompts} from "../../platform/Prompts.ts";',
      'import {ReadOnlyFiles, writeTextAtomic} from "../../platform/Files.ts";',
      'import runner from "../../common/runner.ts";',
      'void import("../../platform/Files.ts");',
      'import {spawn} from "node:child_process";',
      'import {Effect as Allowed} from "effect";',
    ].join("\n");

    expect(scanReadOnlyCapabilitySource("scripts/commands/doctor/example.ts", source)).toEqual([
      {file: "scripts/commands/doctor/example.ts", specifier: "effect", name: "FileSystem"},
      {file: "scripts/commands/doctor/example.ts", specifier: "effect", name: "FileSystem"},
      {file: "scripts/commands/doctor/example.ts", specifier: "effect/FileSystem"},
      {file: "scripts/commands/doctor/example.ts", specifier: "effect/http", name: "HttpClient"},
      {file: "scripts/commands/doctor/example.ts", specifier: "effect/http", name: "HttpClient"},
      {file: "scripts/commands/doctor/example.ts", specifier: "./platform/Prompts.ts"},
      {file: "scripts/commands/doctor/example.ts", specifier: "./platform/Files.ts", name: "writeTextAtomic"},
      {file: "scripts/commands/doctor/example.ts", specifier: "./common/runner.ts", name: "*"},
      {file: "scripts/commands/doctor/example.ts", specifier: "./platform/Files.ts", name: "*"},
      {file: "scripts/commands/doctor/example.ts", specifier: "node:child_process"},
    ]);
    expect(scanReadOnlyCapabilitySource("scripts/inspection/example.ts", 'import {writeTextAtomic} from "../platform/Files.ts";')).toEqual([
      {file: "scripts/inspection/example.ts", specifier: "./platform/Files.ts", name: "writeTextAtomic"},
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

  it("sanctions the platform layer for ambient access but not for exits or stray output", () => {
    const source = [
      'import {readFileSync} from "node:fs";',
      "void process.env.PATH;",
      "setTimeout(() => undefined, 10);",
      "process.on('SIGINT', () => undefined);",
      "process.stdout.write('visible');",
      "process.exitCode = 1;",
      "process.exit(1);",
    ].join("\n");

    expect(scanRuntimeBoundarySource("scripts/platform/Example.ts", source)).toEqual([
      {file: "scripts/platform/Example.ts", line: 5, rule: "direct-output"},
      {file: "scripts/platform/Example.ts", line: 6, rule: "direct-exit"},
      {file: "scripts/platform/Example.ts", line: 7, rule: "direct-exit"},
    ]);
    expect(scanRuntimeBoundarySource("scripts/platform/Output.ts", "process.stdout.write('visible');")).toEqual([]);
  });

  it("imports @effect/platform-node only inside scripts/platform and the CLI entrypoint", () => {
    const offenders = discoverProductionScripts()
      .filter((file) => !file.startsWith(platformLayerDirectory) && file !== cliEntrypoint)
      .flatMap((file) =>
        collectModuleImports(readFileSync(file, "utf8"))
          .filter(
            (moduleImport) =>
              moduleImport.specifier === "@effect/platform-node" || moduleImport.specifier.startsWith("@effect/platform-node/"),
          )
          .map((moduleImport) => ({file, specifier: moduleImport.specifier})),
      );

    expect(offenders).toEqual([]);
  });

  it("sanctions only process.argv inside the import.meta.main block as ambient state in the CLI entrypoint", () => {
    const source = [
      "void process.argv.slice(2);",
      "if (import.meta.main) {",
      "  void process.argv.slice(2);",
      "  void process.env.PATH;",
      "  void process.platform;",
      "  process.exitCode = 1;",
      "}",
    ].join("\n");

    expect(scanRuntimeBoundarySource(cliEntrypoint, source)).toEqual([
      {file: cliEntrypoint, line: 1, rule: "ambient-os-state"},
      {file: cliEntrypoint, line: 4, rule: "ambient-environment"},
      {file: cliEntrypoint, line: 5, rule: "ambient-os-state"},
      {file: cliEntrypoint, line: 6, rule: "direct-exit"},
    ]);
    expect(scanRuntimeBoundarySource("scripts/example.ts", "if (import.meta.main) {\n  void process.argv.slice(2);\n}")).toEqual([
      {file: "scripts/example.ts", line: 2, rule: "ambient-os-state"},
    ]);
  });

  it("detects effect/cli imports through static, re-export, deep, and dynamic specifiers", () => {
    const source = [
      'import {Command} from "effect/cli";',
      'export {Flag} from "effect/cli";',
      'import type {Parser} from "effect/cli/internal/parser";',
      'void import("effect/cli");',
      'import {Effect} from "effect";',
      'import {Option} from "effect/Option";',
    ].join("\n");

    expect(scanEffectCliImportSource("scripts/example.ts", source)).toEqual([
      {file: "scripts/example.ts", specifier: "effect/cli"},
      {file: "scripts/example.ts", specifier: "effect/cli"},
      {file: "scripts/example.ts", specifier: "effect/cli/internal/parser"},
      {file: "scripts/example.ts", specifier: "effect/cli"},
    ]);
  });

  it("command families depend on effect/cli only through scripts/commands", () => {
    const importers = discoverProductionScripts().filter(
      (file) => scanEffectCliImportSource(file, readFileSync(file, "utf8")).length > 0,
    );

    expect(
      importers.filter((file) => !file.startsWith(commandFamiliesDirectory) && !effectCliConsumers.includes(file)),
    ).toEqual([]);
    expect(importers).toContain(cliEntrypoint);
    expect(importers.some((file) => /^scripts\/commands\/[\w-]+\/cli\.ts$/.test(file))).toBe(true);
  });

  it("detects NodeRuntime.runMain through named, aliased, and namespace imports", () => {
    const source = [
      'import {NodeRuntime as Runtime} from "@effect/platform-node";',
      'import * as node from "@effect/platform-node";',
      'import * as NR from "@effect/platform-node/NodeRuntime";',
      'import {runMain} from "@effect/platform-node/NodeRuntime";',
      "Runtime.runMain(program);",
      "node.NodeRuntime.runMain(program);",
      'NR["runMain"](program);',
      "void node.NodeServices.layer;",
    ].join("\n");

    expect(scanEffectRunnerSource("scripts/example.ts", source)).toEqual([
      {file: "scripts/example.ts", line: 4, api: "NodeRuntime.runMain"},
      {file: "scripts/example.ts", line: 5, api: "NodeRuntime.runMain"},
      {file: "scripts/example.ts", line: 6, api: "NodeRuntime.runMain"},
      {file: "scripts/example.ts", line: 7, api: "NodeRuntime.runMain"},
    ]);
  });

  it("detects Effect runners through named, aliased, and namespace imports", () => {
    const source = [
      'import {Effect as E, ManagedRuntime} from "effect";',
      'import * as effect from "effect";',
      'import * as Fx from "effect/Effect";',
      'import {runFork, succeed} from "effect/Effect";',
      'import {make} from "effect/ManagedRuntime";',
      "void E.runPromise(E.void);",
      "const run = effect.Effect.runSync;",
      'void Fx["runPromiseExit"](Fx.void);',
      "void ManagedRuntime.make(layer);",
      "void E.succeed(1);",
    ].join("\n");

    expect(scanEffectRunnerSource("scripts/example.ts", source)).toEqual([
      {file: "scripts/example.ts", line: 4, api: "Effect.runFork"},
      {file: "scripts/example.ts", line: 5, api: "ManagedRuntime.make"},
      {file: "scripts/example.ts", line: 6, api: "Effect.runPromise"},
      {file: "scripts/example.ts", line: 7, api: "Effect.runSync"},
      {file: "scripts/example.ts", line: 8, api: "Effect.runPromiseExit"},
      {file: "scripts/example.ts", line: 9, api: "ManagedRuntime.make"},
    ]);
  });

  it("runs Effect programs only at sanctioned entry points", () => {
    const uses = discoverProductionScripts().flatMap((file) => scanEffectRunnerSource(file, readFileSync(file, "utf8")));

    expect(uses.filter((use) => !sanctionedEffectRunners.includes(use.file))).toEqual([]);
    expect([...new Set(uses.map((use) => use.file))].toSorted()).toEqual(sanctionedEffectRunners);
    expect(uses).toContainEqual(expect.objectContaining({file: cliEntrypoint, api: "NodeRuntime.runMain"}));
  });

  it("resolves platform imports of the legacy kernel", () => {
    const source = [
      'import {nodeProcessRunner} from "../common/runtime.node.ts";',
      'import type {ProcessRunner} from "../common/runner.execa.ts";',
      'export * from "../common/index.ts";',
      'import {repositoryRoot} from "../common/repository-paths.ts";',
      'import {Effect} from "effect";',
    ].join("\n");

    expect(scanLegacyKernelImportSource("scripts/platform/Example.ts", source)).toEqual([
      {file: "scripts/platform/Example.ts", target: "scripts/common/runtime.node.ts"},
      {file: "scripts/platform/Example.ts", target: "scripts/common/runner.execa.ts"},
      {file: "scripts/platform/Example.ts", target: "scripts/common/index.ts"},
    ]);
  });

  it("keeps the platform layer free of legacy kernel imports", () => {
    const platformModules = discoverProductionScripts().filter((file) => file.startsWith(platformLayerDirectory));
    const offenders = platformModules.flatMap((file) => scanLegacyKernelImportSource(file, readFileSync(file, "utf8")));

    expect(platformModules).toContain("scripts/platform/layers.ts");
    expect(offenders).toEqual([]);
  });

  it("flags runtime imports of the legacy kernel and allows clause-level type imports", () => {
    const source = [
      'import type {LoggerRuntimeHost} from "../../common/logger.ts";',
      'export type {ProcessRunner} from "../../common/runner.ts";',
      'import {type MonorepositoryLogger} from "../../common/logger.ts";',
      'import "../../common/index.ts";',
      'import * as runner from "../../common/runner.ts";',
      'export {nodeProcessRunner} from "../../common/runtime.node.ts";',
      'const lazy = await import("../../common/runner.execa.ts");',
      'type Lazy = typeof import("../../common/index.ts");',
      'import {resolveRepositoryPaths} from "../../common/repository-paths.ts";',
    ].join("\n");

    expect(scanLegacyKernelValueImportSource("scripts/commands/generate/example.ts", source)).toEqual([
      {file: "scripts/commands/generate/example.ts", target: "scripts/common/logger.ts"},
      {file: "scripts/commands/generate/example.ts", target: "scripts/common/index.ts"},
      {file: "scripts/commands/generate/example.ts", target: "scripts/common/runner.ts"},
      {file: "scripts/commands/generate/example.ts", target: "scripts/common/runtime.node.ts"},
      {file: "scripts/commands/generate/example.ts", target: "scripts/common/runner.execa.ts"},
    ]);
  });

  it("effect-native families never import the legacy kernel", () => {
    const familyModules = discoverModulesUnder(effectNativeFamilies);
    const offenders = familyModules.flatMap((file) => scanLegacyKernelValueImportSource(file, readFileSync(file, "utf8")));

    for (const family of effectNativeFamilies.filter((directory) => directory.startsWith(commandFamiliesDirectory))) {
      expect(familyModules).toContain(`${family}/cli.ts`);
    }
    expect(familyModules).toContain("scripts/inspection/Inspection.ts");
    expect(familyModules).toContain("scripts/container-runtime/selfhost.ts");
    expect(familyModules).toContain("scripts/container-runtime/selfhost.testing.ts");
    expect(offenders).toEqual([]);
  });

  it("exempts only the platform test fixtures, including the runMain fixture, from the production scans", () => {
    const fixture = `${platformFixturesDirectory}cancellable-cli.ts`;
    const fixtureSource = readFileSync(fixture, "utf8");

    expect(isTestFixture(fixture)).toBe(true);
    expect(isTestFixture("scripts/commands/dev/__fixtures__/entry.ts")).toBe(false);
    expect(isTestFixture("scripts/__fixtures__/entry.ts")).toBe(false);
    expect(analyzeCommandEntrypoint(fixtureSource).usesImportMetaMain).toBe(true);
    expect(scanEffectRunnerSource(fixture, fixtureSource)).toContainEqual(expect.objectContaining({api: "NodeRuntime.runMain"}));
    expect(discoverProductionScripts()).not.toContain(fixture);
  });

  it("leaves no temporary cohort wrappers", () => {
    const files = discoverScriptsTextFiles();
    const markers = files.filter((file) => temporaryCohortMarker.test(readFileSync(file, "utf8")));
    const wrapperReferences = files
      .filter((file) => file !== runtimeBoundaryPolicyFile)
      .filter((file) => removedRunEffectWrapper.test(readFileSync(file, "utf8")));

    expect(files).toContain(runtimeBoundaryPolicyFile);
    expect(temporaryCohortMarker.test(["// Cohort", "6", "temporary: remove with the family"].join(" "))).toBe(true);
    expect(markers).toEqual([]);
    expect(wrapperReferences).toEqual([]);
  });
});
