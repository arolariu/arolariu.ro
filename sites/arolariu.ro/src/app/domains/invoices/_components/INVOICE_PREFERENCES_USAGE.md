/**
 * @fileoverview Usage example for InvoicePreferences component
 * @module app/domains/invoices/_components/InvoicePreferences
 * 
 * This file demonstrates how to integrate the InvoicePreferences component
 * into your invoice pages.
 */

import InvoicePreferences from "./InvoicePreferences";

/**
 * EXAMPLE 1: Standalone Component in a Settings Dialog
 * 
 * Use this in a Dialog or Sheet to show settings:
 * 
 * ```tsx
 * import { Dialog, DialogContent, DialogTrigger } from "@arolariu/components";
 * import { TbSettings } from "react-icons/tb";
 * import InvoicePreferences from "@/app/domains/invoices/_components/InvoicePreferences";
 * 
 * export function SettingsDialog() {
 *   return (
 *     <Dialog>
 *       <DialogTrigger asChild>
 *         <Button variant="outline">
 *           <TbSettings /> Settings
 *         </Button>
 *       </DialogTrigger>
 *       <DialogContent>
 *         <InvoicePreferences />
 *       </DialogContent>
 *     </Dialog>
 *   );
 * }
 * ```
 */

/**
 * EXAMPLE 2: In a Sidebar on the Invoice Homepage
 * 
 * Add to your invoice homepage sidebar:
 * 
 * ```tsx
 * export default function InvoicesPage() {
 *   return (
 *     <div className={styles.layout}>
 *       <main className={styles.main}>
 *         {/* Invoice list content *\/}
 *       </main>
 *       <aside className={styles.sidebar}>
 *         <InvoicePreferences />
 *       </aside>
 *     </div>
 *   );
 * }
 * ```
 */

/**
 * EXAMPLE 3: Accessing Preferences in Other Components
 * 
 * Read preferences from localStorage in any component:
 * 
 * ```tsx
 * import { useLocalStorage } from "@arolariu/components";
 * import type { InvoicePreferences } from "./InvoicePreferences";
 * 
 * export function InvoiceList() {
 *   const [preferences] = useLocalStorage<InvoicePreferences>(
 *     "invoice-preferences",
 *     { defaultViewMode: "table", defaultSortBy: "dateDesc", ... }
 *   );
 * 
 *   const viewMode = preferences.defaultViewMode; // "table" or "grid"
 *   const sortBy = preferences.defaultSortBy; // "dateDesc", "dateAsc", etc.
 * 
 *   // Use preferences to configure your list
 *   return <div>...</div>;
 * }
 * ```
 */

/**
 * PREFERENCES INTERFACE
 * 
 * The preferences object stored in localStorage has this shape:
 * 
 * ```typescript
 * interface InvoicePreferences {
 *   defaultViewMode: "table" | "grid";          // Default list view
 *   defaultSortBy: string;                       // "dateDesc", "dateAsc", "amountDesc", "amountAsc", "nameAsc"
 *   defaultPageSize: number;                     // 5, 10, 20, or 50
 *   showStatisticsOnHome: boolean;               // Show stats on homepage
 *   currency: string;                            // "RON", "EUR", "USD", "GBP"
 * }
 * ```
 */

/**
 * I18N KEYS USED
 * 
 * The component uses these translation keys from `Invoices.Shared.preferences`:
 * 
 * - title: "Invoice Preferences"
 * - defaultView: "Default View"
 * - sortBy: "Sort By"
 * - pageSize: "Items per Page"
 * - currency: "Currency"
 * - showStats: "Show statistics on home"
 * - save: "Save Preferences"
 * - saved: "Preferences saved successfully" (toast message)
 * - views.table: "Table View"
 * - views.grid: "Grid View"
 * - sortOptions.dateDesc: "Date (Newest First)"
 * - sortOptions.dateAsc: "Date (Oldest First)"
 * - sortOptions.amountDesc: "Amount (High to Low)"
 * - sortOptions.amountAsc: "Amount (Low to High)"
 * - sortOptions.nameAsc: "Name (A to Z)"
 */

export default InvoicePreferences;
