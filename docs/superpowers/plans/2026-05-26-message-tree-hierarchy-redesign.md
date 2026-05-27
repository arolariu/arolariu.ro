# Message Tree Hierarchy Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize `sites/arolariu.ro/messages/{en,ro,fr}.json` into a strict UI-surface-first hierarchy while preserving locale parity and selector-based translation call sites.

**Architecture:** Keep one authored JSON file per locale and add a deterministic migration toolchain under `scripts/migrations/message-tree/`. The migration is driven by a generated old-path → new-path map, then applies that map to all locale catalogs and selector call sites. Validation becomes part of i18n generation/typecheck so only approved top-level buckets and lower-camel-case paths survive.

**Tech Stack:** Node.js >=24, TypeScript scripts executed directly with `node`, Next.js 16, next-intl, next-intl-selector, npm workspaces, Vitest unit tests.

---

## File structure

**Message catalogs**

- Modify: `sites/arolariu.ro/messages/en.json`
- Modify: `sites/arolariu.ro/messages/ro.json`
- Modify: `sites/arolariu.ro/messages/fr.json`
- Generated/observed: `sites/arolariu.ro/messages/en.d.json.ts`
- Do not modify: `sites/arolariu.ro/messages/*.json.bak`

**Migration tooling**

- Create: `scripts/migrations/message-tree/treeUtils.ts` — JSON tree flattening, unflattening, object sorting, path utilities.
- Create: `scripts/migrations/message-tree/taxonomy.ts` — allowed buckets, segment rules, seed rename rules, and taxonomy validation.
- Create: `scripts/migrations/message-tree/report.ts` — inventory report for before/after shape.
- Create: `scripts/migrations/message-tree/generateKeyMap.ts` — deterministic old-path to new-path map generator.
- Create: `scripts/migrations/message-tree/applyCatalogMap.ts` — applies key map to `en`, `ro`, and `fr` catalogs.
- Create: `scripts/migrations/message-tree/rewriteCallSites.ts` — rewrites selector lambdas and `selectorFromPath(...)` string literals.
- Create: `scripts/migrations/message-tree/validateMessages.ts` — validates locale parity and strict taxonomy.
- Create: `scripts/migrations/message-tree/key-map.json` — committed generated migration map.
- Create: `scripts/migrations/message-tree/reports/before.json` and `after.json` — committed migration reports.

**Existing tooling integration**

- Modify: `scripts/generate.i18n.ts` — invoke or reuse taxonomy validation after parity validation.
- Modify: `sites/arolariu.ro/scripts/typecheck.ts` only if taxonomy validation should run during website typecheck; otherwise keep validation in `npm run generate:i18n`.

**Call sites**

- Modify selector call sites under:
  - `sites/arolariu.ro/src/**/*.ts`
  - `sites/arolariu.ro/src/**/*.tsx`
  - `sites/arolariu.ro/emails/**/*.ts`
  - `sites/arolariu.ro/emails/**/*.tsx`
  - `sites/arolariu.ro/vitest.setup.ts`

**Verification boundary**

- Allowed: `npm --workspace @arolariu/website run typecheck`, `npm run test:unit`, `npm run build:website`, and targeted Node migration scripts.
- Not allowed: ESLint, Playwright, E2E tests, Storybook tests, full `npm run test`, or other full-suite commands.

**Working tree caution**

- Do not stage unrelated existing changes:
  - `.vscode/settings.json`
  - `sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/_dialogs/RecipeDialog.stories.tsx`

---

### Task 1: Build message-tree utility foundation

**Files:**
- Create: `scripts/migrations/message-tree/treeUtils.ts`
- Test via: `node -e` smoke checks

- [ ] **Step 1: Create `treeUtils.ts`**

Create `scripts/migrations/message-tree/treeUtils.ts`:

```ts
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
```

