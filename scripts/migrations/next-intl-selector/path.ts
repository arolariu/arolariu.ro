const identifierPattern = /^[A-Za-z_$][\w$]*$/u;

export function toSelectorExpression(path: string): string {
  const segments = path.split(".").filter((segment) => segment.length > 0);
  if (segments.length === 0) {
    throw new Error("Cannot convert an empty translation path to a selector.");
  }

  return `(m) => ${segments.reduce((expression, segment) => `${expression}${toPropertyAccess(segment)}`, "m")}`;
}

export function joinTranslationPath(namespace: string | undefined, key: string): string {
  if (!namespace || namespace.length === 0) {
    return key;
  }

  if (key.length === 0) {
    return namespace;
  }

  return `${namespace}.${key}`;
}

export function toPropertyAccess(segment: string): string {
  if (identifierPattern.test(segment)) {
    return `.${segment}`;
  }

  return `[${JSON.stringify(segment)}]`;
}
