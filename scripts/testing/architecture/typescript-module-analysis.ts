/**
 * @fileoverview Reusable TypeScript AST module-reference and command-entrypoint analysis.
 * @module scripts/testing/architecture/typescript-module-analysis
 *
 * @remarks
 * This module is the single authoritative TypeScript Compiler API scan for static imports,
 * re-exports, literal dynamic imports, and command-entrypoint shape. It was extracted from
 * `scripts/common/runtime-boundary.test.ts` so `scripts/testing/architecture/script-source-graph.ts`
 * can reuse the exact same AST evidence to build the repository's local source-reachability graph
 * instead of maintaining a second, drifting implementation.
 */

import ts from "typescript";

/** Sentinel imported-name value representing access to the complete module namespace. */
export const completeModuleNamespaceImportName = "*";

/** The syntactic shape a module reference took at its use site. */
type TypeScriptModuleReferenceKind = "import" | "re-export" | "dynamic-import";

/** One statically resolvable module reference and the names it binds. */
export interface TypeScriptModuleReferenceDefinition {
  /** The literal module specifier text. */
  readonly specifier: string;
  /** Imported names; {@link completeModuleNamespaceImportName} represents the whole namespace. */
  readonly importedNames: readonly string[];
  /** Whether the reference is an import, a re-export, or a literal dynamic import. */
  readonly referenceKind: TypeScriptModuleReferenceKind;
  /** Whether every binding the reference introduces is erased at compile time. */
  readonly typeOnly: boolean;
}

/** Complete static module-reference evidence collected from one source file. */
export interface TypeScriptModuleAnalysisResult {
  /** Every statically resolvable import, re-export, and literal dynamic import, in source order. */
  readonly references: readonly TypeScriptModuleReferenceDefinition[];
  /** One-based source line numbers of every non-literal (dynamic path) `import()` call. */
  readonly nonLiteralDynamicImportLines: readonly number[];
}

/** Structural facts a direct entrypoint must satisfy to stay inside the declarative contract. */
export interface CommandEntrypointAnalysisResult {
  /** Whether the module exports a `MonorepoCommand`-typed singleton. */
  readonly exportsCommandSingleton: boolean;
  /** Whether the module hands direct-entry detection to `runIfMain(import.meta.url)`. */
  readonly usesSharedRunIfMain: boolean;
}

/**
 * Collects every statically resolvable module reference of one source file: static imports,
 * re-exports, and literal dynamic imports, plus the line numbers of every dynamic import whose
 * argument is not a string literal.
 *
 * @param sourceText - Source text to parse.
 * @param fileName - Virtual file name used to select the TypeScript/TSX/JSX script kind.
 * @returns Static module references in source order and non-literal dynamic import line numbers.
 */
export function collectTypeScriptModuleReferences(
  sourceText: string,
  fileName: string = "module.ts",
): TypeScriptModuleAnalysisResult {
  const scriptKind = fileName.endsWith(".tsx")
    ? ts.ScriptKind.TSX
    : fileName.endsWith(".jsx")
      ? ts.ScriptKind.JSX
      : ts.ScriptKind.TS;
  const source = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true, scriptKind);
  const references: TypeScriptModuleReferenceDefinition[] = [];
  const nonLiteralDynamicImportLines: number[] = [];

  const lineOf = (node: ts.Node): number => source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
  const normalizeImportedName = (name: string): string =>
    name === "default" ? completeModuleNamespaceImportName : name;

  function visit(node: ts.Node): void {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const clause = node.importClause;
      const bindings = clause?.namedBindings;
      const importedNames = new Set<string>();
      if (clause?.name !== undefined || (bindings !== undefined && ts.isNamespaceImport(bindings))) {
        importedNames.add(completeModuleNamespaceImportName);
      }
      if (bindings !== undefined && ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) {
          importedNames.add(normalizeImportedName((element.propertyName ?? element.name).text));
        }
      }
      const typeOnly =
        clause?.isTypeOnly === true
        || (clause?.name === undefined
          && bindings !== undefined
          && ts.isNamedImports(bindings)
          && bindings.elements.length > 0
          && bindings.elements.every((element) => element.isTypeOnly));
      references.push({
        specifier: node.moduleSpecifier.text,
        importedNames: [...importedNames],
        referenceKind: "import",
        typeOnly,
      });
    }

    if (ts.isExportDeclaration(node) && node.moduleSpecifier !== undefined && ts.isStringLiteral(node.moduleSpecifier)) {
      const clause = node.exportClause;
      const importedNames =
        clause !== undefined && ts.isNamedExports(clause)
          ? clause.elements.map((element) => normalizeImportedName((element.propertyName ?? element.name).text))
          : [completeModuleNamespaceImportName];
      references.push({
        specifier: node.moduleSpecifier.text,
        importedNames,
        referenceKind: "re-export",
        typeOnly:
          node.isTypeOnly
          || (clause !== undefined
            && ts.isNamedExports(clause)
            && clause.elements.length > 0
            && clause.elements.every((element) => element.isTypeOnly)),
      });
    }

    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const argument = node.arguments[0];
      if (argument !== undefined && (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument))) {
        references.push({
          specifier: argument.text,
          importedNames: [completeModuleNamespaceImportName],
          referenceKind: "dynamic-import",
          typeOnly: false,
        });
      } else {
        nonLiteralDynamicImportLines.push(lineOf(node));
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(source);
  return {references, nonLiteralDynamicImportLines};
}

/**
 * Determines whether an expression is the `import.meta.url` property access.
 *
 * @param argument - Call-expression argument to test.
 * @returns `true` when the argument is exactly `import.meta.url`.
 */
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
 * @param fileName - Virtual file name used when constructing the source file.
 * @returns Whether the module exports a command singleton and uses shared direct-entry detection.
 */
export function analyzeCommandEntrypointSource(
  sourceText: string,
  fileName: string = "entrypoint.ts",
): CommandEntrypointAnalysisResult {
  const source = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let exportsCommandSingleton = false;
  let usesSharedRunIfMain = false;

  for (const statement of source.statements) {
    if (
      !ts.isVariableStatement(statement)
      || statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) !== true
    ) {
      continue;
    }

    for (const declaration of statement.declarationList.declarations) {
      const {type} = declaration;
      if (
        type !== undefined
        && ts.isTypeReferenceNode(type)
        && ts.isIdentifier(type.typeName)
        && type.typeName.text === "MonorepoCommand"
      ) {
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
