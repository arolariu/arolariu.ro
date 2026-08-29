// @vitest-environment node
/**
 * @fileoverview AST policy tests for direct monorepository script output.
 * @module scripts.common.output-policy.test
 */

import {readFileSync} from "node:fs";
import ts from "typescript";
import {describe, expect, it} from "vitest";

const guardedFiles = ["scripts/format.ts", "scripts/lint.ts"] as const;

function getAccessPath(expression: ts.Expression): readonly string[] | null {
  if (ts.isIdentifier(expression)) {
    return [expression.text];
  }

  if (ts.isPropertyAccessExpression(expression)) {
    const receiver = getAccessPath(expression.expression);
    return receiver === null ? null : [...receiver, expression.name.text];
  }

  if (ts.isElementAccessExpression(expression) && ts.isStringLiteral(expression.argumentExpression)) {
    const receiver = getAccessPath(expression.expression);
    return receiver === null ? null : [...receiver, expression.argumentExpression.text];
  }

  return null;
}

function isForbiddenOutputExpression(expression: ts.Expression): boolean {
  const path = getAccessPath(expression);
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

  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node) && isForbiddenOutputExpression(node.expression)) {
      const position = source.getLineAndCharacterOfPosition(node.getStart(source));
      violations.push(`${fileName}:${position.line + 1}`);
    }
    ts.forEachChild(node, visit);
  }

  visit(source);
  return violations;
}

describe("direct output policy", () => {
  it("inspects executable calls without matching comments or strings", () => {
    const source = [
      "// console.log('comment')",
      "const example = \"process.stderr.write('string')\";",
      "console.log('output');",
      "process['stderr'].write('error');",
    ].join("\n");

    expect(findForbiddenOutputCalls(source, "fixture.ts")).toEqual(["fixture.ts:3", "fixture.ts:4"]);
  });

  it("routes guarded format and lint output through the logger", () => {
    const violations = guardedFiles.flatMap((fileName) => findForbiddenOutputCalls(readFileSync(fileName, "utf8"), fileName));

    expect(violations).toEqual([]);
  });
});
