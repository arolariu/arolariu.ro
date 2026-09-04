// @vitest-environment node
/**
 * @fileoverview AST policy tests for direct monorepository script output boundaries.
 * @module scripts/testing/architecture/output-policy.test
 */

import {existsSync, readFileSync} from "node:fs";
import ts from "typescript";
import {describe, expect, it} from "vitest";

import {
  type ArchitectureAliasScope,
  declareArchitectureBindingNames,
  resolveArchitectureAccessPath,
  visitArchitectureFunctionScope,
} from "./architecture-source-scan.ts";
import {discoverScriptSourceFiles, isScriptTestFile} from "./script-source-files.ts";

const transitionalEntrypoints = new Set<string>();
const interactiveTerminalAdapters = new Set(["scripts/adapters/node/node-prompt-provider.ts"]);

type OutputExpressionPredicate = (expression: ts.Expression, scope: ArchitectureAliasScope) => boolean;

/**
 * Production script source files scanned by the output-boundary policy.
 *
 * @remarks
 * This intentionally continues scanning `scripts/vitest.config.ts`; the runtime-graph definition of
 * production must not silently narrow this direct output policy. Only the non-production
 * `scripts/testing/**` architecture and compatibility support is excluded.
 */
const outputPolicySourcePaths = discoverScriptSourceFiles().filter(
  (sourcePath) =>
    !isScriptTestFile(sourcePath)
    && !sourcePath.startsWith("scripts/testing/")
    && sourcePath !== "scripts/adapters/node/node-terminal-sink.ts",
);

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

function isForbiddenOutputExpression(expression: ts.Expression, scope: ArchitectureAliasScope): boolean {
  const path = resolveArchitectureAccessPath(expression, scope);
  if (path === null) {
    return false;
  }

  if (path.length === 2 && path[0] === "console") {
    return true;
  }

  return path.length === 3 && path[0] === "process" && (path[1] === "stdout" || path[1] === "stderr") && path[2] === "write";
}

function isPromptTerminalOutputExpression(expression: ts.Expression, scope: ArchitectureAliasScope): boolean {
  const path = resolveArchitectureAccessPath(expression, scope);
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

  function visit(node: ts.Node, scope: ArchitectureAliasScope): void {
    if (ts.isSourceFile(node) || ts.isBlock(node)) {
      const blockScope: ArchitectureAliasScope = {bindings: new Map(), parent: scope};
      for (const statement of node.statements) {
        visit(statement, blockScope);
      }
      return;
    }

    if (ts.isVariableDeclarationList(node)) {
      const isConstant = (node.flags & ts.NodeFlags.Const) !== 0;
      for (const declaration of node.declarations) {
        if (declaration.initializer !== undefined) {
          visit(declaration.initializer, scope);
        }
        const accessPath =
          isConstant && declaration.initializer !== undefined ? resolveArchitectureAccessPath(declaration.initializer, scope) : null;
        declareArchitectureBindingNames(declaration.name, accessPath, scope);
      }
      return;
    }

    if (ts.isFunctionDeclaration(node)) {
      if (node.name !== undefined) {
        scope.bindings.set(node.name.text, null);
      }
      visitArchitectureFunctionScope(node, scope, visit, {trackParameterRoots});
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
      visitArchitectureFunctionScope(node, scope, visit, {trackParameterRoots});
      return;
    }

    if (ts.isClassDeclaration(node) && node.name !== undefined) {
      scope.bindings.set(node.name.text, null);
    }

    if (ts.isCallExpression(node) && predicate(node.expression, scope)) {
      const position = source.getLineAndCharacterOfPosition(node.getStart(source));
      violations.push(`${fileName}:${position.line + 1}`);
    }
    ts.forEachChild(node, (child) => visit(child, scope));
  }

  visit(source, {bindings: new Map()});
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

  it("allows raw streams only for architecture JSON reporters", () => {
    const architectureReportPattern = "scripts/testing/architecture/report-*.ts";
    const outputIgnores = readConfigStringArrayProperty("eslint.config.ts", "toolingOutputConfig", "ignores");
    const promptIgnores = readConfigStringArrayProperty("eslint.config.ts", "toolingPromptOutputConfig", "ignores");
    const architectureReportFiles = readConfigStringArrayProperty("eslint.config.ts", "toolingArchitectureReportConfig", "files");

    expect(outputIgnores).toContain(architectureReportPattern);
    expect(promptIgnores).toContain(architectureReportPattern);
    expect(architectureReportFiles).toEqual([architectureReportPattern]);
  });

  it("keeps process restrictions when the prompt ESLint policy is applied later", () => {
    const outputMessages = readRestrictedSyntaxMessages("eslint.config.ts", "toolingOutputConfig");
    const promptMessages = readRestrictedSyntaxMessages("eslint.config.ts", "toolingPromptOutputConfig");
    const promptIgnores = readConfigStringArrayProperty("eslint.config.ts", "toolingPromptOutputConfig", "ignores");

    expect(outputMessages).toHaveLength(1);
    expect(promptMessages).toEqual(
      expect.arrayContaining([
        ...outputMessages,
        "Interactive terminal output is owned exclusively by scripts/adapters/node/node-prompt-provider.ts.",
      ]),
    );
    expect(promptIgnores).toContain("scripts/adapters/node/node-prompt-provider.ts");
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

  it("routes production script output through the terminal presenter outside transitional entrypoints", () => {
    const violations = outputPolicySourcePaths
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

    const violations = outputPolicySourcePaths
      .filter((fileName) => !interactiveTerminalAdapters.has(fileName))
      .flatMap((fileName) => findPromptTerminalOutputCalls(readFileSync(fileName, "utf8"), fileName));

    expect(violations).toEqual([]);
  });
});
