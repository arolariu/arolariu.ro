// @vitest-environment node
/**
 * @fileoverview AST policy tests for direct monorepository script output and process-import boundaries.
 * @module scripts.common.output-policy.test
 */

import {execFileSync} from "node:child_process";
import {existsSync, readdirSync, readFileSync} from "node:fs";
import {join} from "node:path";
import ts from "typescript";
import {beforeAll, describe, expect, it} from "vitest";

const productionScriptExtensions = new Set([".ts", ".js", ".mjs", ".cjs"]);
const transitionalEntrypoints = new Set<string>();
const interactiveTerminalAdapters = new Set(["scripts/common/prompts.ts"]);

type AccessPath = readonly string[];
type AliasScope = Map<string, AccessPath | null>;
type OutputExpressionPredicate = (expression: ts.Expression, scopes: readonly AliasScope[]) => boolean;

function discoverProductionScripts(directory: string = "scripts"): readonly string[] {
  const files: string[] = [];

  for (const entry of readdirSync(directory, {withFileTypes: true})) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...discoverProductionScripts(path));
      continue;
    }

    const normalizedPath = path.replaceAll("\\", "/");
    const extension = normalizedPath.slice(normalizedPath.lastIndexOf("."));
    if (
      productionScriptExtensions.has(extension)
      && !/\.(?:spec|test)\.(?:cjs|js|mjs|ts)$/.test(normalizedPath)
      && normalizedPath !== "scripts/common/logger.ts"
    ) {
      files.push(normalizedPath);
    }
  }

  return files.toSorted();
}

function getConfigObjectLiteral(expression: ts.Expression): ts.ObjectLiteralExpression | null {
  if (
    ts.isParenthesizedExpression(expression)
    || ts.isAsExpression(expression)
    || ts.isSatisfiesExpression(expression)
    || ts.isNonNullExpression(expression)
    || ts.isElementAccessExpression(expression)
  ) {
    return getConfigObjectLiteral(expression.expression);
  }

  if (ts.isObjectLiteralExpression(expression)) {
    return expression;
  }

  if (ts.isCallExpression(expression)) {
    for (const argument of expression.arguments) {
      const objectLiteral = getConfigObjectLiteral(argument);
      if (objectLiteral !== null) {
        return objectLiteral;
      }
    }
  }

  return null;
}

function readConfigStringArrayProperty(fileName: string, variableName: string, propertyName: string): readonly string[] {
  const source = ts.createSourceFile(fileName, readFileSync(fileName, "utf8"), ts.ScriptTarget.Latest, true);

  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue;
    }

    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== variableName || declaration.initializer === undefined) {
        continue;
      }

      const objectLiteral = getConfigObjectLiteral(declaration.initializer);
      if (objectLiteral === null) {
        continue;
      }

      for (const property of objectLiteral.properties) {
        if (!ts.isPropertyAssignment(property)) {
          continue;
        }

        const propertyNameNode = property.name;
        const matchesPropertyName =
          (ts.isIdentifier(propertyNameNode) && propertyNameNode.text === propertyName)
          || (ts.isStringLiteral(propertyNameNode) && propertyNameNode.text === propertyName)
          || (ts.isNumericLiteral(propertyNameNode) && propertyNameNode.text === propertyName)
          || (ts.isNoSubstitutionTemplateLiteral(propertyNameNode) && propertyNameNode.text === propertyName);
        if (!matchesPropertyName || !ts.isArrayLiteralExpression(property.initializer)) {
          continue;
        }

        return property.initializer.elements.map((element) => {
          if (ts.isStringLiteral(element) || ts.isNoSubstitutionTemplateLiteral(element)) {
            return element.text;
          }

          throw new Error(`Expected ${variableName}.${propertyName} to contain only string literals in ${fileName}.`);
        });
      }
    }
  }

  throw new Error(`Unable to locate ${variableName}.${propertyName} in ${fileName}.`);
}

