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