- [ ] **Step 2: Run smoke check**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
node -e "import('./scripts/migrations/message-tree/treeUtils.ts').then((m)=>{const t={A:{b:'c'}}; const f=m.flattenMessages(t); if(f.get('A.b')!=='c') throw new Error('flatten failed'); const u=m.unflattenMessages(f); if(u.A.b!=='c') throw new Error('unflatten failed'); console.log('tree utils ok');})"
```

Expected: `tree utils ok`.

- [ ] **Step 3: Commit utility foundation**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
git add scripts\migrations\message-tree\treeUtils.ts
git commit -m "chore: add message tree utilities" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

Expected: commit contains only `treeUtils.ts`.

---

### Task 2: Add strict taxonomy definitions and validator

**Files:**
- Create: `scripts/migrations/message-tree/taxonomy.ts`
- Create: `scripts/migrations/message-tree/validateMessages.ts`
- Modify: `scripts/generate.i18n.ts`

- [ ] **Step 1: Create taxonomy rules**

Create `scripts/migrations/message-tree/taxonomy.ts`:

```ts
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
```

- [ ] **Step 2: Create validator CLI**

Create `scripts/migrations/message-tree/validateMessages.ts`:

```ts
import {validateAllMessages} from "./taxonomy.ts";

const issues = validateAllMessages();
if (issues.length > 0) {
  console.error(`[message-tree] Found ${issues.length} message taxonomy issue(s).`);
  for (const issue of issues.slice(0, 200)) {
    console.error(`- ${issue.locale}:${issue.path} — ${issue.message}`);
  }
  if (issues.length > 200) {
    console.error(`[message-tree] ${issues.length - 200} additional issue(s) omitted.`);
  }
  process.exit(1);
}

console.info("[message-tree] Message taxonomy validation passed.");
```

- [ ] **Step 3: Run validator before migration and confirm it fails**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
node scripts\migrations\message-tree\validateMessages.ts
```

Expected: FAIL with issues for current top-level buckets such as `About` and `IMS--Dialogs`. This confirms the validator catches current drift.

- [ ] **Step 4: Integrate validator into generation only after migration**

Do not wire the validator into `scripts/generate.i18n.ts` yet, because the current catalog must fail. Add integration in Task 9 after the catalog is rewritten.

- [ ] **Step 5: Commit validator tooling**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
git add scripts\migrations\message-tree\taxonomy.ts scripts\migrations\message-tree\validateMessages.ts
git commit -m "chore: add message tree taxonomy validator" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

Expected: commit contains only taxonomy validator files.

---

### Task 3: Add inventory report script

**Files:**
- Create: `scripts/migrations/message-tree/report.ts`
- Create: `scripts/migrations/message-tree/reports/before.json`

- [ ] **Step 1: Create report script**

Create `scripts/migrations/message-tree/report.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import {flattenMessages, getMessagesDirectory, getPathDepth, getRepositoryRoot, localeNames, readMessageTree} from "./treeUtils.ts";
import {allowedTopLevelBuckets} from "./taxonomy.ts";

type BucketReport = Readonly<{
  bucket: string;
  leaves: number;
  maxDepth: number;
  childCount: number;
}>;

type LocaleReport = Readonly<{
  locale: string;
  topLevelCount: number;
  leafCount: number;
  maxDepth: number;
  allowedBucketLeaves: number;
  retiredPrefixLeaves: number;
  buckets: readonly BucketReport[];
}>;

function buildLocaleReport(locale: (typeof localeNames)[number]): LocaleReport {
  const tree = readMessageTree(locale);
  const flat = flattenMessages(tree);
  const buckets = Object.entries(tree).map(([bucket, value]) => {
    const branchFlat = typeof value === "string" ? new Map([[bucket, value]]) : flattenMessages(value, bucket);
    const paths = [...branchFlat.keys()];
    return {
      bucket,
      leaves: paths.length,
      maxDepth: Math.max(...paths.map(getPathDepth)),
      childCount: typeof value === "string" ? 0 : Object.keys(value).length,
    };
  });

  return {
    locale,
    topLevelCount: Object.keys(tree).length,
    leafCount: flat.size,
    maxDepth: Math.max(...[...flat.keys()].map(getPathDepth)),
    allowedBucketLeaves: [...flat.keys()].filter((key) => allowedTopLevelBuckets.some((bucket) => key === bucket || key.startsWith(`${bucket}.`))).length,
    retiredPrefixLeaves: [...flat.keys()].filter((key) => key.includes("IMS--")).length,
    buckets: buckets.sort((left, right) => right.leaves - left.leaves),
  };
}

const report = {
  generatedAt: new Date().toISOString(),
  messagesDirectory: path.relative(getRepositoryRoot(), getMessagesDirectory()),
  locales: localeNames.map(buildLocaleReport),
};

const outputPath = process.argv[2];
if (outputPath) {
  fs.mkdirSync(path.dirname(outputPath), {recursive: true});
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

console.log(JSON.stringify(report, null, 2));
```