function readRestrictedSyntaxMessages(fileName: string, variableName: string): readonly string[] {
  const source = ts.createSourceFile(fileName, readFileSync(fileName, "utf8"), ts.ScriptTarget.Latest, true);

  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue;
    }

    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== variableName || declaration.initializer === undefined) {
        continue;
      }

      const config = getConfigObjectLiteral(declaration.initializer);
      const rules = config?.properties.find(
        (property): property is ts.PropertyAssignment =>
          ts.isPropertyAssignment(property) && ts.isIdentifier(property.name) && property.name.text === "rules",
      )?.initializer;
      if (!ts.isObjectLiteralExpression(rules)) {
        continue;
      }

      const restriction = rules.properties.find(
        (property): property is ts.PropertyAssignment =>
          ts.isPropertyAssignment(property) && ts.isStringLiteral(property.name) && property.name.text === "no-restricted-syntax",
      )?.initializer;
      if (!ts.isArrayLiteralExpression(restriction)) {
        continue;
      }

      return restriction.elements.flatMap((element) => {
        if (!ts.isObjectLiteralExpression(element)) {
          return [];
        }

        const message = element.properties.find(
          (property): property is ts.PropertyAssignment =>
            ts.isPropertyAssignment(property) && ts.isIdentifier(property.name) && property.name.text === "message",
        )?.initializer;
        return ts.isStringLiteral(message) ? [message.text] : [];
      });
    }
  }

  throw new Error(`Unable to locate ${variableName}.rules["no-restricted-syntax"] in ${fileName}.`);
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

  if (
    ts.isElementAccessExpression(expression)
    && (
      ts.isStringLiteral(expression.argumentExpression)
      || ts.isNoSubstitutionTemplateLiteral(expression.argumentExpression)
      || ts.isNumericLiteral(expression.argumentExpression)
    )
  ) {
    const receiver = getAccessPath(expression.expression, scopes);
    return receiver === null ? null : [...receiver, expression.argumentExpression.text];
  }

  return null;
}

function isForbiddenOutputExpression(expression: ts.Expression, scopes: readonly AliasScope[]): boolean {
  const path = getAccessPath(expression, scopes);
  if (path === null) {
    return false;
  }

  if (path.length === 2 && path[0] === "console") {
    return true;
  }

  return path.length === 3 && path[0] === "process" && (path[1] === "stdout" || path[1] === "stderr") && path[2] === "write";
}

function isPromptTerminalOutputExpression(expression: ts.Expression, scopes: readonly AliasScope[]): boolean {
  const path = getAccessPath(expression, scopes);
  return path !== null && path.length >= 2 && path.at(-2) === "output" && path.at(-1) === "write";
}

