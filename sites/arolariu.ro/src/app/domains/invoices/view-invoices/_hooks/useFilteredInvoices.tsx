"use client";

import {getTransactionYear, toRON} from "@/lib/currency";
import {toSafeDate} from "@/lib/utils.generic";
import type {Invoice} from "@/types/invoices";
import {useMemo} from "react";
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
 *
 * **Sorting:**
 * Supports sorting by date, amount, and name in ascending/descending order.
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
 *   sortBy: "date-desc",
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

    // Apply category filter (OR logic)
    if (filters.categories.length > 0) {
      filtered = filtered.filter((invoice) => filters.categories.includes(invoice.category));
    }

    // Apply payment type filter (OR logic)
    if (filters.paymentTypes.length > 0) {
      filtered = filtered.filter((invoice) => filters.paymentTypes.includes(invoice.paymentInformation.paymentType));
    }

    // Apply sorting
    const sorted = [...filtered];
    switch (filters.sortBy) {
      case "date-desc": {
        sorted.sort((a, b) => {
          const dateA = toSafeDate(a.paymentInformation.transactionDate).getTime();
          const dateB = toSafeDate(b.paymentInformation.transactionDate).getTime();
          return dateB - dateA;
        });
        break;
      }
      case "date-asc": {
        sorted.sort((a, b) => {
          const dateA = toSafeDate(a.paymentInformation.transactionDate).getTime();
          const dateB = toSafeDate(b.paymentInformation.transactionDate).getTime();
          return dateA - dateB;
        });
        break;
      }
      case "amount-desc": {
        sorted.sort((a, b) => {
          const yearA = getTransactionYear(a.paymentInformation?.transactionDate, a.createdAt);
          const yearB = getTransactionYear(b.paymentInformation?.transactionDate, b.createdAt);
          const amountA = toRON(a.paymentInformation.totalCostAmount, a.paymentInformation.currency?.code ?? "RON", yearA);
          const amountB = toRON(b.paymentInformation.totalCostAmount, b.paymentInformation.currency?.code ?? "RON", yearB);
          return amountB - amountA;
        });
        break;
      }
      case "amount-asc": {
        sorted.sort((a, b) => {
          const yearA = getTransactionYear(a.paymentInformation?.transactionDate, a.createdAt);
          const yearB = getTransactionYear(b.paymentInformation?.transactionDate, b.createdAt);
          const amountA = toRON(a.paymentInformation.totalCostAmount, a.paymentInformation.currency?.code ?? "RON", yearA);
          const amountB = toRON(b.paymentInformation.totalCostAmount, b.paymentInformation.currency?.code ?? "RON", yearB);
          return amountA - amountB;
        });
        break;
      }
      case "name-asc": {
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      }
      case "name-desc": {
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      }
      default: {
        // Default to date descending
        sorted.sort((a, b) => {
          const dateA = toSafeDate(a.paymentInformation.transactionDate).getTime();
          const dateB = toSafeDate(b.paymentInformation.transactionDate).getTime();
          return dateB - dateA;
        });
      }
    }

    return sorted;
  }, [invoices, filters]);
}