- [ ] **Step 2: Generate before report**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
node scripts\migrations\message-tree\report.ts scripts\migrations\message-tree\reports\before.json
```

Expected: output shows `leafCount` 3326 for each locale and non-zero `retiredPrefixLeaves`.

- [ ] **Step 3: Commit report tooling and before report**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
git add scripts\migrations\message-tree\report.ts scripts\migrations\message-tree\reports\before.json
git commit -m "chore: add message tree inventory report" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

Expected: commit includes report script and `before.json`.

---

### Task 4: Generate the old-path to new-path key map

**Files:**
- Create: `scripts/migrations/message-tree/generateKeyMap.ts`
- Create: `scripts/migrations/message-tree/key-map.json`

- [ ] **Step 1: Create key-map generator**

Create `scripts/migrations/message-tree/generateKeyMap.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import {flattenMessages, getRepositoryRoot, readMessageTree} from "./treeUtils.ts";
import {allowedTopLevelBuckets} from "./taxonomy.ts";

type KeyMapEntry = Readonly<{
  oldPath: string;
  newPath: string;
  reason: string;
}>;

const explicitPrefixRules: ReadonlyArray<readonly [oldPrefix: string, newPrefix: string, reason: string]> = [
  ["Navigation", "app.navigation", "app shell navigation"],
  ["Footer", "app.footer", "app shell footer"],
  ["Commander", "app.commander", "global command palette"],
  ["Errors", "app.errors", "global error and not-found copy"],
  ["Common.accessibility", "shared.accessibility", "shared accessibility labels"],
  ["Common.enums", "shared.enums", "shared enum labels"],
  ["Home", "pages.home", "home page and homepage sections"],
  ["Domains", "pages.domains", "domains landing page"],
  ["About.Hub", "pages.about.hub", "about hub page"],
  ["About.Author.metadata", "pages.about.author.metadata", "author page metadata"],
  ["About.Author", "sections.about.author", "author page sections"],
  ["About.Platform.metadata", "pages.about.platform.metadata", "platform page metadata"],
  ["About.Platform", "sections.about.platform", "platform page sections"],
  ["Profile.metadata", "pages.profile.metadata", "profile page metadata"],
  ["Profile", "pages.profile", "profile page content and settings"],
  ["Auth", "pages.auth", "authentication pages"],
  ["Legal.PrivacyPolicy.metadata", "pages.legal.privacyPolicy.metadata", "privacy metadata"],
  ["Legal.PrivacyPolicy", "sections.legal.privacyPolicy", "privacy policy content"],
  ["Legal.TermsOfService.metadata", "pages.legal.termsOfService.metadata", "terms metadata"],
  ["Legal.TermsOfService", "sections.legal.termsOfService", "terms content"],
  ["Acknowledgements.metadata", "pages.legal.acknowledgements.metadata", "acknowledgements metadata"],
  ["Acknowledgements", "sections.legal.acknowledgements", "acknowledgements content"],
  ["EULA", "pages.legal.eula", "end user license agreement"],
  ["email", "emails", "email templates"],
  ["IMS--Dialogs", "dialogs.invoices", "invoice dialogs"],
  ["IMS--Cards", "cards.invoices", "invoice cards"],
  ["IMS--Stats", "cards.invoices.statistics", "invoice statistics widgets"],
  ["IMS--Hooks", "toasts.invoices", "user-visible hook feedback"],
  ["IMS--Common", "shared.invoices", "shared invoice labels"],
  ["IMS--Landing", "pages.invoices.landing", "invoice landing page"],
  ["IMS--Create", "forms.invoices.createInvoice", "create-invoice flow"],
  ["IMS--Edit", "pages.invoices.editInvoice", "edit-invoice experience"],
  ["IMS--List.metadata", "pages.invoices.viewInvoices.metadata", "view-invoices metadata"],
  ["IMS--List.invoicesView.filters", "forms.invoices.filters", "invoice list filters"],
  ["IMS--List.invoicesView.table", "tables.invoices.list", "invoice list table"],
  ["IMS--List", "pages.invoices.viewInvoices", "view-invoices page"],
  ["IMS--ViewScans", "pages.invoices.viewScans", "view-scans page"],
  ["IMS--UploadScans", "pages.invoices.uploadScans", "upload-scans page"],
  ["IMS--View.metadata", "pages.invoices.viewInvoice.metadata", "view-invoice metadata"],
  ["IMS--View.timelineItem", "sections.invoices.timeline.item", "invoice timeline item"],
  ["IMS--View", "pages.invoices.viewInvoice", "view-invoice page"],
];

