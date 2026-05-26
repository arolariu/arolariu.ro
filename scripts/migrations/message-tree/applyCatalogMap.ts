import fs from "node:fs";
import path from "node:path";
import {flattenMessages, getRepositoryRoot, localeNames, readMessageTree, unflattenMessages, writeMessageTree} from "./treeUtils.ts";

type KeyMapEntry = Readonly<{
  oldPath: string;
  newPath: string;
  reason: string;
}>;

const repositoryRoot = getRepositoryRoot();
const keyMap = JSON.parse(
  fs.readFileSync(path.join(repositoryRoot, "scripts", "migrations", "message-tree", "key-map.json"), "utf8"),
) as readonly KeyMapEntry[];

for (const locale of localeNames) {
  const oldFlat = flattenMessages(readMessageTree(locale));
  const newFlat = new Map<string, string>();

  for (const entry of keyMap) {
    const value = oldFlat.get(entry.oldPath);
    if (value === undefined) {
      throw new Error(`[message-tree] ${locale} is missing old path ${entry.oldPath}`);
    }
    newFlat.set(entry.newPath, value);
  }

  if (newFlat.size !== oldFlat.size) {
    throw new Error(`[message-tree] ${locale} leaf count changed from ${oldFlat.size} to ${newFlat.size}`);
  }

  writeMessageTree(locale, unflattenMessages(newFlat));
  console.info(`[message-tree] Rewrote ${locale}.json with ${newFlat.size} leaves.`);
}
