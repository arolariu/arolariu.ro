"use client";

import {getTransactionYear, toRON} from "@/lib/currency";
import {toSafeDate} from "@/lib/utils.generic";
import type {Invoice} from "@/types/invoices";
import {useMemo} from "react";
import {getClassificationGroup} from "../../_utils/labelUtilities";
import type {FilterState} from "./useInvoiceFilters";

/**
 * Custom hook for filtering and sorting invoices based on filter criteria.
 *
 * @remarks
 * This hook applies all filter criteria and sorting logic to a list of invoices.
 * It uses `useMemo` for performance optimization to avoid unnecessary recalculations.
 *
 * **Filtering Logic:**
 * - Text search: Searches invoice name and description (case-insensitive)
 * - Date range: Filters by transaction date (inclusive)
 * - Amount range: Filters by total cost amount (inclusive)
 * - Categories: Multi-select filter (OR logic)
 * - Payment types: Multi-select filter (OR logic)
 * - Currencies: Multi-select filter (OR logic) on `invoice.paymentInformation.currency.code`,
 *   with `"RON"` as the fallback for invoices missing a currency code (matches the
 *   codebase-wide default in `_utils/statistics.ts`).
 *
 * **Sorting:**
 * Supports sorting by date, amount, and name with separate field and direction parameters.
 *
 * @param invoices - Array of invoices to filter
 * @param filters - Filter state containing all filter criteria
 * @returns Filtered and sorted array of invoices
 *
 * @example
 * ```tsx
 * const filteredInvoices = useFilteredInvoices(allInvoices, {
 *   search: "grocery",
 *   dateFrom: "2024-01-01", // ISO date string
 *   dateTo: "2024-12-31", // ISO date string
 *   amountMin: 10,
 *   amountMax: 100,
 *   categories: [InvoiceCategory.GROCERY],
 *   paymentTypes: [PaymentType.Card],
 *   sortBy: "date",
 *   sortOrder: "desc",
 *   view: "table"
 * });
 * ```
 */
export function useFilteredInvoices(invoices: ReadonlyArray<Invoice>, filters: FilterState): ReadonlyArray<Invoice> {
  return useMemo(() => {
    let filtered = [...invoices];

    // Apply text search filter
    if (filters.search.trim()) {
      const query = filters.search.toLowerCase().trim();
      filtered = filtered.filter((invoice) => {
        const nameMatch = invoice.name.toLowerCase().includes(query);
        const descriptionMatch = invoice.description.toLowerCase().includes(query);
        return nameMatch || descriptionMatch;
      });
    }

    // Apply date range filter (dates come as ISO strings from URL)
    if (filters.dateFrom) {
      const fromDate = toSafeDate(filters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((invoice) => {
        const transactionDate = toSafeDate(invoice.paymentInformation.transactionDate);
        transactionDate.setHours(0, 0, 0, 0);
        return transactionDate >= fromDate;
      });
    }

    if (filters.dateTo) {
      const toDate = toSafeDate(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((invoice) => {
        const transactionDate = toSafeDate(invoice.paymentInformation.transactionDate);
        return transactionDate <= toDate;
      });
    }

    // Apply amount range filter
    if (filters.amountMin !== null) {
      filtered = filtered.filter((invoice) => invoice.paymentInformation.totalCostAmount >= filters.amountMin!);
    }

    if (filters.amountMax !== null) {
      filtered = filtered.filter((invoice) => invoice.paymentInformation.totalCostAmount <= filters.amountMax!);
    }

    // Apply classification group filter (OR logic).
    // Invoices with null classification are excluded from group-specific filters
    // but are included when classificationGroups is empty ("All").
    if (filters.classificationGroups.length > 0) {
      filtered = filtered.filter((invoice) => {
        const group = getClassificationGroup(invoice.classification ?? null);
        return group !== null && filters.classificationGroups.includes(group);
      });
    }

    // Apply payment type filter (OR logic)
    if (filters.paymentTypes.length > 0) {
      filtered = filtered.filter((invoice) => filters.paymentTypes.includes(invoice.paymentInformation.paymentType));
    }

    // Apply currency filter (OR logic, like categories / paymentTypes).
    // Falls back to "RON" for invoices missing currency.code — matches the
    // codebase-wide default established in _utils/statistics.ts.
    if (filters.currencies.length > 0) {
      filtered = filtered.filter((invoice) => filters.currencies.includes(invoice.paymentInformation.currency?.code || "RON"));
    }

    // Apply sorting (only if both sortBy and sortOrder are set)
    const sorted = [...filtered];
    if (filters.sortBy !== null && filters.sortOrder !== null) {
      const {sortBy: sortField, sortOrder} = filters;
      const direction = sortOrder === "asc" ? 1 : -1;

      switch (sortField) {
        case "date": {
          sorted.sort((a, b) => {
            const dateA = toSafeDate(a.paymentInformation.transactionDate).getTime();
            const dateB = toSafeDate(b.paymentInformation.transactionDate).getTime();
            return direction * (dateA - dateB);
          });
          break;
        }
        case "amount": {
          sorted.sort((a, b) => {
            const yearA = getTransactionYear(a.paymentInformation?.transactionDate, a.createdAt);
            const yearB = getTransactionYear(b.paymentInformation?.transactionDate, b.createdAt);
            const amountA = toRON(a.paymentInformation.totalCostAmount, a.paymentInformation.currency?.code ?? "RON", yearA);
            const amountB = toRON(b.paymentInformation.totalCostAmount, b.paymentInformation.currency?.code ?? "RON", yearB);
            return direction * (amountA - amountB);
          });
          break;
        }
        case "name": {
          sorted.sort((a, b) => direction * a.name.localeCompare(b.name));
          break;
        }
        default: {
          // sortBy ultimately comes from URL params via a type assertion, so a malformed
          // or legacy URL (e.g., ?sortBy=foo) can deliver a value outside the declared
          // union. Treat unknown sort fields as "no sort applied" rather than crashing.
          break;
        }
      }
    }
    // If no sort params, return in natural order (no sorting)

    return sorted;
  }, [invoices, filters]);
}
