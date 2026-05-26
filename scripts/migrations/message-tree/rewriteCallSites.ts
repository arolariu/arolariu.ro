import fs from "node:fs";
import path from "node:path";
import {getRepositoryRoot} from "./treeUtils.ts";

type KeyMapEntry = Readonly<{
  oldPath: string;
  newPath: string;
  reason: string;
}>;

const repositoryRoot = getRepositoryRoot();
const roots = [
  path.join(repositoryRoot, "sites", "arolariu.ro", "src"),
  path.join(repositoryRoot, "sites", "arolariu.ro", "emails"),
  path.join(repositoryRoot, "sites", "arolariu.ro", "vitest.setup.ts"),
];
const keyMap = JSON.parse(
  fs.readFileSync(path.join(repositoryRoot, "scripts", "migrations", "message-tree", "key-map.json"), "utf8"),
) as readonly KeyMapEntry[];
const sortedMap = [...keyMap].sort((left, right) => right.oldPath.length - left.oldPath.length);
const selectorRootRules = deriveSelectorRootRules(sortedMap);

function collectFiles(targetPath: string): string[] {
  if (fs.statSync(targetPath).isFile()) return [targetPath];
  return fs.readdirSync(targetPath, {withFileTypes: true}).flatMap((entry) => {
    const fullPath = path.join(targetPath, entry.name);
    if (entry.isDirectory()) return collectFiles(fullPath);
    return /\.(ts|tsx)$/u.test(fullPath) ? [fullPath] : [];
  });
}

function rewriteText(input: string): string {
  let output = input;
  for (const entry of sortedMap) {
    output = output.split(entry.oldPath).join(entry.newPath);

    output = output.split(`m${toSelectorAccess(entry.oldPath)}`).join(`m${toSelectorAccess(entry.newPath)}`);
  }

  for (const [oldRoot, newRoot] of selectorRootRules) {
    output = output.split(`m${toSelectorAccess(oldRoot)}`).join(`m${toSelectorAccess(newRoot)}`);
  }
  return output;
}

function toSelectorAccess(messagePath: string): string {
  return messagePath
    .split(".")
    .map((segment) => (/^[A-Za-z_$][\w$]*$/u.test(segment) ? `.${segment}` : `[${JSON.stringify(segment)}]`))
    .join("");
}

function deriveSelectorRootRules(entries: readonly KeyMapEntry[]): ReadonlyArray<readonly [oldRoot: string, newRoot: string]> {
  const roots = new Map<string, Map<string, number>>();
  for (const entry of entries) {
    const oldRoot = entry.oldPath.split(".")[0] ?? "";
    const newSegments = entry.newPath.split(".");
    const newRoot = oldRoot.startsWith("IMS--") ? newSegments.slice(0, 2).join(".") : newSegments[0] ?? "";
    const counts = roots.get(oldRoot) ?? new Map<string, number>();
    counts.set(newRoot, (counts.get(newRoot) ?? 0) + 1);
    roots.set(oldRoot, counts);
  }

  return [...roots.entries()]
    .map(([oldRoot, counts]) => {
      const [newRoot] = [...counts.entries()].sort((left, right) => right[1] - left[1])[0] ?? [""];
      return [oldRoot, newRoot] as const;
    })
    .filter(([oldRoot, newRoot]) => oldRoot.length > 0 && newRoot.length > 0 && oldRoot !== newRoot)
    .sort((left, right) => right[0].length - left[0].length);
}

let changedCount = 0;
for (const filePath of roots.flatMap(collectFiles)) {
  const oldText = fs.readFileSync(filePath, "utf8");
  const newText = rewriteText(oldText);
  if (newText !== oldText) {
    fs.writeFileSync(filePath, newText);
    changedCount += 1;
  }
}

console.info(`[message-tree] Rewrote ${changedCount} call-site file(s).`);