function lowerCamel(segment: string): string {
  const cleaned = segment
    .replace(/^IMS--/u, "")
    .replace(/[_\s-]+(.)?/gu, (_match, next: string | undefined) => (next ? next.toUpperCase() : ""))
    .replace(/[^A-Za-z0-9]/gu, "");
  if (!cleaned) return "unknown";
  return `${cleaned[0]!.toLowerCase()}${cleaned.slice(1)}`;
}

function normalizePath(messagePath: string): string {
  return messagePath.split(".").map(lowerCamel).join(".");
}

function mapPath(oldPath: string): KeyMapEntry {
  const matchingRule = explicitPrefixRules
    .filter(([oldPrefix]) => oldPath === oldPrefix || oldPath.startsWith(`${oldPrefix}.`))
    .sort((left, right) => right[0].length - left[0].length)[0];

  if (matchingRule) {
    const [oldPrefix, newPrefix, reason] = matchingRule;
    const suffix = oldPath === oldPrefix ? "" : oldPath.slice(oldPrefix.length);
    return {oldPath, newPath: normalizePath(`${newPrefix}${suffix}`), reason};
  }

  const currentTopLevel = oldPath.split(".")[0] ?? "";
  const fallbackPrefix = allowedTopLevelBuckets.includes(currentTopLevel as (typeof allowedTopLevelBuckets)[number]) ? "" : "shared.legacy.";
  return {oldPath, newPath: normalizePath(`${fallbackPrefix}${oldPath}`), reason: "fallback normalized legacy path"};
}

const flat = flattenMessages(readMessageTree("en"));
const entries = [...flat.keys()].map(mapPath).sort((left, right) => left.oldPath.localeCompare(right.oldPath));
const duplicates = new Map<string, string[]>();
for (const entry of entries) {
  duplicates.set(entry.newPath, [...(duplicates.get(entry.newPath) ?? []), entry.oldPath]);
}
const duplicateEntries = [...duplicates.entries()].filter(([, oldPaths]) => oldPaths.length > 1);
if (duplicateEntries.length > 0) {
  console.error("[message-tree] Duplicate target paths detected:");
  for (const [newPath, oldPaths] of duplicateEntries.slice(0, 50)) {
    console.error(`- ${newPath}: ${oldPaths.join(", ")}`);
  }
  process.exit(1);
}

