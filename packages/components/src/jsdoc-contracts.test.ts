import path from "node:path";
import ts from "typescript";
import {beforeAll, describe, expect, it} from "vitest";

/**
 * Public-API documentation contracts (RFC 1002), checked with the TypeScript compiler from the `src/index.ts` exports:
 * every export has a summary, components carry an `@example`, hooks and utilities document every named parameter and
 * their return value, every package-declared prop/member is documented, `@default` tags agree with destructured
 * defaults, and every `{@link}` resolves.
 */
const packageDirectory = path.resolve(import.meta.dirname, "..");
const sourceDirectory = path.normalize(import.meta.dirname);
const entryFile = path.join(sourceDirectory, "index.ts");

let program: ts.Program;
let checker: ts.TypeChecker;
let publicSymbols: ReadonlyArray<readonly [string, ts.Symbol]>;

const isPackageSource = (node: ts.Node): boolean => {
  const file = path.normalize(node.getSourceFile().fileName);
  return file.startsWith(sourceDirectory) && !/\.(?:test|spec|stories)\.tsx?$/u.test(file);
};
const locate = (node: ts.Node): string => {
  const source = node.getSourceFile();
  const {line} = source.getLineAndCharacterOfPosition(node.getStart(source));
  return `${path.relative(sourceDirectory, source.fileName).replaceAll("\\", "/")}:${line + 1}`;
};
const tagText = (tag: ts.JSDocTagInfo): string => ts.displayPartsToString(tag.text).trim();
/** `export const {X} = Dependency;` re-exports keep their JSDoc on the statement, which the checker does not attach to `X`. */
const reexportDeclarationOf = (symbol: ts.Symbol): ts.VariableDeclaration | undefined => {
  const declaration = symbol.declarations?.find(isPackageSource);
  return declaration && ts.isBindingElement(declaration) && ts.isVariableDeclaration(declaration.parent.parent)
    ? declaration.parent.parent
    : undefined;
};
const summaryOf = (symbol: ts.Symbol): string => {
  const own = ts.displayPartsToString(symbol.getDocumentationComment(checker)).trim();
  const holder = own ? undefined : reexportDeclarationOf(symbol);
  if (!holder) return own;
  return ts
    .getJSDocCommentsAndTags(holder)
    .filter((doc) => ts.isJSDoc(doc))
    .map((doc) => ts.getTextOfJSDocComment(doc.comment) ?? "")
    .join(" ")
    .trim();
};
const tagsOf = (symbol: ts.Symbol): readonly ts.JSDocTagInfo[] => symbol.getJsDocTags(checker);
const resolve = (symbol: ts.Symbol): ts.Symbol => (symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol);
const packageDeclarations = (symbol: ts.Symbol): ts.Declaration[] => (symbol.declarations ?? []).filter(isPackageSource);
const callSignatures = (symbol: ts.Symbol): readonly ts.Signature[] => {
  const declaration = symbol.valueDeclaration;
  if (!declaration) return [];
  return checker.getTypeOfSymbolAtLocation(symbol, declaration).getCallSignatures();
};
const isComponentName = (name: string): boolean => /^[A-Z]/u.test(name);

/** Function-like declarations whose own parameters are the public call contract. */
const functionDeclarationsOf = (symbol: ts.Symbol): ts.SignatureDeclaration[] =>
  packageDeclarations(symbol).flatMap((declaration): ts.SignatureDeclaration[] => {
    if (ts.isFunctionDeclaration(declaration)) return [declaration];
    if (ts.isVariableDeclaration(declaration) && declaration.initializer) {
      const {initializer} = declaration;
      if (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) return [initializer];
    }
    return [];
  });

