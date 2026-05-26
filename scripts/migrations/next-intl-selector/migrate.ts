import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import {joinTranslationPath, toSelectorExpression} from "./path.ts";
import {
  legacyClientModule,
  legacyServerModule,
  selectorClientModule,
  selectorServerModule,
  skippedPathSegments,
  translatorMethods,
  type FileMigrationState,
  type MigrationReport,
  type TextEdit,
} from "./types.ts";

const workspaceRoot = process.cwd();
const websiteRoot = path.join(workspaceRoot, "sites", "arolariu.ro");
const isWriteMode = process.argv.includes("--write");

function isCandidateFile(fileName: string): boolean {
  if (!/\.(tsx?|jsx?)$/u.test(fileName)) return false;
  return skippedPathSegments.every((segment) => !fileName.includes(segment));
}

function collectFiles(directory: string): string[] {
  const entries = fs.readdirSync(directory, {withFileTypes: true});
  return entries.flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectFiles(fullPath);
    }

    return isCandidateFile(fullPath) ? [fullPath] : [];
  });
}

function applyEdits(source: string, edits: readonly TextEdit[]): string {
  return [...edits]
    .sort((left, right) => right.start - left.start)
    .reduce((current, edit) => `${current.slice(0, edit.start)}${edit.replacement}${current.slice(edit.end)}`, source);
}

function getStringLiteral(node: ts.Node): string | undefined {
  return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) ? node.text : undefined;
}

function getImportModule(node: ts.ImportDeclaration): string | undefined {
  return ts.isStringLiteral(node.moduleSpecifier) ? node.moduleSpecifier.text : undefined;
}

function hasNamedImport(node: ts.ImportDeclaration, name: string): boolean {
  const bindings = node.importClause?.namedBindings;
  return ts.isNamedImports(bindings) && bindings.elements.some((element) => element.name.text === name);
}

function formatImportSpecifier(importDeclaration: ts.ImportDeclaration, specifier: ts.ImportSpecifier): string {
  const isTypeOnly = importDeclaration.importClause?.isTypeOnly || specifier.isTypeOnly;
  const propertyName = specifier.propertyName ? `${specifier.propertyName.text} as ` : "";
  return `${isTypeOnly ? "type " : ""}${propertyName}${specifier.name.text}`;
}

function formatNamedImport(moduleName: string, specifiers: readonly string[], wasTypeOnlyImport: boolean): string {
  const normalizedSpecifiers = specifiers.map((specifier) => (wasTypeOnlyImport && specifier.startsWith("type ") ? specifier.slice("type ".length) : specifier));
  return `import ${wasTypeOnlyImport ? "type " : ""}{${normalizedSpecifiers.join(", ")}} from ${JSON.stringify(moduleName)};`;
}

function rewriteSplitImport(
  sourceFile: ts.SourceFile,
  state: FileMigrationState,
  statement: ts.ImportDeclaration,
  selectorNames: ReadonlySet<string>,
  selectorModuleName: string,
): boolean {
  const bindings = statement.importClause?.namedBindings;
  if (!ts.isNamedImports(bindings)) return false;

  const selectorSpecifiers: string[] = [];
  const legacySpecifiers: string[] = [];
  for (const specifier of bindings.elements) {
    const formattedSpecifier = formatImportSpecifier(statement, specifier);
    if (selectorNames.has(specifier.name.text)) {
      selectorSpecifiers.push(formattedSpecifier);
    } else {
      legacySpecifiers.push(formattedSpecifier);
    }
  }

  if (selectorSpecifiers.length === 0) return false;

  const replacementParts = [
    legacySpecifiers.length > 0 ? formatNamedImport(getImportModule(statement)!, legacySpecifiers, statement.importClause?.isTypeOnly === true) : undefined,
    formatNamedImport(selectorModuleName, selectorSpecifiers, statement.importClause?.isTypeOnly === true && legacySpecifiers.length === 0),
  ].filter((part): part is string => part !== undefined);
  addEdit(state, statement.getStart(sourceFile), statement.getEnd(), replacementParts.join("\n"));
  return true;
}

function createState(sourceFile: ts.SourceFile): FileMigrationState {
  return {
    fileName: sourceFile.fileName,
    namespacesByTranslator: new Map<string, string | undefined>(),
    edits: [],
    literalCallsChanged: 0,
    namespaceFactoriesChanged: 0,
    dynamicCallsSkipped: [],
  };
}

function addEdit(state: FileMigrationState, start: number, end: number, replacement: string): void {
  state.edits.push({start, end, replacement});
}