const outputPath = path.join(getRepositoryRoot(), "scripts", "migrations", "message-tree", "key-map.json");
fs.writeFileSync(outputPath, `${JSON.stringify(entries, null, 2)}\n`);
console.info(`[message-tree] Wrote ${entries.length} mappings to ${path.relative(getRepositoryRoot(), outputPath)}.`);
```

- [ ] **Step 2: Generate key map**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
node scripts\migrations\message-tree\generateKeyMap.ts
```

Expected: `Wrote 3326 mappings`.

- [ ] **Step 3: Inspect map for forbidden paths**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
rg '"newPath": "(About|IMS--|Profile|email|Legal|Navigation|Footer|Common|EULA|Acknowledgements|Auth|Domains|Home)' scripts\migrations\message-tree\key-map.json -n
rg 'IMS--|--|\\s' scripts\migrations\message-tree\key-map.json -n
```

Expected: no matches for old top-level paths or `IMS--` in `newPath` values.

- [ ] **Step 4: Commit key map generator and map**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
git add scripts\migrations\message-tree\generateKeyMap.ts scripts\migrations\message-tree\key-map.json
git commit -m "chore: generate message tree key map" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

Expected: commit contains the generator and `key-map.json`.

---

### Task 5: Apply key map to locale catalogs

**Files:**
- Create: `scripts/migrations/message-tree/applyCatalogMap.ts`
- Modify: `sites/arolariu.ro/messages/en.json`
- Modify: `sites/arolariu.ro/messages/ro.json`
- Modify: `sites/arolariu.ro/messages/fr.json`

- [ ] **Step 1: Create catalog rewrite script**

Create `scripts/migrations/message-tree/applyCatalogMap.ts`:

```ts
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
```

- [ ] **Step 2: Apply map to catalogs**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
node scripts\migrations\message-tree\applyCatalogMap.ts
```

Expected: rewrites `en`, `ro`, and `fr` with `3326 leaves`.

- [ ] **Step 3: Run taxonomy validator**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
node scripts\migrations\message-tree\validateMessages.ts
```

Expected: `Message taxonomy validation passed.`

- [ ] **Step 4: Commit catalog rewrite**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
git add scripts\migrations\message-tree\applyCatalogMap.ts sites\arolariu.ro\messages\en.json sites\arolariu.ro\messages\ro.json sites\arolariu.ro\messages\fr.json
git commit -m "refactor: reorganize message catalogs by ui surface" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

Expected: commit includes the apply script and the three locale catalogs only.

---

### Task 6: Rewrite selector call sites

**Files:**
- Create: `scripts/migrations/message-tree/rewriteCallSites.ts`
- Modify: `sites/arolariu.ro/src/**/*.ts`
- Modify: `sites/arolariu.ro/src/**/*.tsx`
- Modify: `sites/arolariu.ro/emails/**/*.ts`
- Modify: `sites/arolariu.ro/emails/**/*.tsx`
- Modify: `sites/arolariu.ro/vitest.setup.ts`

- [ ] **Step 1: Create call-site rewrite script**

Create `scripts/migrations/message-tree/rewriteCallSites.ts`:

```ts
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

    const bracketPath = entry.oldPath
      .split(".")
      .map((segment, index) => (index === 0 && /[^A-Za-z_$]/u.test(segment) ? `["${segment}"]` : `.${segment}`))
      .join("")
      .replace(/^\./u, "");
    const newDotPath = entry.newPath
      .split(".")
      .map((segment) => `.${segment}`)
      .join("")
      .replace(/^\./u, "");
    output = output.split(`m.${bracketPath}`).join(`m.${newDotPath}`);
    output = output.split(`m[\"${entry.oldPath.split(".")[0]}\"]`).join(`m.${entry.newPath.split(".")[0]}`);
  }
  return output;
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
```

- [ ] **Step 2: Run call-site rewrite**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
node scripts\migrations\message-tree\rewriteCallSites.ts
```

