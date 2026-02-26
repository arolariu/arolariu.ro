/**
 * i18n Namespace Consolidation — Source File Migration Script
 *
 * Updates all useTranslations/getTranslations calls across the codebase
 * to reference the new namespace paths.
 *
 * Run: node scripts/migrate-i18n-source.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, "..", "src");

/**
 * Complete mapping of old namespace → new namespace
 * Order matters: longer/more-specific patterns first to avoid partial matches
 */
const NAMESPACE_MAP = [
  // ─── Global components ───
  ["Shared.themeButton", "Common.accessibility"],
  ["Shared.header", "Common.accessibility"],
  ["Forbidden.Screen", "Common.states.forbidden"],

  // ─── Error pages ───
  ["errors.globalError", "Errors.globalError"],
  ["errors.404", "Errors.notFound"],

  // ─── Legal ───
  ["privacyPolicy.__metadata__", "Legal.PrivacyPolicy.metadata"],
  ["privacyPolicy", "Legal.PrivacyPolicy"],
  ["termsOfService.__metadata__", "Legal.TermsOfService.metadata"],
  ["termsOfService", "Legal.TermsOfService"],

  // ─── Auth (from Authentication) ───
  ["Authentication.SignIn.__metadata__", "Auth.SignIn.metadata"],
  ["Authentication.SignUp.__metadata__", "Auth.SignUp.metadata"],
  ["Authentication.__metadata__", "Auth.metadata"],
  ["Authentication.Island.trust", "Auth.Island.trust"],
  ["Authentication.Island", "Auth.Island"],
  ["Authentication.SignIn", "Auth.SignIn"],
  ["Authentication.SignUp", "Auth.SignUp"],
  ["Authentication.Button", "Auth.Button"],

  // ─── About (metadata normalization) ───
  ["About.Platform.__metadata__", "About.Platform.metadata"],
  ["About.Author.__metadata__", "About.Author.metadata"],
  ["About.__metadata__", "About.metadata"],

  // ─── Acknowledgements (metadata normalization) ───
  ["Acknowledgements.__metadata__", "Acknowledgements.metadata"],

  // ─── Domains (metadata normalization) ───
  ["Domains.__metadata__", "Domains.metadata"],

  // ─── Invoices — top-level ───
  ["Invoices.__metadata__", "Invoices.metadata"],

  // ─── Invoices — service.* paths (most specific first) ───
  [
    "Domains.services.invoices.service.view-invoices.__metadata__",
    "Invoices.ViewInvoices.metadata",
  ],
  [
    "Domains.services.invoices.service.view-page.__metadata__",
    "Invoices.ViewInvoice.metadata",
  ],
  [
    "Domains.services.invoices.service.edit-page.__metadata__",
    "Invoices.EditInvoice.metadata",
  ],
  [
    "Domains.services.invoices.service.upload-scans.__metadata__",
    "Invoices.UploadScans.metadata",
  ],
  [
    "Domains.services.invoices.service.view-scans.__metadata__",
    "Invoices.ViewScans.metadata",
  ],
  [
    "Domains.services.invoices.service.view-scans.header",
    "Invoices.ViewScans.header",
  ],
  [
    "Domains.services.invoices.service.view-scans.scanCard",
    "Invoices.ViewScans.scanCard",
  ],
  [
    "Domains.services.invoices.service.view-scans.toolbar",
    "Invoices.ViewScans.toolbar",
  ],
  [
    "Domains.services.invoices.service.view-scans",
    "Invoices.ViewScans",
  ],
  [
    "Domains.services.invoices.service.upload-scans",
    "Invoices.UploadScans",
  ],
  [
    "Domains.services.invoices.service.view-invoices",
    "Invoices.ViewInvoices",
  ],
  [
    "Domains.services.invoices.service.createInvoiceDialog",
    "Invoices.ViewScans.createInvoiceDialog",
  ],
  [
    "Domains.services.invoices.service.states.loading",
    "Invoices.Shared.states.loading",
  ],
  [
    "Domains.services.invoices.service.states.notFound",
    "Invoices.Shared.states.notFound",
  ],
  [
    "Domains.services.invoices.service.homepage",
    "Invoices.Homepage",
  ],

  // ─── Invoices — ui.* paths (Shared: used across multiple routes) ───
  [
    "Domains.services.invoices.ui.invoiceHeader",
    "Invoices.Shared.invoiceHeader",
  ],
  [
    "Domains.services.invoices.ui.loadingInvoices",
    "Invoices.Shared.loadingInvoices",
  ],
  [
    "Domains.services.invoices.ui.invoicesNotFound",
    "Invoices.Shared.invoicesNotFound",
  ],
  [
    "Domains.services.invoices.ui.shareInvoiceDialogPublic",
    "Invoices.Shared.shareInvoiceDialogPublic",
  ],
  [
    "Domains.services.invoices.ui.shareInvoiceDialogPrivate",
    "Invoices.Shared.shareInvoiceDialogPrivate",
  ],
  [
    "Domains.services.invoices.ui.shareInvoiceDialog",
    "Invoices.Shared.shareInvoiceDialog",
  ],
  [
    "Domains.services.invoices.ui.deleteInvoiceDialog",
    "Invoices.Shared.deleteInvoiceDialog",
  ],

  // ─── Invoices — ui.* paths (ViewInvoices route) ───
  [
    "Domains.services.invoices.ui.viewInvoicesPage",
    "Invoices.ViewInvoices.viewInvoicesPage",
  ],
  [
    "Domains.services.invoices.ui.viewInvoicesIsland",
    "Invoices.ViewInvoices.viewInvoicesIsland",
  ],
  [
    "Domains.services.invoices.ui.invoicesHeader",
    "Invoices.ViewInvoices.invoicesHeader",
  ],
  [
    "Domains.services.invoices.ui.invoicesView",
    "Invoices.ViewInvoices.invoicesView",
  ],
  [
    "Domains.services.invoices.ui.statisticsView",
    "Invoices.ViewInvoices.statisticsView",
  ],
  [
    "Domains.services.invoices.ui.generativeView",
    "Invoices.ViewInvoices.generativeView",
  ],
  [
    "Domains.services.invoices.ui.tableViewActions",
    "Invoices.ViewInvoices.tableViewActions",
  ],
  [
    "Domains.services.invoices.ui.tableView",
    "Invoices.ViewInvoices.tableView",
  ],
  [
    "Domains.services.invoices.ui.gridView",
    "Invoices.ViewInvoices.gridView",
  ],
  [
    "Domains.services.invoices.ui.exportDialog",
    "Invoices.ViewInvoices.exportDialog",
  ],
  [
    "Domains.services.invoices.ui.importDialog",
    "Invoices.ViewInvoices.importDialog",
  ],

  // ─── Invoices — ui.* paths (ViewInvoice route) ───
  [
    "Domains.services.invoices.ui.invoiceAnalytics",
    "Invoices.ViewInvoice.invoiceAnalytics",
  ],
  [
    "Domains.services.invoices.ui.invoiceTimeline",
    "Invoices.ViewInvoice.invoiceTimeline",
  ],
  [
    "Domains.services.invoices.ui.invoiceTabs",
    "Invoices.ViewInvoice.invoiceTabs",
  ],
  [
    "Domains.services.invoices.ui.timelineItem",
    "Invoices.ViewInvoice.timelineItem",
  ],
  [
    "Domains.services.invoices.ui.timelineSharedWithList",
    "Invoices.ViewInvoice.timelineSharedWithList",
  ],
  [
    "Domains.services.invoices.ui.budgetImpactCard",
    "Invoices.ViewInvoice.budgetImpactCard",
  ],
  [
    "Domains.services.invoices.ui.comparisonStatsCard",
    "Invoices.ViewInvoice.comparisonStatsCard",
  ],
  [
    "Domains.services.invoices.ui.invoiceDetailsCard",
    "Invoices.ViewInvoice.invoiceDetailsCard",
  ],
  [
    "Domains.services.invoices.ui.merchantInfoCard",
    "Invoices.ViewInvoice.merchantInfoCard",
  ],
  [
    "Domains.services.invoices.ui.receiptScanCard",
    "Invoices.ViewInvoice.receiptScanCard",
  ],
  [
    "Domains.services.invoices.ui.seasonalInsightsCard",
    "Invoices.ViewInvoice.seasonalInsightsCard",
  ],
  [
    "Domains.services.invoices.ui.shoppingCalendarCard",
    "Invoices.ViewInvoice.shoppingCalendarCard",
  ],
  [
    "Domains.services.invoices.ui.summaryStatsCard",
    "Invoices.ViewInvoice.summaryStatsCard",
  ],
  [
    "Domains.services.invoices.ui.invoiceGuestBanner",
    "Invoices.ViewInvoice.invoiceGuestBanner",
  ],
  [
    "Domains.services.invoices.ui.categoryComparisonChart",
    "Invoices.ViewInvoice.categoryComparisonChart",
  ],
  [
    "Domains.services.invoices.ui.itemsBreakdownChart",
    "Invoices.ViewInvoice.itemsBreakdownChart",
  ],
  [
    "Domains.services.invoices.ui.merchantBreakdownChart",
    "Invoices.ViewInvoice.merchantBreakdownChart",
  ],
  [
    "Domains.services.invoices.ui.priceDistributionChart",
    "Invoices.ViewInvoice.priceDistributionChart",
  ],
  [
    "Domains.services.invoices.ui.spendingByCategoryChart",
    "Invoices.ViewInvoice.spendingByCategoryChart",
  ],
  [
    "Domains.services.invoices.ui.spendingTrendChart",
    "Invoices.ViewInvoice.spendingTrendChart",
  ],
  [
    "Domains.services.invoices.ui.shareAnalyticsDialog",
    "Invoices.ViewInvoice.shareAnalyticsDialog",
  ],
  [
    "Domains.services.invoices.ui.categorySuggestionCard",
    "Invoices.ViewInvoice.categorySuggestionCard",
  ],
  [
    "Domains.services.invoices.ui.diningCard",
    "Invoices.ViewInvoice.diningCard",
  ],
  [
    "Domains.services.invoices.ui.generalExpenseCard",
    "Invoices.ViewInvoice.generalExpenseCard",
  ],
  [
    "Domains.services.invoices.ui.homeInventoryCard",
    "Invoices.ViewInvoice.homeInventoryCard",
  ],
  [
    "Domains.services.invoices.ui.nutritionCard",
    "Invoices.ViewInvoice.nutritionCard",
  ],
  [
    "Domains.services.invoices.ui.vehicleCard",
    "Invoices.ViewInvoice.vehicleCard",
  ],

  // ─── Invoices — ui.* paths (EditInvoice route) ───
  [
    "Domains.services.invoices.ui.editInvoiceContext",
    "Invoices.EditInvoice.editInvoiceContext",
  ],
  [
    "Domains.services.invoices.ui.triviaTips",
    "Invoices.EditInvoice.triviaTips",
  ],
  [
    "Domains.services.invoices.ui.invoiceCard",
    "Invoices.EditInvoice.invoiceCard",
  ],
  [
    "Domains.services.invoices.ui.merchantCard",
    "Invoices.EditInvoice.merchantCard",
  ],
  [
    "Domains.services.invoices.ui.imageCard",
    "Invoices.EditInvoice.imageCard",
  ],
  [
    "Domains.services.invoices.ui.recipeCard",
    "Invoices.EditInvoice.recipeCard",
  ],
  [
    "Domains.services.invoices.ui.sharingCard",
    "Invoices.EditInvoice.sharingCard",
  ],
  [
    "Domains.services.invoices.ui.recipesTab",
    "Invoices.EditInvoice.recipesTab",
  ],
  [
    "Domains.services.invoices.ui.metadataTab",
    "Invoices.EditInvoice.metadataTab",
  ],
  [
    "Domains.services.invoices.ui.analyzeDialog",
    "Invoices.EditInvoice.analyzeDialog",
  ],
  [
    "Domains.services.invoices.ui.addScanDialog",
    "Invoices.EditInvoice.addScanDialog",
  ],
  [
    "Domains.services.invoices.ui.imageDialog",
    "Invoices.EditInvoice.imageDialog",
  ],
  [
    "Domains.services.invoices.ui.itemsDialog",
    "Invoices.EditInvoice.itemsDialog",
  ],
  [
    "Domains.services.invoices.ui.merchantDialog",
    "Invoices.EditInvoice.merchantDialog",
  ],
  [
    "Domains.services.invoices.ui.feedbackDialog",
    "Invoices.EditInvoice.feedbackDialog",
  ],
  [
    "Domains.services.invoices.ui.metadataDialog",
    "Invoices.EditInvoice.metadataDialog",
  ],
  [
    "Domains.services.invoices.ui.recipeDialog",
    "Invoices.EditInvoice.recipeDialog",
  ],
  [
    "Domains.services.invoices.ui.merchantReceiptsDialog",
    "Invoices.EditInvoice.merchantReceiptsDialog",
  ],
  [
    "Domains.services.invoices.ui.removeScanDialog",
    "Invoices.EditInvoice.removeScanDialog",
  ],
  [
    "Domains.services.invoices.ui.itemsTable",
    "Invoices.EditInvoice.itemsTable",
  ],

  // ─── Profile (from MyProfile) ───
  ["MyProfile.settings.appearance", "Profile.settings.appearance"],
  ["MyProfile.settings.analytics", "Profile.settings.analytics"],
  ["MyProfile.settings.notifications", "Profile.settings.notifications"],
  ["MyProfile.settings.security", "Profile.settings.security"],
  ["MyProfile.settings.data", "Profile.settings.data"],
  ["MyProfile.settings.ai", "Profile.settings.ai"],
  ["MyProfile.sidebar.nav", "Profile.sidebar.nav"],
  ["MyProfile.island", "Profile.island"],
  ["MyProfile.stats", "Profile.stats"],
  ["MyProfile.meta", "Profile.metadata"],
  ["MyProfile", "Profile"],
];

