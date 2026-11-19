/**
 * @fileoverview Vitest configuration for the arolariu.ro website.
 * @module sites/arolariu.ro/vitest.config
 *
 * @remarks
 * Extends the monorepo base config with Next.js specific settings.
 *
 * @see https://vitest.dev/config/
 */

import {resolve} from "node:path";
import {defineConfig, mergeConfig} from "vitest/config";
import baseConfig from "../../vitest.config.ts";

const realHttpTests = [
  "src/app/domains/invoices/_actions/invoices/{analyzeInvoice,createInvoice,deleteInvoice,fetchInvoice,fetchInvoices,patchInvoice,updateInvoice}.test.ts",
  "src/app/domains/invoices/_actions/invoices/metadata/{addInvoiceMetadata,deleteInvoiceMetadata}.test.ts",
  "src/app/domains/invoices/_actions/invoices/scans/attachScanToInvoice.test.ts",
  "src/app/domains/invoices/_actions/scans/{createScan,deleteScan,fetchScans,updateScan}.test.ts",
  "src/app/domains/invoices/create-invoice/_context/CreateInvoiceRetry.test.tsx",
  "src/app/domains/invoices/edit-invoice/*/_dialogs/{AnalyzeDialog,RecipeDialogs}.test.tsx",
  "src/app/domains/invoices/view-scans/_actions/createInvoiceFromScans.test.ts",
];
const leanTests = [
  "emails/invoices/{alerts/SpendingThresholdAlertEmail,reminders/IncompleteInvoiceReminderEmail}.test.ts",
  "src/app/_components/PreferencesSubscriptions.test.tsx",
  "src/app/domains/invoices/_utils/{labelUtilities,metadataUtilities,mimeTypeUtilities}.test.ts",
  "src/app/domains/invoices/view-invoice/*/_components/cards/InvoiceHealthScore.test.tsx",
  "src/app/domains/invoices/view-invoice/*/_dialogs/ExportDialog.test.tsx",
  "src/app/domains/invoices/view-invoice/*/_utils/{analytics,analytics.edge,healthScore}.test.ts",
  "src/app/domains/invoices/view-invoices/_utils/{datePresets,filterOptions,statistics,statistics.merchant}.test.ts",
  "src/components/Navigation.test.tsx",
  "src/lib/{calendarLocale,concurrency.client,utils.generic}.test.ts",
  "src/lib/{actions/cookies/cookies.action,currency/converter,taxonomies/taxonomyCatalog.server,telemetry/healthPolicy}.test.ts",
  "src/types/{domainConstants,guards}.test.ts",
  "src/types/invoices/{Allergen,Analysis,Classification,Recipe,transport}.test.ts",
];
const sourceAlias = {find: "@", replacement: resolve(import.meta.dirname, "src")};
const markerAliases = [
  {find: "server-only", replacement: resolve(import.meta.dirname, "tests/stubs/server-only.ts")},
  {find: "client-only", replacement: resolve(import.meta.dirname, "tests/stubs/client-only.ts")},
];
const legacyServerAliases = [
  {find: "@/instrumentation.server", replacement: resolve(import.meta.dirname, "tests/stubs/instrumentation.server.ts")},
  {find: "@/lib/config/configProxy", replacement: resolve(import.meta.dirname, "tests/stubs/lib/config/configProxy.ts")},
  {find: "@/lib/utils.server", replacement: resolve(import.meta.dirname, "tests/stubs/lib/utils.server.ts")},
  {find: "@/lib/azure/storageClient", replacement: resolve(import.meta.dirname, "tests/stubs/lib/azure/storageClient.ts")},
  {find: "@/lib/actions/storage/fetchConfig", replacement: resolve(import.meta.dirname, "tests/stubs/lib/actions/storage/fetchConfig.ts")},
  {find: "@/lib/actions/user/fetchUser", replacement: resolve(import.meta.dirname, "tests/stubs/lib/actions/user/fetchUser.ts")},
];

export default mergeConfig(
  {...baseConfig, test: {...baseConfig.test, include: [], setupFiles: []}},
  defineConfig({
    test: {
      silent: "passed-only",
      server: {
        deps: {
          inline: ["@arolariu/components"],
        },
      },
      exclude: ["**/node_modules/**", "**/tests/**"], // Exclude E2E tests directory
      projects: [
        {
          extends: true,
          resolve: {alias: legacyServerAliases},
          test: {
            name: "website",
            include: baseConfig.test?.include,
            exclude: [...realHttpTests, ...leanTests],
            setupFiles: [resolve(import.meta.dirname, "vitest.setup.ts")],
          },
        },
        {extends: true, test: {name: "website-lean", include: leanTests, environment: "node"}},
        {
          extends: true,
          test: {
            name: "server-http",
            include: realHttpTests,
            environment: "node",
            env: {APPLICATIONINSIGHTS_CONNECTION_STRING: "", OTEL_EXPORTER_OTLP_ENDPOINT: ""},
            setupFiles: [resolve(import.meta.dirname, "tests/setup/server-http.ts")],
          },
        },
      ],
      coverage: {
        exclude: [
          // ── existing entries ──
          "**/instrumentation.server.ts",
          "**/instrumentation.ts",
          "**/.next/**",
          "**/tests/**",
          "**/export/InvoicePDF.tsx", // @react-pdf/renderer template — not unit-testable
          "**/*.stories.tsx", // Storybook stories

          // ── legacy email coverage scope ──
          "**/emails/**/*.tsx",

          // ── SCSS modules (instrumented by v8 as a side effect of import) ──
          "**/*.module.scss",
          "**/*.scss",
        ],
      },
    },
    resolve: {
      alias: [...markerAliases, sourceAlias],
      conditions: ["node", "default"],
      mainFields: ["module", "jsnext:main", "jsnext"],
    },
  }),
);