Expected: outputs changed call-site count.

- [ ] **Step 3: Scan for old path references**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
rg 'IMS--|m\\.About|m\\.Profile|m\\.Legal|m\\.Navigation|m\\.Footer|selectorFromPath\\("(About|Profile|IMS--|email\\.)' sites\arolariu.ro\src sites\arolariu.ro\emails sites\arolariu.ro\vitest.setup.ts -n --glob '*.{ts,tsx}'
```

Expected: no matches, except comments that are intentionally updated in Task 8.

- [ ] **Step 4: Run website typecheck**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro\sites\arolariu.ro'
npm run typecheck
```

Expected: typecheck passes. If it fails, use the first failing selector path to add or correct a mapping in `key-map.json`, rerun Tasks 5 and 6, and rerun typecheck.

- [ ] **Step 5: Commit call-site rewrite**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
git add scripts\migrations\message-tree\rewriteCallSites.ts sites\arolariu.ro\src sites\arolariu.ro\emails sites\arolariu.ro\vitest.setup.ts
git commit -m "refactor: update translation selectors for new message tree" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

Expected: commit includes rewrite script and call-site changes.

---

### Task 7: Generate after report and compare inventory

**Files:**
- Create: `scripts/migrations/message-tree/reports/after.json`

- [ ] **Step 1: Generate after report**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
node scripts\migrations\message-tree\report.ts scripts\migrations\message-tree\reports\after.json
```

Expected: each locale still has `leafCount` 3326, `retiredPrefixLeaves` 0, and only allowed top-level buckets.

- [ ] **Step 2: Compare before and after reports**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
node -e "const fs=require('node:fs'); const before=JSON.parse(fs.readFileSync('scripts/migrations/message-tree/reports/before.json','utf8')); const after=JSON.parse(fs.readFileSync('scripts/migrations/message-tree/reports/after.json','utf8')); for (let i=0;i<after.locales.length;i++){ if(before.locales[i].leafCount!==after.locales[i].leafCount) throw new Error('leaf count changed for '+after.locales[i].locale); if(after.locales[i].retiredPrefixLeaves!==0) throw new Error('retired prefixes remain for '+after.locales[i].locale); } console.log('message tree reports match expected migration invariants');"
```

Expected: `message tree reports match expected migration invariants`.

- [ ] **Step 3: Commit after report**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
git add scripts\migrations\message-tree\reports\after.json
git commit -m "chore: record message tree after report" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

Expected: commit includes only `after.json`.

---

### Task 8: Update documentation comments and RFC-adjacent examples

**Files:**
- Modify: `sites/arolariu.ro/src/i18n/request.ts` only if comments mention old tree paths
- Modify: `sites/arolariu.ro/src/app/globals.ts` only if comments mention old tree paths
- Modify: `scripts/generate.i18n.ts`
- Modify: relevant comments in touched call-site files

