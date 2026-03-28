/**
 * @fileoverview Invoice-specific command palette with quick actions and search.
 * @module app/domains/invoices/_components/InvoiceCommandPalette
 *
 * @remarks
 * Provides a domain-specific command palette for the invoices domain that extends
 * the global commander with invoice-specific actions and search capabilities.
 *
 * **Features:**
 * - Search across invoice names and merchant references
 * - Quick navigation actions (upload, create, stats, view all)
 * - Recent invoices display (last 5 from store)
 * - Keyboard navigation (arrows, enter, escape)
 * - Fuzzy-ish matching (case-insensitive includes)
 *
 * **Integration:**
 * Listens for the `open-invoice-command-palette` custom event dispatched by
 * the KeyboardShortcuts component when Ctrl/Cmd+K is pressed.
 *
 * @see {@link KeyboardShortcuts}
 * @see {@link useInvoicesStore}
 */

"use client";

import {useInvoicesStore} from "@/stores";
import {CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {useCallback, useEffect, useMemo, useState} from "react";
import {TbCamera, TbChartBar, TbFileInvoice, TbPlus, TbReceipt} from "react-icons/tb";
import {toast} from "@arolariu/components";
import {useShallow} from "zustand/react/shallow";
import styles from "./InvoiceCommandPalette.module.scss";

/**
 * Props for the {@link InvoiceCommandPalette} component.
 */
type Props = {
  /** Whether the command palette dialog is open */
  open: boolean;
  /** Callback to change the open state */
  onOpenChange: (open: boolean) => void;
};

/**
 * Invoice command palette component for quick actions and search.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` directive).
 *
 * **Search Capabilities:**
 * - Filters invoices by name using case-insensitive substring matching
 * - Displays matching invoices with name, amount, and date
 * - Each result navigates to the invoice detail page
 *
 * **Quick Actions:**
 * - Upload Scans: Navigate to `/domains/invoices/upload-scans`
 * - Create Invoice: Navigate to `/domains/invoices/create-invoice`
 * - View Statistics: Navigate to `/domains/invoices` (main page with stats)
 * - View All Invoices: Navigate to `/domains/invoices/view-invoices`
 *
 * **Recent Invoices:**
 * - Displays the last 5 invoices from the Zustand store
 * - Sorted by creation date (newest first)
 * - Shows invoice name, formatted amount, and relative date
 *
 * @param props - Component props containing open state and change handler.
 * @returns The invoice command palette dialog.
 *
 * @example
 * ```tsx
 * function InvoiceLayout() {
 *   const [open, setOpen] = useState(false);
 *
 *   return (
 *     <InvoiceCommandPalette open={open} onOpenChange={setOpen} />
 *   );
 * }
 * ```
 */
export default function InvoiceCommandPalette({open, onOpenChange}: Readonly<Props>): React.JSX.Element {
  const router = useRouter();
  const t = useTranslations("Invoices.Shared.commandPalette");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Select only the invoices we need from the store using useShallow
  const invoices = useInvoicesStore(useShallow((state) => state.invoices));

  /**
   * Helper to close the palette and run a command action.
   */
  const runCommand = useCallback(
    (command: () => void) => {
      onOpenChange(false);
      command();
    },
    [onOpenChange],
  );

  /**
   * Navigate to upload scans page.
   */
  const handleUploadScans = useCallback(
    (_: string) => {
      runCommand(() => {
        router.push("/domains/invoices/upload-scans");
        toast.success(t("actions.uploadScans"));
      });
    },
    [router, runCommand, t],
  );

  /**
   * Navigate to create invoice page.
   */
  const handleCreateInvoice = useCallback(
    (_: string) => {
      runCommand(() => {
        router.push("/domains/invoices/create-invoice");
        toast.success(t("actions.createInvoice"));
      });
    },
    [router, runCommand, t],
  );

  /**
   * Navigate to statistics page (main invoices page).
   */
  const handleViewStatistics = useCallback(
    (_: string) => {
      runCommand(() => {
        router.push("/domains/invoices");
        toast.success(t("actions.viewStatistics"));
      });
    },
    [router, runCommand, t],
  );

  /**
   * Navigate to view all invoices page.
   */
  const handleViewAllInvoices = useCallback(
    (_: string) => {
      runCommand(() => {
        router.push("/domains/invoices/view-invoices");
        toast.success(t("actions.viewAll"));
      });
    },
    [router, runCommand, t],
  );

  /**
   * Navigate to a specific invoice detail page.
   */
  const handleViewInvoice = useCallback(
    (invoiceId: string) => (_: string) => {
      runCommand(() => {
        router.push(`/domains/invoices/view-invoice/${invoiceId}`);
      });
    },
    [router, runCommand],
  );

  /**
   * Get the 5 most recent invoices sorted by creation date.
   */
  const recentInvoices = useMemo(() => {
    return [...invoices].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  }, [invoices]);

  /**
   * Filter invoices based on search query (case-insensitive substring match on name).
   */
  const filteredInvoices = useMemo(() => {
    if (!searchQuery.trim()) {
      return [];
    }

    const query = searchQuery.toLowerCase().trim();
    return invoices.filter((invoice) => invoice.name.toLowerCase().includes(query));
  }, [invoices, searchQuery]);

  /**
   * Format currency amount for display.
   */
  const formatAmount = useCallback((amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }, []);

  /**
   * Format date as relative time (e.g., "2 days ago").
   */
  const formatRelativeDate = useCallback((date: Date | string): string => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Today";
    }
    if (diffDays === 1) {
      return "Yesterday";
    }
    if (diffDays < 7) {
      return `${diffDays} days ago`;
    }
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
    }
    const months = Math.floor(diffDays / 30);
    return `${months} ${months === 1 ? "month" : "months"} ago`;
  }, []);

  /**
   * Listen for the custom event from KeyboardShortcuts to open the palette.
   */
  useEffect(() => {
    const handleOpenPalette = () => {
      onOpenChange(true);
    };

    window.addEventListener("open-invoice-command-palette", handleOpenPalette);
    return () => {
      window.removeEventListener("open-invoice-command-palette", handleOpenPalette);
    };
  }, [onOpenChange]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}>
      <CommandInput
        placeholder={t("placeholder")}
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList>
        <CommandEmpty>{t("noResults")}</CommandEmpty>

        {/* Quick Actions Group */}
        <CommandGroup heading={t("groups.quickActions")}>
          <CommandItem onSelect={handleUploadScans}>
            <div className={styles["commandItemContent"]}>
              <TbCamera className={styles["commandIcon"]} />
              <span>{t("actions.uploadScans")}</span>
            </div>
          </CommandItem>
          <CommandItem onSelect={handleCreateInvoice}>
            <div className={styles["commandItemContent"]}>
              <TbPlus className={styles["commandIcon"]} />
              <span>{t("actions.createInvoice")}</span>
            </div>
          </CommandItem>
          <CommandItem onSelect={handleViewStatistics}>
            <div className={styles["commandItemContent"]}>
              <TbChartBar className={styles["commandIcon"]} />
              <span>{t("actions.viewStatistics")}</span>
            </div>
          </CommandItem>
          <CommandItem onSelect={handleViewAllInvoices}>
            <div className={styles["commandItemContent"]}>
              <TbFileInvoice className={styles["commandIcon"]} />
              <span>{t("actions.viewAll")}</span>
            </div>
          </CommandItem>
        </CommandGroup>

        {/* Search Results Group (only show when there's a search query and results) */}
        {searchQuery.trim() && filteredInvoices.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t("groups.searchResults")}>
              {filteredInvoices.map((invoice) => (
                <CommandItem
                  key={invoice.id}
                  onSelect={handleViewInvoice(invoice.id)}>
                  <div className={styles["commandItemContent"]}>
                    <TbReceipt className={styles["commandIcon"]} />
                    <div className={styles["invoiceDetails"]}>
                      <span className={styles["invoiceName"]}>{invoice.name}</span>
                      <span className={styles["invoiceMeta"]}>
                        {formatAmount(invoice.paymentInformation.totalCostAmount)} • {formatRelativeDate(invoice.createdAt)}
                      </span>
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Recent Invoices Group (only show when no search query) */}
        {!searchQuery.trim() && recentInvoices.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t("groups.recentInvoices")}>
              {recentInvoices.map((invoice) => (
                <CommandItem
                  key={invoice.id}
                  onSelect={handleViewInvoice(invoice.id)}>
                  <div className={styles["commandItemContent"]}>
                    <TbReceipt className={styles["commandIcon"]} />
                    <div className={styles["invoiceDetails"]}>
                      <span className={styles["invoiceName"]}>{invoice.name}</span>
                      <span className={styles["invoiceMeta"]}>
                        {formatAmount(invoice.paymentInformation.totalCostAmount)} • {formatRelativeDate(invoice.createdAt)}
                      </span>
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
