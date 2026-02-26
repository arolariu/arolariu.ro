/**
 * i18n Namespace Consolidation — JSON Migration Script
 *
 * Transforms messages/{en,ro,fr}.json from the old 18-namespace structure
 * to the new 13-namespace structure with unified PascalCase naming.
 *
 * This is a STRUCTURAL migration — content is preserved, only namespace
 * paths change. I18nConsolidation content is discarded (source files
 * reference old paths, so we keep old content for compatibility).
 *
 * Run: node scripts/migrate-i18n-json.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const messagesDir = path.join(__dirname, "..", "messages");
const locales = ["en", "ro", "fr"];

/**
 * Deep-clone a value (JSON-safe objects only)
 */
function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Get a nested value by dot-path, returns undefined if not found
 */
function getPath(obj, dotPath) {
  return dotPath.split(".").reduce((o, k) => o?.[k], obj);
}

/**
 * Recursively rename __metadata__ and meta keys to "metadata"
 */
function renameMetadataKeys(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = key === "__metadata__" || key === "meta" ? "metadata" : key;
    result[newKey] =
      typeof value === "object" && value !== null && !Array.isArray(value)
        ? renameMetadataKeys(value)
        : value;
  }
  return result;
}

/**
 * Build the complete target structure from source
 */
function migrateMessages(src) {
  const target = {};

  // ─── 1. Common (new — expanded from Shared + Forbidden) ───
  target.Common = {
    accessibility: {
      logoAlt: src.Shared?.header?.logoAlt ?? "arolariu.ro logo",
      toggleTheme:
        src.Shared?.themeButton?.toggleAriaLabel ?? "Toggle theme",
    },
    states: {
      forbidden: clone(src.Forbidden?.Screen ?? {}),
    },
  };

  // ─── 2. Navigation (keep as-is) ───
  target.Navigation = clone(src.Navigation ?? {});

  // ─── 3. Footer (keep as-is) ───
  target.Footer = clone(src.Footer ?? {});

  // ─── 4. Commander (keep as-is) ───
  target.Commander = clone(src.Commander ?? {});

  // ─── 5. Errors (renamed from "errors", key "404" → "notFound") ───
  target.Errors = {
    notFound: clone(src.errors?.["404"] ?? {}),
    globalError: clone(src.errors?.globalError ?? {}),
  };

  // ─── 6. EULA (keep as-is) ───
  target.EULA = clone(src.EULA ?? {});

  // ─── 7. Home (rename __metadata__ → metadata) ───
  target.Home = renameMetadataKeys(clone(src.Home ?? {}));

  // ─── 8. About (rename __metadata__ → metadata recursively) ───
  target.About = renameMetadataKeys(clone(src.About ?? {}));

  // ─── 9. Auth (renamed from Authentication, rename __metadata__ → metadata) ───
  target.Auth = renameMetadataKeys(clone(src.Authentication ?? {}));

  // ─── 10. Domains (hub only — invoice subtree moved to Invoices) ───
  const domainServices = clone(src.Domains?.services ?? {});
  // Remove invoices from the services — they're promoted to top-level
  delete domainServices.invoices;
  target.Domains = {
    metadata: clone(src.Domains?.__metadata__ ?? {}),
    title: src.Domains?.title,
    subtitle: src.Domains?.subtitle,
    services: domainServices,
  };

  // ─── 11. Invoices (promoted from Domains.services.invoices) ───
  const invService = src.Domains?.services?.invoices?.service ?? {};
  const invUI = src.Domains?.services?.invoices?.ui ?? {};

  target.Invoices = {
    metadata: clone(src.Invoices?.__metadata__ ?? {}),

    // Route: /domains/invoices (homepage)
    Homepage: renameMetadataKeys(clone(invService.homepage ?? {})),

    // Route: /domains/invoices/upload-scans
    UploadScans: renameMetadataKeys(clone(invService["upload-scans"] ?? {})),

    // Route: /domains/invoices/view-scans
    ViewScans: {
      ...renameMetadataKeys(clone(invService["view-scans"] ?? {})),
      createInvoiceDialog: clone(invService.createInvoiceDialog ?? {}),
    },

    // Route: /domains/invoices/view-invoices
    ViewInvoices: {
      ...renameMetadataKeys(clone(invService["view-invoices"] ?? {})),
      // UI components owned by view-invoices route
      viewInvoicesPage: clone(invUI.viewInvoicesPage ?? {}),
      viewInvoicesIsland: clone(invUI.viewInvoicesIsland ?? {}),
      invoicesHeader: clone(invUI.invoicesHeader ?? {}),
      invoicesView: clone(invUI.invoicesView ?? {}),
      statisticsView: clone(invUI.statisticsView ?? {}),
      generativeView: clone(invUI.generativeView ?? {}),
      tableView: clone(invUI.tableView ?? {}),
      gridView: clone(invUI.gridView ?? {}),
      tableViewActions: clone(invUI.tableViewActions ?? {}),
      exportDialog: clone(invUI.exportDialog ?? {}),
      importDialog: clone(invUI.importDialog ?? {}),
    },

    // Route: /domains/invoices/view-invoice/[id]
    ViewInvoice: {
      metadata: clone(invService["view-page"]?.__metadata__ ?? {}),
      // UI components owned by view-invoice route
      invoiceAnalytics: clone(invUI.invoiceAnalytics ?? {}),
      invoiceTimeline: clone(invUI.invoiceTimeline ?? {}),
      invoiceTabs: clone(invUI.invoiceTabs ?? {}),
      timelineItem: clone(invUI.timelineItem ?? {}),
      timelineSharedWithList: clone(invUI.timelineSharedWithList ?? {}),
      budgetImpactCard: clone(invUI.budgetImpactCard ?? {}),
      comparisonStatsCard: clone(invUI.comparisonStatsCard ?? {}),
      invoiceDetailsCard: clone(invUI.invoiceDetailsCard ?? {}),
      merchantInfoCard: clone(invUI.merchantInfoCard ?? {}),
      receiptScanCard: clone(invUI.receiptScanCard ?? {}),
      seasonalInsightsCard: clone(invUI.seasonalInsightsCard ?? {}),
      shoppingCalendarCard: clone(invUI.shoppingCalendarCard ?? {}),
      summaryStatsCard: clone(invUI.summaryStatsCard ?? {}),
      invoiceGuestBanner: clone(invUI.invoiceGuestBanner ?? {}),
      categoryComparisonChart: clone(invUI.categoryComparisonChart ?? {}),
      itemsBreakdownChart: clone(invUI.itemsBreakdownChart ?? {}),
      merchantBreakdownChart: clone(invUI.merchantBreakdownChart ?? {}),
      priceDistributionChart: clone(invUI.priceDistributionChart ?? {}),
      spendingByCategoryChart: clone(invUI.spendingByCategoryChart ?? {}),
      spendingTrendChart: clone(invUI.spendingTrendChart ?? {}),
      shareAnalyticsDialog: clone(invUI.shareAnalyticsDialog ?? {}),
      categorySuggestionCard: clone(invUI.categorySuggestionCard ?? {}),
      diningCard: clone(invUI.diningCard ?? {}),
      generalExpenseCard: clone(invUI.generalExpenseCard ?? {}),
      homeInventoryCard: clone(invUI.homeInventoryCard ?? {}),
      nutritionCard: clone(invUI.nutritionCard ?? {}),
      vehicleCard: clone(invUI.vehicleCard ?? {}),
    },

    // Route: /domains/invoices/edit-invoice/[id]
    EditInvoice: {
      metadata: clone(invService["edit-page"]?.__metadata__ ?? {}),
      editInvoiceContext: clone(invUI.editInvoiceContext ?? {}),
      triviaTips: clone(invUI.triviaTips ?? {}),
      invoiceCard: clone(invUI.invoiceCard ?? {}),
      merchantCard: clone(invUI.merchantCard ?? {}),
      imageCard: clone(invUI.imageCard ?? {}),
      recipeCard: clone(invUI.recipeCard ?? {}),
      sharingCard: clone(invUI.sharingCard ?? {}),
      recipesTab: clone(invUI.recipesTab ?? {}),
      metadataTab: clone(invUI.metadataTab ?? {}),
      analyzeDialog: clone(invUI.analyzeDialog ?? {}),
      addScanDialog: clone(invUI.addScanDialog ?? {}),
      imageDialog: clone(invUI.imageDialog ?? {}),
      itemsDialog: clone(invUI.itemsDialog ?? {}),
      merchantDialog: clone(invUI.merchantDialog ?? {}),
      feedbackDialog: clone(invUI.feedbackDialog ?? {}),
      metadataDialog: clone(invUI.metadataDialog ?? {}),
      recipeDialog: clone(invUI.recipeDialog ?? {}),
      merchantReceiptsDialog: clone(invUI.merchantReceiptsDialog ?? {}),
      removeScanDialog: clone(invUI.removeScanDialog ?? {}),
      itemsTable: clone(invUI.itemsTable ?? {}),
    },

    // Shared invoice components (used across multiple invoice routes)
    Shared: {
      invoiceHeader: clone(invUI.invoiceHeader ?? {}),
      states: clone(invService.states ?? {}),
      loadingInvoices: clone(invUI.loadingInvoices ?? {}),
      invoicesNotFound: clone(invUI.invoicesNotFound ?? {}),
      shareInvoiceDialog: clone(invUI.shareInvoiceDialog ?? {}),
      shareInvoiceDialogPublic: clone(invUI.shareInvoiceDialogPublic ?? {}),
      shareInvoiceDialogPrivate: clone(invUI.shareInvoiceDialogPrivate ?? {}),
      deleteInvoiceDialog: clone(invUI.deleteInvoiceDialog ?? {}),
    },
  };

  // ─── 12. Profile (consolidated from MyProfile, legacy Profile discarded) ───
  target.Profile = renameMetadataKeys(clone(src.MyProfile ?? {}));

  // ─── 13. Legal (consolidated from privacyPolicy + termsOfService) ───
  target.Legal = {
    PrivacyPolicy: renameMetadataKeys(clone(src.privacyPolicy ?? {})),
    TermsOfService: renameMetadataKeys(clone(src.termsOfService ?? {})),
  };

  // ─── 14. Acknowledgements (rename __metadata__ → metadata) ───
  target.Acknowledgements = renameMetadataKeys(
    clone(src.Acknowledgements ?? {})
  );

  return target;
}

