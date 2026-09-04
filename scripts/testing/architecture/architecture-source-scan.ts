/**
 * @fileoverview Shared AST access-path, binding, and function-scope traversal for policy scans.
 * @module scripts/testing/architecture/architecture-source-scan
 *
 * @remarks
 * `scripts/testing/architecture/runtime-boundary-policy.test.ts` and
 * `scripts/testing/architecture/output-policy.test.ts` both walk production source with the same
 * lexical alias machinery. This module owns the single unioned implementation of it — object and
 * array binding patterns, property and property-name-like element access, with the parameter-root
 * policy left to the caller — so neither policy keeps a narrower private copy. Rule-specific
 * detection stays with the policy that owns it.
 */

import ts from "typescript";

/** Dotted access path for an expression, resolving parenthesized and const-aliased receivers. */
export type ArchitectureAccessPath = readonly string[];

/**
 * One lexical scope's const-alias bindings while walking a source file. A `null` binding is a
 * declared but opaque name: it shadows an outer alias without contributing a resolvable path.
 */
export interface ArchitectureAliasScope {
  /** Names declared directly in this scope, mapped to their resolved path when they have one. */
  readonly bindings: Map<string, ArchitectureAccessPath | null>;
  /** Enclosing lexical scope, absent only for the outermost scope. */
  readonly parent?: ArchitectureAliasScope;
}

function isPropertyNameLike(
  node: ts.PropertyName | ts.Expression,
): node is ts.Identifier | ts.StringLiteral | ts.NumericLiteral | ts.NoSubstitutionTemplateLiteral {
  return ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node);
}

/**
 * Resolves the dotted access path an expression names, following parenthesized, asserted, and
 * const-aliased receivers, property access, and property-name-like element access.
 *
 * @param node - Expression node to resolve.
 * @param scope - Innermost lexical scope the expression appears in.
 * @returns The resolved dotted path, or `null` when the expression names no static path.
 */
export function resolveArchitectureAccessPath(node: ts.Node, scope: ArchitectureAliasScope): ArchitectureAccessPath | null {
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isNonNullExpression(node)) {
    return resolveArchitectureAccessPath(node.expression, scope);
  }

  if (ts.isIdentifier(node)) {
    for (let current: ArchitectureAliasScope | undefined = scope; current !== undefined; current = current.parent) {
      if (current.bindings.has(node.text)) {
        return current.bindings.get(node.text) ?? null;
      }
    }

    return [node.text];
  }

  if (ts.isPropertyAccessExpression(node)) {
    const receiver = resolveArchitectureAccessPath(node.expression, scope);
    return receiver === null ? null : [...receiver, node.name.text];
  }

  if (ts.isElementAccessExpression(node) && isPropertyNameLike(node.argumentExpression)) {
    const receiver = resolveArchitectureAccessPath(node.expression, scope);
    return receiver === null ? null : [...receiver, node.argumentExpression.text];
  }

  return null;
}

/**
 * Declares every name a binding pattern introduces, deriving object-property and array-index paths
 * from the initializer's own path.
 *
 * @param name - Binding name or destructuring pattern being declared.
 * @param initializerPath - Resolved path of the initializer, or `null` when it has none.
 * @param scope - Scope the names are declared in.
 * @param options - Parameter-root policy, forwarded to every nested binding of the same pattern.
 */
export function declareArchitectureBindingNames(
  name: ts.BindingName,
  initializerPath: ArchitectureAccessPath | null,
  scope: ArchitectureAliasScope,
  options?: Readonly<{trackParameterRoots?: boolean}>,
): void {
  if (ts.isIdentifier(name)) {
    scope.bindings.set(name.text, initializerPath);
    return;
  }

  if (ts.isObjectBindingPattern(name)) {
    for (const element of name.elements) {
      let elementPath: ArchitectureAccessPath | null = null;
      if (element.dotDotDotToken === undefined && initializerPath !== null) {
        const propertyName = element.propertyName ?? (ts.isIdentifier(element.name) ? element.name : undefined);
        if (propertyName !== undefined && isPropertyNameLike(propertyName)) {
          elementPath = [...initializerPath, propertyName.text];
        }
      }

      declareArchitectureBindingNames(element.name, elementPath, scope, options);
    }

    return;
  }

  for (const [index, element] of name.elements.entries()) {
    if (ts.isOmittedExpression(element)) {
      continue;
    }

    const elementPath = element.dotDotDotToken === undefined && initializerPath !== null ? [...initializerPath, `${index}`] : null;
    declareArchitectureBindingNames(element.name, elementPath, scope, options);
  }
}

/**
 * Creates a function scope, binds its own name and every parameter, and visits its parameter
 * initializers and body inside that scope.
 *
 * @param node - Function-like declaration opening the scope.
 * @param scope - Enclosing lexical scope.
 * @param visit - The owning policy's traversal callback.
 * @param options - When `trackParameterRoots` is `true`, each parameter binds to a synthetic
 * `<parameter:index>` root so injected receivers stay distinguishable from ambient ones; otherwise
 * parameters are declared as opaque shadowing names.
 */
export function visitArchitectureFunctionScope(
  node: ts.FunctionLikeDeclaration,
  scope: ArchitectureAliasScope,
  visit: (node: ts.Node, scope: ArchitectureAliasScope) => void,
  options?: Readonly<{trackParameterRoots?: boolean}>,
): void {
  const functionScope: ArchitectureAliasScope = {bindings: new Map(), parent: scope};
  if (node.name !== undefined && ts.isIdentifier(node.name)) {
    functionScope.bindings.set(node.name.text, null);
  }

  for (const [index, parameter] of node.parameters.entries()) {
    const parameterRoot = options?.trackParameterRoots === true ? [`<parameter:${index}>`] : null;
    declareArchitectureBindingNames(parameter.name, parameterRoot, functionScope, options);
  }

  for (const parameter of node.parameters) {
    if (parameter.initializer !== undefined) {
      visit(parameter.initializer, functionScope);
    }
  }

  if (node.body !== undefined) {
    visit(node.body, functionScope);
  }
}
