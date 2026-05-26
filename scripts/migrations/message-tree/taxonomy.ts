import {flattenMessages, isLowerCamelCase, localeNames, readMessageTree, type LocaleName, type MessageTree} from "./treeUtils.ts";

export const allowedTopLevelBuckets = [
  "app",
  "pages",
  "sections",
  "components",
  "dialogs",
  "cards",
  "forms",
  "tables",
  "toasts",
  "emails",
  "shared",
] as const;

export type TopLevelBucket = (typeof allowedTopLevelBuckets)[number];

export type ValidationIssue = Readonly<{
  locale: LocaleName;
  path: string;
  message: string;
}>;

export function validateMessageTaxonomy(locale: LocaleName, tree: MessageTree): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const flat = flattenMessages(tree);

  for (const messagePath of flat.keys()) {
    const segments = messagePath.split(".");
    const topLevel = segments[0] ?? "";
    if (!allowedTopLevelBuckets.includes(topLevel as TopLevelBucket)) {
      issues.push({locale, path: messagePath, message: `Top-level bucket "${topLevel}" is not allowed.`});
    }

    for (const segment of segments) {
      if (segment.includes("IMS--")) {
        issues.push({locale, path: messagePath, message: `Segment "${segment}" contains the retired IMS-- prefix.`});
      }
      if (!isLowerCamelCase(segment)) {
        issues.push({locale, path: messagePath, message: `Segment "${segment}" must be lower camelCase.`});
      }
    }

    const value = flat.get(messagePath);
    if (locale === "en" && value?.trim().length === 0) {
      issues.push({locale, path: messagePath, message: "English source messages must not be empty."});
    }
  }

  return issues;
}

export function validateLocaleParity(): ValidationIssue[] {
  const [baseLocale, ...targetLocales] = localeNames;
  const baseFlat = flattenMessages(readMessageTree(baseLocale));
  const issues: ValidationIssue[] = [];

  for (const locale of targetLocales) {
    const currentFlat = flattenMessages(readMessageTree(locale));
    for (const key of baseFlat.keys()) {
      if (!currentFlat.has(key)) {
        issues.push({locale, path: key, message: "Missing key from target locale."});
      }
    }
    for (const key of currentFlat.keys()) {
      if (!baseFlat.has(key)) {
        issues.push({locale, path: key, message: "Extra key not present in English source locale."});
      }
    }
  }

  return issues;
}

export function validateAllMessages(): ValidationIssue[] {
  return [
    ...localeNames.flatMap((locale) => validateMessageTaxonomy(locale, readMessageTree(locale))),
    ...validateLocaleParity(),
  ];
}