/**
 * Recursively find all .ts/.tsx files in a directory
 */
function findFiles(dir, ext = [".ts", ".tsx"]) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
      results.push(...findFiles(fullPath, ext));
    } else if (entry.isFile() && ext.some((e) => entry.name.endsWith(e))) {
      results.push(fullPath);
    }
  }
  return results;
}

// ─── Execute migration ───

console.log("=== i18n Source File Migration ===\n");

const files = findFiles(srcDir);
let totalChanges = 0;
let filesChanged = 0;

for (const filePath of files) {
  let content = fs.readFileSync(filePath, "utf-8");
  let changed = false;

  for (const [oldNs, newNs] of NAMESPACE_MAP) {
    // Match both double-quoted and single-quoted namespace strings
    // in useTranslations("...") and getTranslations("...")
    const patterns = [
      `"${oldNs}"`,
      `'${oldNs}'`,
    ];

    for (const pattern of patterns) {
      if (content.includes(pattern)) {
        const replacement = pattern[0] + newNs + pattern[0]; // preserve quote style
        const count = content.split(pattern).length - 1;
        content = content.replaceAll(pattern, replacement);
        totalChanges += count;
        changed = true;
      }
    }
  }

  // Also update JSDoc/comments that mention old namespace paths
  // (specifically the ForbiddenScreen.tsx JSDoc)
  if (content.includes('useTranslations("Forbidden.Screen")') && !changed) {
    // This was already handled by the pattern replacement above
  }

  if (changed) {
    fs.writeFileSync(filePath, content, "utf-8");
    filesChanged++;
    const rel = path.relative(srcDir, filePath);
    console.log(`  Updated: ${rel}`);
  }
}

console.log(`\nTotal: ${totalChanges} replacements across ${filesChanged} files`);

// ─── Verification ───
console.log("\n=== Verification: Remaining old namespace references ===");

const oldPrefixes = [
  "Shared\\.",
  "Forbidden\\.",
  '"errors\\.',
  "'errors\\.",
  "Authentication\\.",
  "privacyPolicy",
  "termsOfService",
  "Domains\\.services\\.invoices",
  "Invoices\\.__metadata__",
  'MyProfile[."]',
  '__metadata__',
];

let issues = 0;
for (const file of files) {
  const content = fs.readFileSync(file, "utf-8");
  for (const prefix of oldPrefixes) {
    const regex = new RegExp(
      `(useTranslations|getTranslations)\\(["']${prefix}`,
      "g"
    );
    const matches = content.match(regex);
    if (matches) {
      const rel = path.relative(srcDir, file);
      console.log(`  UNMIGRATED: ${rel} — ${matches[0]}`);
      issues++;
    }
  }
}

if (issues === 0) {
  console.log("  All references migrated successfully.");
} else {
  console.log(`\n  WARNING: ${issues} unmigrated references found.`);
}