function rewriteTranslatorImports(sourceFile: ts.SourceFile, state: FileMigrationState): void {
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const moduleName = getImportModule(statement);
    if (moduleName === legacyClientModule && (hasNamedImport(statement, "useTranslations") || hasNamedImport(statement, "createTranslator"))) {
      rewriteSplitImport(sourceFile, state, statement, new Set(["useTranslations", "createTranslator"]), selectorClientModule);
    }

    if (moduleName === legacyServerModule && hasNamedImport(statement, "getTranslations")) {
      rewriteSplitImport(sourceFile, state, statement, new Set(["getTranslations"]), selectorServerModule);
    }
  }
}

function getCalledName(expression: ts.Expression): {baseName: string; methodName: string} | undefined {
  if (ts.isIdentifier(expression)) {
    return {baseName: expression.text, methodName: ""};
  }

  if (ts.isPropertyAccessExpression(expression) && ts.isIdentifier(expression.expression)) {
    return {baseName: expression.expression.text, methodName: expression.name.text};
  }

  return undefined;
}

function recordTranslatorFactory(sourceFile: ts.SourceFile, state: FileMigrationState, node: ts.VariableDeclaration): void {
  if (!node.initializer || !ts.isIdentifier(node.name)) return;
  const callExpression = ts.isAwaitExpression(node.initializer) && ts.isCallExpression(node.initializer.expression)
    ? node.initializer.expression
    : ts.isCallExpression(node.initializer)
      ? node.initializer
      : undefined;
  if (!callExpression) return;
  const expression = callExpression.expression;
  if (!ts.isIdentifier(expression)) return;
  if (expression.text !== "useTranslations" && expression.text !== "getTranslations") return;

  const namespace = callExpression.arguments.length > 0 ? getStringLiteral(callExpression.arguments[0]!) : undefined;
  state.namespacesByTranslator.set(node.name.text, namespace);
  if (namespace !== undefined) {
    const openParen = callExpression.expression.getEnd();
    const closeParen = callExpression.getEnd();
    addEdit(state, openParen, closeParen, "()");
    state.namespaceFactoriesChanged += 1;
  }
}

function rewriteTranslatorCall(sourceFile: ts.SourceFile, state: FileMigrationState, node: ts.CallExpression): void {
  const called = getCalledName(node.expression);
  if (!called || !translatorMethods.has(called.methodName)) return;
  if (!state.namespacesByTranslator.has(called.baseName)) return;
  const firstArg = node.arguments[0];
  if (!firstArg) return;

  const key = getStringLiteral(firstArg);
  if (key === undefined) {
    state.dynamicCallsSkipped.push(
      `${path.relative(workspaceRoot, sourceFile.fileName)}:${sourceFile.getLineAndCharacterOfPosition(firstArg.getStart()).line + 1}`,
    );
    return;
  }

  const namespace = state.namespacesByTranslator.get(called.baseName);
  const fullPath = joinTranslationPath(namespace, key);
  addEdit(state, firstArg.getStart(sourceFile), firstArg.getEnd(), toSelectorExpression(fullPath));
  state.literalCallsChanged += 1;
}

function visit(sourceFile: ts.SourceFile, state: FileMigrationState, node: ts.Node): void {
  if (ts.isVariableDeclaration(node)) {
    recordTranslatorFactory(sourceFile, state, node);
  }

  if (ts.isCallExpression(node)) {
    rewriteTranslatorCall(sourceFile, state, node);
  }

  ts.forEachChild(node, (child) => visit(sourceFile, state, child));
}

function migrateFile(fileName: string): FileMigrationState {
  const source = fs.readFileSync(fileName, "utf8");
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const state = createState(sourceFile);
  rewriteTranslatorImports(sourceFile, state);
  visit(sourceFile, state, sourceFile);

  if (isWriteMode && state.edits.length > 0) {
    fs.writeFileSync(fileName, applyEdits(source, state.edits));
  }

  return state;
}

const states = collectFiles(websiteRoot).map(migrateFile);
const report: MigrationReport = {
  filesVisited: states.length,
  filesChanged: states.filter((state) => state.edits.length > 0).length,
  literalCallsChanged: states.reduce((total, state) => total + state.literalCallsChanged, 0),
  namespaceFactoriesChanged: states.reduce((total, state) => total + state.namespaceFactoriesChanged, 0),
  dynamicCallsSkipped: states.flatMap((state) => state.dynamicCallsSkipped),
};

console.log(JSON.stringify(report, null, 2));