- [ ] **Step 1: Search documentation for old hierarchy names**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
rg 'IMS--|About\\.Platform|About\\.Author|email\\.welcome|Navigation\\.|Domains\\.services|Legal\\.PrivacyPolicy' sites\arolariu.ro scripts docs\rfc -n --glob '*.{ts,tsx,md}'
```

Expected: matches are only historical docs or comments requiring updates.

- [ ] **Step 2: Update comments that instruct future development**

For active code comments, replace examples like:

```ts
t((m) => m["IMS--List"].metadata.title)
```

with:

```ts
t((m) => m.pages.invoices.viewInvoices.metadata.title)
```

For email examples, replace:

```ts
t(selectorFromPath("email.welcome.subject"))
```

with:

```ts
t(selectorFromPath("emails.account.welcome.subject"))
```

- [ ] **Step 3: Commit comment/docs updates**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
git add sites\arolariu.ro scripts docs\rfc
git restore --staged -- .vscode\settings.json
git commit -m "docs: update message tree examples" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

Expected: commit contains only comments/documentation related to message hierarchy.

---

### Task 9: Integrate taxonomy validation with i18n generation

**Files:**
- Modify: `scripts/generate.i18n.ts`

- [ ] **Step 1: Import taxonomy validator**

At the top of `scripts/generate.i18n.ts`, add:

```ts
import {validateAllMessages} from "./migrations/message-tree/taxonomy.ts";
```

- [ ] **Step 2: Add validation function**

Near the existing validation helpers in `scripts/generate.i18n.ts`, add:

```ts
function validateMessageTreeTaxonomy(): void {
  const issues = validateAllMessages();
  if (issues.length === 0) {
    console.info("[arolariu.ro::generate:i18n] Message tree taxonomy validation passed.");
    return;
  }

  console.error(`[arolariu.ro::generate:i18n] Found ${issues.length} message tree taxonomy issue(s).`);
  for (const issue of issues.slice(0, 200)) {
    console.error(`[arolariu.ro::generate:i18n] ${issue.locale}:${issue.path} — ${issue.message}`);
  }
  throw new Error("[arolariu.ro::generate:i18n] Message tree taxonomy validation failed.");
}
```

- [ ] **Step 3: Invoke taxonomy validation**

In the main generation flow, after existing locale parity checks complete, call:

```ts
validateMessageTreeTaxonomy();
```

- [ ] **Step 4: Run i18n generation**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
npm run generate:i18n
```

Expected: command succeeds and logs taxonomy validation passed.

- [ ] **Step 5: Commit generation integration**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
git add scripts\generate.i18n.ts
git commit -m "chore: enforce message tree taxonomy during i18n generation" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

Expected: commit includes only `scripts/generate.i18n.ts`.

---

### Task 10: Final verification and handoff

**Files:**
- Read: git status and final diff

- [ ] **Step 1: Run final typecheck**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro\sites\arolariu.ro'
npm run typecheck
```

Expected: typecheck passes.

- [ ] **Step 2: Run allowed unit tests**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
npm run test:unit
```

Expected: unit tests pass. Do not run `npm run test`.

- [ ] **Step 3: Run website build**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
npm run build:website
```

Expected: website build succeeds.

- [ ] **Step 4: Final old-reference scan**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
rg 'IMS--|m\\.About|m\\.Profile|m\\.Legal|m\\.Navigation|m\\.Footer|selectorFromPath\\("(About|Profile|IMS--|email\\.)' sites\arolariu.ro\src sites\arolariu.ro\emails sites\arolariu.ro\messages scripts\migrations\message-tree -n --glob '*.{ts,tsx,json}'
```

Expected: no matches except `key-map.json`, `reports/before.json`, and migration scripts that intentionally mention old paths.

- [ ] **Step 5: Check final working tree**

Run:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
git --no-pager status --short
git --no-pager diff --stat
```

Expected: only pre-existing unrelated changes remain if they were not part of this migration:

```text
 M .vscode/settings.json
 D sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/_dialogs/RecipeDialog.stories.tsx
```

- [ ] **Step 6: Commit final verification fixes if needed**

Run only if final verification required code changes:

```powershell
Set-Location 'C:\Users\aolariu\source\repos\arolariu\arolariu.ro'
git add sites\arolariu.ro scripts\migrations\message-tree scripts\generate.i18n.ts
git restore --staged -- .vscode\settings.json sites\arolariu.ro\src\app\domains\invoices\edit-invoice\[id]\_dialogs\RecipeDialog.stories.tsx
git commit -m "refactor: complete message tree hierarchy migration" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

Expected: no unrelated files are staged.
