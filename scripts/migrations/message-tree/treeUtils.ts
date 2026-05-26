import fs from "node:fs";
import path from "node:path";

export type MessageLeaf = string;
export type MessageTree = {
  readonly [key: string]: MessageLeaf | MessageTree;
};

export type FlatMessages = ReadonlyMap<string, MessageLeaf>;

export const localeNames = ["en", "ro", "fr"] as const;
export type LocaleName = (typeof localeNames)[number];

export function getRepositoryRoot(startDirectory: string = process.cwd()): string {
  let currentDirectory = startDirectory;
  while (!fs.existsSync(path.join(currentDirectory, "package.json")) || !fs.existsSync(path.join(currentDirectory, "sites", "arolariu.ro"))) {
    const parentDirectory = path.dirname(currentDirectory);
    if (parentDirectory === currentDirectory) {
      throw new Error("Could not locate repository root.");
    }

    currentDirectory = parentDirectory;
  }

  return currentDirectory;
}

export function getMessagesDirectory(repositoryRoot: string = getRepositoryRoot()): string {
  return path.join(repositoryRoot, "sites", "arolariu.ro", "messages");
}

export function readMessageTree(locale: LocaleName, messagesDirectory: string = getMessagesDirectory()): MessageTree {
  return JSON.parse(fs.readFileSync(path.join(messagesDirectory, `${locale}.json`), "utf8")) as MessageTree;
}

export function writeMessageTree(locale: LocaleName, tree: MessageTree, messagesDirectory: string = getMessagesDirectory()): void {
  fs.writeFileSync(path.join(messagesDirectory, `${locale}.json`), `${JSON.stringify(sortTree(tree), null, 2)}\n`);
}

export function flattenMessages(tree: MessageTree, prefix: string = ""): Map<string, MessageLeaf> {
  const result = new Map<string, MessageLeaf>();
  for (const [key, value] of Object.entries(tree)) {
    const nextPath = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      result.set(nextPath, value);
    } else {
      for (const [childPath, childValue] of flattenMessages(value, nextPath)) {
        result.set(childPath, childValue);
      }
    }
  }

  return result;
}

export function unflattenMessages(flatMessages: ReadonlyMap<string, MessageLeaf>): MessageTree {
  const root: Record<string, MessageLeaf | Record<string, unknown>> = {};
  for (const [messagePath, value] of flatMessages) {
    const segments = messagePath.split(".");
    let pointer: Record<string, MessageLeaf | Record<string, unknown>> = root;
    for (const [index, segment] of segments.entries()) {
      if (index === segments.length - 1) {
        pointer[segment] = value;
      } else {
        const existing = pointer[segment];
        if (typeof existing === "string") {
          throw new Error(`Cannot create nested path "${messagePath}" because "${segments.slice(0, index + 1).join(".")}" is already a leaf.`);
        }

        pointer[segment] = existing ?? {};
        pointer = pointer[segment] as Record<string, MessageLeaf | Record<string, unknown>>;
      }
    }
  }

  return root as MessageTree;
}

export function sortTree(tree: MessageTree): MessageTree {
  return Object.fromEntries(
    Object.entries(tree)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => [key, typeof value === "string" ? value : sortTree(value)]),
  ) as MessageTree;
}

export function getPathDepth(messagePath: string): number {
  return messagePath.split(".").length;
}

export function isLowerCamelCase(segment: string): boolean {
  return /^[a-z][A-Za-z0-9]*$/u.test(segment);
}

export function replacePrefix(messagePath: string, oldPrefix: string, newPrefix: string): string {
  if (messagePath === oldPrefix) return newPrefix;
  if (messagePath.startsWith(`${oldPrefix}.`)) return `${newPrefix}${messagePath.slice(oldPrefix.length)}`;
  return messagePath;
}