function findOutputCalls(
  sourceText: string,
  fileName: string,
  predicate: OutputExpressionPredicate,
  trackParameterRoots = false,
): readonly string[] {
  const source = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true);
  const violations: string[] = [];

  function declareBindingName(name: ts.BindingName, scope: AliasScope, accessPath: AccessPath | null): void {
    if (ts.isIdentifier(name)) {
      scope.set(name.text, accessPath);
      return;
    }

    for (const element of name.elements) {
      if (ts.isOmittedExpression(element)) {
        continue;
      }

      let elementAccessPath: AccessPath | null = null;
      if (ts.isObjectBindingPattern(name) && element.dotDotDotToken === undefined && accessPath !== null) {
        const propertyName = element.propertyName ?? (ts.isIdentifier(element.name) ? element.name : undefined);
        if (
          propertyName !== undefined
          && (ts.isIdentifier(propertyName)
            || ts.isStringLiteral(propertyName)
            || ts.isNumericLiteral(propertyName)
            || ts.isNoSubstitutionTemplateLiteral(propertyName))
        ) {
          elementAccessPath = [...accessPath, propertyName.text];
        }
      }

      declareBindingName(element.name, scope, elementAccessPath);
    }
  }

  function visitFunction(node: ts.FunctionLikeDeclaration, scopes: readonly AliasScope[]): void {
    const functionScope: AliasScope = new Map();
    if (node.name !== undefined && ts.isIdentifier(node.name)) {
      functionScope.set(node.name.text, null);
    }
    for (const [index, parameter] of node.parameters.entries()) {
      declareBindingName(parameter.name, functionScope, trackParameterRoots ? [`<parameter:${index}>`] : null);
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

  function visit(node: ts.Node, scopes: readonly AliasScope[]): void {
    if (ts.isSourceFile(node) || ts.isBlock(node)) {
      const blockScopes = [...scopes, new Map<string, AccessPath | null>()];
      for (const statement of node.statements) {
        visit(statement, blockScopes);
      }
      return;
    }

    const scope = scopes.at(-1);
    if (scope === undefined) {
      throw new Error("Output policy traversal requires an active lexical scope.");
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
      visitFunction(node, scopes);
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
      visitFunction(node, scopes);
      return;
    }

    if (ts.isClassDeclaration(node) && node.name !== undefined) {
      scope.set(node.name.text, null);
    }

    if (ts.isCallExpression(node) && predicate(node.expression, scopes)) {
      const position = source.getLineAndCharacterOfPosition(node.getStart(source));
      violations.push(`${fileName}:${position.line + 1}`);
    }
    ts.forEachChild(node, (child) => visit(child, scopes));
  }

  visit(source, []);
  return violations;
}

function findForbiddenOutputCalls(sourceText: string, fileName: string): readonly string[] {
  return findOutputCalls(sourceText, fileName, isForbiddenOutputExpression);
}

function findPromptTerminalOutputCalls(sourceText: string, fileName: string): readonly string[] {
  return findOutputCalls(sourceText, fileName, isPromptTerminalOutputExpression, true);
}

describe("direct output policy", () => {
  it("anchors every transitional exception to an existing entrypoint", () => {
    expect([...transitionalEntrypoints].filter((fileName) => !existsSync(fileName))).toEqual([]);
  });

  it("keeps setup out of the tooling output ignore list", () => {
    const ignores = readConfigStringArrayProperty("eslint.config.ts", "toolingOutputConfig", "ignores");

    expect(ignores).toEqual(expect.arrayContaining([...transitionalEntrypoints]));
    expect(ignores).not.toContain("scripts/setup.ts");
  });

  it("keeps process restrictions when the prompt ESLint policy is applied later", () => {
    const outputMessages = readRestrictedSyntaxMessages("eslint.config.ts", "toolingOutputConfig");
    const promptMessages = readRestrictedSyntaxMessages("eslint.config.ts", "toolingPromptOutputConfig");
    const promptIgnores = readConfigStringArrayProperty("eslint.config.ts", "toolingPromptOutputConfig", "ignores");

    expect(outputMessages).toHaveLength(1);
    expect(promptMessages).toEqual(
      expect.arrayContaining([...outputMessages, "Interactive terminal output is owned exclusively by scripts/common/prompts.ts."]),
    );
    expect(promptIgnores).toContain("scripts/common/prompts.ts");
  });

  it("inspects executable calls without matching comments or strings", () => {
    const source = [
      "// console.log('comment')",
      "const example = \"process.stderr.write('string')\";",
      "console.log('output');",
      "process['stderr'].write('error');",
      "process.stdout.write('output');",
    ].join("\n");

    expect(findForbiddenOutputCalls(source, "fixture.ts")).toEqual(["fixture.ts:3", "fixture.ts:4", "fixture.ts:5"]);
  });

  it("resolves parenthesized, template-literal, and const-aliased output receivers", () => {
    const source = [
      "const consoleAlias = console;",
      "const stdoutAlias = process.stdout;",
      "const stderrAlias = process[`stderr`];",
      "const {error: errorAlias} = console;",
      "const {write: writeAlias} = process.stdout;",
      "(console).info('parenthesized');",
      "process[`stdout`].write('template');",
      "consoleAlias.warn('aliased console');",
      "(stdoutAlias).write('aliased stdout');",
      "stderrAlias.write('aliased stderr');",
      "errorAlias('aliased console method');",
      "writeAlias('aliased stdout method');",
      "function unrelated(consoleAlias: {warn(message: string): void}): void {",
      "  consoleAlias.warn('different receiver');",
      "}",
    ].join("\n");

    expect(findForbiddenOutputCalls(source, "fixture.ts")).toEqual([
      "fixture.ts:6",
      "fixture.ts:7",
      "fixture.ts:8",
      "fixture.ts:9",
      "fixture.ts:10",
      "fixture.ts:11",
      "fixture.ts:12",
    ]);
  });

  it("routes production script output through the logger outside transitional entrypoints", () => {
    const violations = discoverProductionScripts()
      .filter((fileName) => !transitionalEntrypoints.has(fileName))
      .flatMap((fileName) => findForbiddenOutputCalls(readFileSync(fileName, "utf8"), fileName));

    expect(violations).toEqual([]);
  });

  it("reserves injected terminal output writes for the prompt adapter", () => {
    const source = [
      "function emit(terminal: {output: {write(message: string): void}}): void {",
      "  terminal.output.write('question');",
      "  terminal['output'].write('choice');",
      "  const outputAlias = terminal.output;",
      "  outputAlias.write('aliased output');",
      "  const {write: writeAlias} = terminal.output;",
      "  writeAlias('destructured write');",
      "  const directWriteAlias = terminal.output.write;",
      "  directWriteAlias('aliased write');",
      "  const {output: destructuredOutput} = terminal;",
      "  destructuredOutput.write('destructured output');",
      "}",
      "function unrelated(outputAlias: {write(message: string): void}): void {",
      "  outputAlias.write('different receiver');",
      "}",
      "const example = \"terminal.output.write('string')\";",
    ].join("\n");

    expect(findPromptTerminalOutputCalls(source, "fixture.ts")).toEqual([
      "fixture.ts:2",
      "fixture.ts:3",
      "fixture.ts:5",
      "fixture.ts:7",
      "fixture.ts:9",
      "fixture.ts:11",
    ]);

    const violations = discoverProductionScripts()
      .filter((fileName) => !interactiveTerminalAdapters.has(fileName))
      .flatMap((fileName) => findPromptTerminalOutputCalls(readFileSync(fileName, "utf8"), fileName));

    expect(violations).toEqual([]);
  });
});

// ============================================================================
// Process-import boundary policy
// ============================================================================

/**
 * Virtual fixture sources for the process-import boundary ESLint policy.
 * Each entry is [label, code, filename, expectViolation].
 *
 * A single Node.js subprocess loads the ESLint config once and lints every
 * source, reusing the same batched pattern as doctor.readonly.test.ts.
 */
const PROCESS_BOUNDARY_CASES: readonly [string, string, string, boolean][] = [
  // Production scripts cannot import node:child_process or child_process
  ["prod-node:child_process", 'import {spawn} from "node:child_process";', "scripts/setup.ts", true],
  ["prod-child_process", 'import {execFile} from "child_process";', "scripts/doctor.ts", true],
  ["prod-worker-child_process", 'import {fork} from "node:child_process";', "scripts/workers/shell.ts", true],
  ["prod-generator-child_process", 'import {exec} from "node:child_process";', "scripts/generate.ts", true],
  ["prod-container-child_process", 'import {spawn} from "node:child_process";', "scripts/container-runtime/aspire.ts", true],
  ["prod-inspection-child_process", 'import {execFile} from "node:child_process";', "scripts/inspection/workspace.ts", true],

  // Production scripts outside runner.execa.ts cannot import execa
  ["prod-execa-setup", 'import {execa} from "execa";', "scripts/setup.ts", true],
  ["prod-execa-doctor", 'import {execa} from "execa";', "scripts/doctor.ts", true],
  ["prod-execa-status", 'import {execa} from "execa";', "scripts/status.ts", true],
  ["prod-execa-worker", 'import {execa} from "execa";', "scripts/workers/shell.ts", true],
  ["prod-execa-container", 'import {execa} from "execa";', "scripts/container-runtime/aspire.ts", true],

  // runner.execa.ts may import execa
  ["runner-execa-allowed", 'import {execa} from "execa";', "scripts/common/runner.execa.ts", false],
  ["process-execa-banned", 'import {execa} from "execa";', "scripts/common/process.ts", true],

  // process.ts still cannot import node:child_process
  ["process-child_process-banned", 'import {spawn} from "node:child_process";', "scripts/common/process.ts", true],
  ["process-child_process-bare-banned", 'import {execFile} from "child_process";', "scripts/common/process.ts", true],

  // Test files may use child_process and execa
  ["test-child_process-allowed", 'import {execFileSync} from "node:child_process";', "scripts/common/process.test.ts", false],
  ["test-execa-allowed", 'import {execa} from "execa";', "scripts/setup.test.ts", false],
];

/**
 * Runs all process-boundary lint cases in a single Node.js subprocess.
 * Returns a label → no-restricted-imports violation count map.
 */
function runProcessBoundaryLintBatch(): ReadonlyMap<string, number> {
  const casesJson = JSON.stringify(PROCESS_BOUNDARY_CASES.map(([label, code, filename]) => [label, code, filename]));
  const script = `
    import {ESLint} from "eslint";
    const eslint = new ESLint();
    const cases = ${casesJson};
    const out = {};
    for (const [label, code, filename] of cases) {
      const r = await eslint.lintText(code + "\\n", {filePath: filename});
      out[label] = r[0].messages.filter(m => m.ruleId === "no-restricted-imports" && m.severity === 2).length;
    }
    process.stdout.write(JSON.stringify(out));
  `;
  const output = execFileSync(process.execPath, ["--input-type=module"], {
    input: script,
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
    timeout: 120_000,
  });
  return new Map(Object.entries(JSON.parse(output) as Record<string, number>));
}

let processBoundaryResults: ReadonlyMap<string, number>;

describe("process-import boundary policy", () => {
  beforeAll(() => {
    processBoundaryResults = runProcessBoundaryLintBatch();
  });

  it.each(PROCESS_BOUNDARY_CASES)("%s", (label, _code, _filename, expectViolation) => {
    const violations = processBoundaryResults.get(label) ?? 0;
    if (expectViolation) {
      expect(violations, `expected a no-restricted-imports violation for ${label}`).toBeGreaterThan(0);
    } else {
      expect(violations, `expected no no-restricted-imports violation for ${label}`).toBe(0);
    }
  });
});
