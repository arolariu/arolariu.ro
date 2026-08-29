// @vitest-environment node
/**
 * @fileoverview AST policy tests for direct monorepository script output.
 * @module scripts.common.output-policy.test
 */

import {existsSync, readdirSync, readFileSync} from "node:fs";
import {join} from "node:path";
import ts from "typescript";
import {describe, expect, it} from "vitest";

const productionScriptExtensions = new Set([".ts", ".js", ".mjs", ".cjs"]);
const transitionalEntrypoints = new Set(["scripts/setup.ts", "scripts/doctor.ts", "scripts/status.ts"]);

type AccessPath = readonly string[];
type AliasScope = Map<string, AccessPath | null>;

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
    && (ts.isStringLiteral(expression.argumentExpression) || ts.isNoSubstitutionTemplateLiteral(expression.argumentExpression))
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

function findForbiddenOutputCalls(sourceText: string, fileName: string): readonly string[] {
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
    for (const parameter of node.parameters) {
      declareBindingName(parameter.name, functionScope, null);
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

    if (ts.isCallExpression(node) && isForbiddenOutputExpression(node.expression, scopes)) {
      const position = source.getLineAndCharacterOfPosition(node.getStart(source));
      violations.push(`${fileName}:${position.line + 1}`);
    }
    ts.forEachChild(node, (child) => visit(child, scopes));
  }

  visit(source, []);
  return violations;
}

describe("direct output policy", () => {
  it("anchors every transitional exception to an existing entrypoint", () => {
    expect([...transitionalEntrypoints].filter((fileName) => !existsSync(fileName))).toEqual([]);
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
});
