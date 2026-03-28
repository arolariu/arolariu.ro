"use client";

import type {Invoice} from "@/types/invoices";
import {useMemo} from "react";
import type {FilterState} from "../_components/filters/FilterBar";

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
 *   searchQuery: "grocery",
 *   dateFrom: new Date("2024-01-01"),
 *   dateTo: new Date("2024-12-31"),
 *   amountMin: 10,
 *   amountMax: 100,
 *   categories: [InvoiceCategory.GROCERY],
 *   paymentTypes: [PaymentType.Card],
 *   sortBy: "date-desc"
 * });
 * ```
 */
export function useFilteredInvoices(invoices: ReadonlyArray<Invoice>, filters: FilterState): ReadonlyArray<Invoice> {
  return useMemo(() => {
    let filtered = [...invoices];

    // Apply text search filter
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase().trim();
      filtered = filtered.filter((invoice) => {
        const nameMatch = invoice.name.toLowerCase().includes(query);
        const descriptionMatch = invoice.description.toLowerCase().includes(query);
        return nameMatch || descriptionMatch;
      });
    }

    // Apply date range filter
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((invoice) => {
        const transactionDate = new Date(invoice.paymentInformation.transactionDate);
        transactionDate.setHours(0, 0, 0, 0);
        return transactionDate >= fromDate;
      });
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((invoice) => {
        const transactionDate = new Date(invoice.paymentInformation.transactionDate);
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
          const dateA = new Date(a.paymentInformation.transactionDate).getTime();
          const dateB = new Date(b.paymentInformation.transactionDate).getTime();
          return dateB - dateA;
        });
        break;
      }
      case "date-asc": {
        sorted.sort((a, b) => {
          const dateA = new Date(a.paymentInformation.transactionDate).getTime();
          const dateB = new Date(b.paymentInformation.transactionDate).getTime();
          return dateA - dateB;
        });
        break;
      }
      case "amount-desc": {
        sorted.sort((a, b) => b.paymentInformation.totalCostAmount - a.paymentInformation.totalCostAmount);
        break;
      }
      case "amount-asc": {
        sorted.sort((a, b) => a.paymentInformation.totalCostAmount - b.paymentInformation.totalCostAmount);
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
          const dateA = new Date(a.paymentInformation.transactionDate).getTime();
          const dateB = new Date(b.paymentInformation.transactionDate).getTime();
          return dateB - dateA;
        });
      }
    }

    return sorted;
  }, [invoices, filters]);
}
