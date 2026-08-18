/**
 * @fileoverview Focused real-module Vitest configuration for analysis workflows.
 * @module sites/arolariu.ro/vitest.analysis.config
 *
 * @remarks
 * This configuration deliberately resolves website-owned modules from `src`.
 * It isolates only framework and platform boundaries in its setup file. Task 18
 * will add the analysis coverage thresholds; this focused review configuration
 * intentionally does not enforce the planned 99% coverage gate yet.
 */

import react from "@vitejs/plugin-react";
import {resolve} from "node:path";
import {defineConfig} from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: [resolve(__dirname, "./vitest.analysis.setup.ts")],
    include: [
      "sites/arolariu.ro/vitest.analysis.config.test.ts",
      "sites/arolariu.ro/src/types/invoices/Analysis.test.ts",
      "sites/arolariu.ro/src/lib/taxonomies/taxonomyCatalog.server.test.ts",
      "sites/arolariu.ro/src/app/domains/invoices/_actions/analysis/searchClassifications.test.ts",
      "sites/arolariu.ro/src/app/domains/invoices/_components/analysis/ClassificationPicker.test.tsx",
      "sites/arolariu.ro/src/app/domains/invoices/_actions/invoices/analyzeInvoice.test.ts",
      "sites/arolariu.ro/src/app/domains/invoices/_actions/merchants/analyzeMerchant.test.ts",
      "sites/arolariu.ro/src/app/domains/invoices/_actions/merchants/index.test.ts",
      "sites/arolariu.ro/src/app/domains/invoices/_actions/merchants/updateMerchant.test.ts",
      "sites/arolariu.ro/src/app/domains/invoices/_actions/invoices/createInvoice.test.ts",
      "sites/arolariu.ro/src/app/domains/invoices/_actions/invoices/patchInvoice.test.ts",
      "sites/arolariu.ro/src/app/domains/invoices/_actions/invoices/products/addInvoiceProduct.test.ts",
      "sites/arolariu.ro/src/app/domains/invoices/_actions/invoices/products/updateInvoiceProduct.test.ts",
      "sites/arolariu.ro/src/app/domains/invoices/_hooks/analysis/useAnalysisSubmission.test.tsx",
      "sites/arolariu.ro/src/app/domains/invoices/_components/analysis/InvoiceAnalysisForm.test.tsx",
      "sites/arolariu.ro/src/app/domains/invoices/_components/analysis/MerchantAnalysisForm.test.tsx",
      "sites/arolariu.ro/src/app/domains/invoices/create-invoice/_context/CreateInvoiceContext.test.tsx",
      "sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/_dialogs/AnalyzeDialog.test.tsx",
      "sites/arolariu.ro/src/app/domains/invoices/edit-invoice/[id]/_dialogs/AnalyzeDialog.story.test.tsx",
      "sites/arolariu.ro/src/app/domains/invoices/view-invoice/[id]/_components/cards/AnalysisPanel.test.tsx",
      "sites/arolariu.ro/src/app/domains/invoices/view-invoice/[id]/_components/cards/MerchantInfoCard.test.tsx",
      "sites/arolariu.ro/src/app/domains/invoices/view-scans/_actions/createInvoiceFromScans.test.ts",
      "sites/arolariu.ro/src/app/domains/invoices/view-scans/_dialogs/CreateInvoiceDialog.test.tsx",
    ],
    exclude: ["**/node_modules/**", "**/tests/**", "**/*.spec.{ts,tsx,js,jsx}"],
    testTimeout: 10_000,
    hookTimeout: 20_000,
    teardownTimeout: 5_000,
    bail: 0,
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      enabled: false,
    },
  },
  resolve: {
    alias: [
      // `server-only` is a Next.js build-time sentinel, not a website-owned module.
      {find: "server-only", replacement: resolve(__dirname, "./tests/stubs/server-only.ts")},
      {find: "@", replacement: resolve(__dirname, "./src")},
      {find: "@arolariu/components", replacement: resolve(__dirname, "../../packages/components/dist/index.js")},
    ],
    conditions: ["node", "default"],
    mainFields: ["module", "jsnext:main", "jsnext"],
  },
});
