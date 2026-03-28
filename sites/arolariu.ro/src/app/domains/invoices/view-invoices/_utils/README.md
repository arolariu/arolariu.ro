# View Invoices Utilities

This directory contains utility functions for the invoices list view and statistics dashboard.

## Files

### `statistics.ts`

Cross-invoice aggregate statistics utilities for computing analytics across multiple invoices.

**Exports:**

- **Types:**
  - `KPIData` - Key Performance Indicators
  - `MonthlySpending` - Monthly spending aggregates
  - `CategoryAggregate` - Category breakdown data
  - `MerchantAggregate` - Merchant spending analysis
  - `DailySpending` - Daily spending for heatmaps
  - `PriceBucket` - Price distribution buckets
  - `TimeOfDaySegment` - Time-of-day shopping patterns
  - `MonthComparison` - Month-over-month comparison

- **Functions:**
  - `computeKPIs()` - Calculate KPI summary metrics
  - `computeMonthlySpending()` - Generate monthly trend data
  - `computeCategoryAggregates()` - Aggregate spending by category
  - `computeMerchantAggregates()` - Aggregate spending by merchant
  - `computeDailySpending()` - Generate daily spending data
  - `computePriceDistribution()` - Calculate price distribution
  - `computeTimeOfDay()` - Analyze time-of-day patterns
  - `computeMonthComparison()` - Compare current vs previous month
  - `getCategoryLabel()` - Convert category ID to label
  - `getPaymentTypeLabel()` - Convert payment type ID to label

**Usage Example:**

```typescript
import type {Invoice} from "@/types/invoices";
import {computeKPIs, computeMonthlySpending, computeCategoryAggregates} from "./_utils/statistics";

// Fetch invoices from API or state
const invoices: Invoice[] = await fetchInvoices();

// Compute KPIs for dashboard
const kpis = computeKPIs(invoices);
console.log(`Total Spending: ${kpis.currency} ${kpis.totalSpending}`);
console.log(`Average per Invoice: ${kpis.averagePerInvoice.toFixed(2)}`);
console.log(`Most Frequent Merchant: ${kpis.mostFrequentMerchant?.id}`);

// Generate monthly trend chart data
const monthlyData = computeMonthlySpending(invoices);
const chartData = monthlyData.map((m) => ({
  month: m.month,
  amount: m.amount,
  count: m.invoiceCount,
}));

// Category breakdown for pie chart
const categories = computeCategoryAggregates(invoices);
const pieData = categories.map((c) => ({
  name: c.category,
  value: c.amount,
  percentage: c.percentage,
}));
```

### `export.ts`

Export functionality for invoices data (CSV, JSON, PDF).

## Design Principles

1. **Pure Functions** - All statistics functions are pure with no side effects
2. **Type Safety** - TypeScript strict mode with explicit return types
3. **Safe Access** - Uses optional chaining and nullish coalescing for robustness
4. **Performance** - O(n) complexity for most operations
5. **Currency-Aware** - Handles multi-currency scenarios gracefully
6. **Locale-Aware** - Uses Intl APIs for internationalization

## Testing

Unit tests for these utilities should be added in:
- `sites/arolariu.ro/src/app/domains/invoices/view-invoices/__tests__/statistics.test.ts`

Example test:

```typescript
import {describe, it, expect} from "vitest";
import {computeKPIs} from "./_utils/statistics";
import {InvoiceBuilder} from "@/data/mocks";

describe("computeKPIs", () => {
  it("should return zeroed metrics for empty array", () => {
    const kpis = computeKPIs([]);
    expect(kpis.totalSpending).toBe(0);
    expect(kpis.invoiceCount).toBe(0);
    expect(kpis.currency).toBe("RON");
  });

  it("should calculate total spending correctly", () => {
    const invoices = [
      new InvoiceBuilder().withAmount(100).build(),
      new InvoiceBuilder().withAmount(200).build(),
    ];
    const kpis = computeKPIs(invoices);
    expect(kpis.totalSpending).toBe(300);
    expect(kpis.averagePerInvoice).toBe(150);
  });
});
```

## Integration Points

These utilities are designed to integrate with:

- **Dashboard Components** - KPI cards, charts, heatmaps
- **Zustand Store** - Cache computed statistics
- **Chart Libraries** - Recharts, Chart.js, Victory
- **Export Functions** - CSV/JSON export utilities

## Performance Notes

- All functions are O(n) or O(n log n) complexity
- For datasets >10k invoices, consider:
  - Pagination
  - Web Workers for background computation
  - Memoization with Zustand
  - Virtual scrolling for large lists

## References

- [RFC-1002: JSDoc Documentation Standard](../../../../docs/rfc/1002-comprehensive-jsdoc-documentation-standard.md)
- [Invoice Type Definitions](../../../../types/invoices/Invoice.ts)
- [Product Type Definitions](../../../../types/invoices/Product.ts)
- [Payment Type Definitions](../../../../types/invoices/Payment.ts)