/** Normalizes a default for comparison: quotes/backticks, whitespace and trailing commas are presentation, not value. */
const normalizeDefault = (text: string): string => text.replaceAll(/[`'"\s]/gu, "").replaceAll(/,(?=[\]}])/gu, "");
/** Unwraps `as const`, `satisfies`, parentheses and `Object.freeze(...)` around a default value. */
const unwrapDefault = (expression: ts.Expression): ts.Expression => {
  if (ts.isAsExpression(expression) || ts.isSatisfiesExpression(expression) || ts.isParenthesizedExpression(expression)) {
    return unwrapDefault(expression.expression);
  }
  if (ts.isCallExpression(expression) && expression.expression.getText() === "Object.freeze" && expression.arguments[0]) {
    return unwrapDefault(expression.arguments[0]);
  }
  return expression;
};
/** A default that names a module constant is compared by that constant's initializer. */
const defaultValueText = (initializer: ts.Expression): string => {
  const expression = unwrapDefault(initializer);
  if (ts.isIdentifier(expression)) {
    const declaration = checker.getSymbolAtLocation(expression)?.valueDeclaration;
    if (declaration && ts.isVariableDeclaration(declaration) && declaration.initializer) return defaultValueText(declaration.initializer);
  }
  return expression.getText();
};

beforeAll(() => {
  const config = ts.readConfigFile(path.join(packageDirectory, "tsconfig.json"), ts.sys.readFile);
  if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"));
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, packageDirectory);
  program = ts.createProgram([entryFile], {...parsed.options, noEmit: true, incremental: false, declaration: false});
  checker = program.getTypeChecker();
  const entry = program.getSourceFile(entryFile);
  const moduleSymbol = entry && checker.getSymbolAtLocation(entry);
  if (!moduleSymbol) throw new Error("src/index.ts did not resolve to a module.");
  publicSymbols = checker
    .getExportsOfModule(moduleSymbol)
    .map((exported): readonly [string, ts.Symbol] => [exported.getName(), resolve(exported)])
    .filter(([, symbol]) => packageDeclarations(symbol).length > 0);
}, 120_000);

describe("public API JSDoc contracts", () => {
  it("resolves a meaningful public surface", () => {
    expect(publicSymbols.length).toBeGreaterThan(300);
    expect(publicSymbols.map(([name]) => name)).toEqual(expect.arrayContaining(["Button", "useControllableState", "cn"]));
  });

  it("gives every public export a summary", () => {
    const missing = publicSymbols
      .filter(([, symbol]) => summaryOf(symbol).length === 0)
      .map(([name, symbol]) => `${locate(packageDeclarations(symbol)[0]!)} ${name}`);
    expect(missing).toEqual([]);
  });

  it("gives every public component an @example", () => {
    // Dependency re-exports (`export const {AreaChart} = RechartsPrimitive`) link to the upstream API instead.
    const missing = publicSymbols
      .filter(([name, symbol]) => isComponentName(name) && callSignatures(symbol).length > 0 && !reexportDeclarationOf(symbol))
      .filter(([, symbol]) => !tagsOf(symbol).some((tag) => tag.name === "example"))
      .map(([name, symbol]) => `${locate(packageDeclarations(symbol)[0]!)} ${name}`);
    expect(missing).toEqual([]);
  });

  it("documents every named parameter and the return value of public hooks and utilities", () => {
    const missing: string[] = [];
    for (const [name, symbol] of publicSymbols) {
      if (isComponentName(name)) continue;
      const declarations = functionDeclarationsOf(symbol);
      if (declarations.length === 0) continue;
      const tags = tagsOf(symbol);
      const documented = new Set(
        tags.filter((tag) => tag.name === "param").map((tag) => tag.text?.find((part) => part.kind === "parameterName")?.text),
      );
      for (const declaration of declarations) {
        for (const parameter of declaration.parameters) {
          if (ts.isIdentifier(parameter.name) && !documented.has(parameter.name.text)) {
            missing.push(`${locate(parameter)} ${name} @param ${parameter.name.text}`);
          }
        }
        const signature = checker.getSignatureFromDeclaration(declaration);
        const returns = signature && checker.getReturnTypeOfSignature(signature);
        const returnsValue = returns && !(returns.flags & (ts.TypeFlags.Void | ts.TypeFlags.Undefined | ts.TypeFlags.Never));
        if (returnsValue && !tags.some((tag) => tag.name === "returns" || tag.name === "return")) {
          missing.push(`${locate(declaration)} ${name} @returns`);
        }
      }
    }
    expect([...new Set(missing)]).toEqual([]);
  });

  it("documents every package-declared prop and member of the public types", () => {
    const missing = new Map<ts.Node, string>();
    const checkType = (owner: string, type: ts.Type): void => {
      for (const property of checker.getPropertiesOfType(type)) {
        const declarations = packageDeclarations(property);
        // Members inherited from React, the DOM or Base UI are documented upstream.
        if (declarations.length === 0 || declarations.length !== (property.declarations?.length ?? 0)) continue;
        const declaration = declarations[0]!;
        if (missing.has(declaration) || summaryOf(property).length > 0) continue;
        missing.set(declaration, `${locate(declaration)} ${owner}.${property.getName()}`);
      }
    };
    const visit = (name: string, symbol: ts.Symbol): void => {
      if (symbol.flags & (ts.SymbolFlags.Interface | ts.SymbolFlags.TypeAlias)) {
        checkType(name, checker.getDeclaredTypeOfSymbol(symbol));
      }
      const declaration = functionDeclarationsOf(symbol)[0];
      const props = isComponentName(name) ? declaration?.parameters[0] : undefined;
      if (props) checkType(name, checker.getTypeAtLocation(props));
      if (symbol.flags & ts.SymbolFlags.Namespace) {
        for (const member of checker.getExportsOfModule(symbol)) visit(`${name}.${member.getName()}`, resolve(member));
      }
    };
    for (const [name, symbol] of publicSymbols) visit(name, symbol);
    expect([...missing.values()].sort()).toEqual([]);
  });

  it("keeps @default tags equal to the destructured component defaults", () => {
    const mismatched: string[] = [];
    for (const [name, symbol] of publicSymbols) {
      if (!isComponentName(name)) continue;
      const props = functionDeclarationsOf(symbol)[0]?.parameters[0];
      if (!props || !ts.isObjectBindingPattern(props.name)) continue;
      const propsType = checker.getTypeAtLocation(props);
      for (const element of props.name.elements) {
        if (!element.initializer || element.dotDotDotToken) continue;
        const key = (element.propertyName ?? element.name).getText();
        const property = propsType.getProperty(key);
        const tag = property?.getJsDocTags(checker).find((candidate) => candidate.name === "default");
        if (!tag) continue;
        if (normalizeDefault(tagText(tag)) !== normalizeDefault(defaultValueText(element.initializer))) {
          mismatched.push(`${locate(element)} ${name}.${key}: @default ${tagText(tag)} ≠ ${defaultValueText(element.initializer)}`);
        }
      }
    }
    expect(mismatched).toEqual([]);
  });

  it("resolves every {@link} target in production JSDoc", () => {
    const unresolved: string[] = [];
    const seen = new Set<ts.Node>();
    const inspectLink = (link: ts.JSDocLink | ts.JSDocLinkCode | ts.JSDocLinkPlain): void => {
      if (!link.name) return;
      const target = link.name.getText();
      if (/^https?$/u.test(target) && link.text.startsWith("://")) return;
      if (!checker.getSymbolAtLocation(link.name)) unresolved.push(`${locate(link)} {@link ${target}}`);
    };
    const visitDoc = (node: ts.Node): void => {
      if (ts.isJSDocLink(node) || ts.isJSDocLinkCode(node) || ts.isJSDocLinkPlain(node)) inspectLink(node);
      ts.forEachChild(node, visitDoc);
    };
    for (const source of program.getSourceFiles()) {
      if (!isPackageSource(source)) continue;
      const walk = (node: ts.Node): void => {
        for (const doc of ts.getJSDocCommentsAndTags(node)) {
          if (seen.has(doc)) continue;
          seen.add(doc);
          visitDoc(doc);
        }
        ts.forEachChild(node, walk);
      };
      walk(source);
    }
    expect([...new Set(unresolved)]).toEqual([]);
  });
});