// ─── Analysis helpers ───

function countLeaves(obj) {
  if (typeof obj !== "object" || obj === null) return 1;
  return Object.values(obj).reduce((sum, v) => sum + countLeaves(v), 0);
}

function maxDepth(obj, d = 1) {
  if (typeof obj !== "object" || obj === null) return d;
  const depths = Object.values(obj).map((v) => maxDepth(v, d + 1));
  return depths.length ? Math.max(...depths) : d;
}

// ─── Execute migration ───

console.log("=== i18n Namespace Migration ===\n");

for (const locale of locales) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  const source = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  // Pre-migration stats
  const oldKeys = Object.keys(source);
  const oldLeaves = countLeaves(source);
  const oldDepth = maxDepth(source);

  // Run migration
  const migrated = migrateMessages(source);

  // Post-migration stats
  const newKeys = Object.keys(migrated);
  const newLeaves = countLeaves(migrated);
  const newDepth = maxDepth(migrated);

  // Write
  fs.writeFileSync(
    filePath,
    JSON.stringify(migrated, null, 2) + "\n",
    "utf-8"
  );

  console.log(`${locale}.json:`);
  console.log(`  Namespaces: ${oldKeys.length} → ${newKeys.length}`);
  console.log(`  Leaf keys:  ${oldLeaves} → ${newLeaves}`);
  console.log(`  Max depth:  ${oldDepth} → ${newDepth}`);
  console.log(`  New namespaces: [${newKeys.join(", ")}]`);
  console.log();
}

console.log("Migration complete.");
