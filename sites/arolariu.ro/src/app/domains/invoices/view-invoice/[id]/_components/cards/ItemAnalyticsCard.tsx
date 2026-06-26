"use client";

/**
 * @fileoverview Item-level analytics card with search, sort, and detailed product display.
 * @module domains/invoices/view-invoice/[id]/components/cards/ItemAnalyticsCard
 *
 * @remarks
 * **Rendering Context**: Client Component ("use client" directive).
 *
 * **Purpose:**
 * Provides an enhanced, interactive table view of all invoice items with:
 * - Real-time search filtering by product name
 * - Multi-column sorting (name, category, price, quantity)
 * - Category color-coded badges
 * - Allergen warnings with detailed tooltips
 * - Summary statistics (most/least expensive, category/allergen counts)
 * - Total row aggregations
 *
 * **Data Flow:**
 * Consumes `invoice.items` via `useInvoiceContext()` from InvoiceContext.
 * All filtering and sorting is computed client-side using memoized transformations.
 *
 * **Performance:**
 * - `useMemo` for filtered and sorted item lists to prevent unnecessary recomputations
 * - `useCallback` for sort handlers to stabilize event handler references
 * - Motion animations for entrance effects
 *
 * **Accessibility:**
 * - Semantic HTML table structure with proper ARIA labels
 * - Keyboard navigation for sort toggles
 * - Tooltips for allergen warnings
 * - Search input with descriptive placeholder
 *
 * @example
 * ```tsx
 * // In island.tsx center column
 * <div className={styles["centerItem"]}>
 *   <ItemAnalyticsCard />
 * </div>
 * ```
 *
 * @see {@link useInvoiceContext} for invoice data access
 */

import {formatEnum} from "@/lib/utils.generic";
import {ProductCategory} from "@/types/invoices";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@arolariu/components";
import {motion} from "motion/react";
import {useLocale} from "next-intl";
import {useTranslations} from "next-intl-selector";
import {useCallback, useMemo, useState} from "react";
import {TbAlertTriangle, TbArrowsSort, TbSearch, TbShoppingCart} from "react-icons/tb";
import {useInvoiceContext} from "../../_context/InvoiceContext";
import styles from "./ItemAnalyticsCard.module.scss";

/**
 * Sort field options for item sorting.
 *
 * @remarks
 * Defines which property of Product to sort by.
 * Each field corresponds to a sortable table column.
 */
type SortField = "name" | "category" | "price" | "quantity";

/**
 * Sort direction for ascending or descending order.
 */
type SortDirection = "asc" | "desc";

/**
 * Maps ProductCategory enum values to badge color variants.
 *
 * @remarks
 * Provides visual differentiation for product categories in the table.
 * Colors align with UI design system badge variants.
 *
 * @see {@link ProductCategory} for category definitions
 */
const categoryColors: Record<number, "default" | "secondary" | "outline" | "destructive"> = {
  [ProductCategory.NOT_DEFINED]: "secondary",
  [ProductCategory.BAKED_GOODS]: "default",
  [ProductCategory.GROCERIES]: "default",
  [ProductCategory.DAIRY]: "outline",
  [ProductCategory.MEAT]: "destructive",
  [ProductCategory.FISH]: "outline",
  [ProductCategory.FRUITS]: "default",
  [ProductCategory.VEGETABLES]: "default",
  [ProductCategory.BEVERAGES]: "secondary",
  [ProductCategory.ALCOHOLIC_BEVERAGES]: "destructive",
  [ProductCategory.TOBACCO]: "destructive",
  [ProductCategory.CLEANING_SUPPLIES]: "secondary",
  [ProductCategory.PERSONAL_CARE]: "secondary",
  [ProductCategory.MEDICINE]: "outline",
  [ProductCategory.OTHER]: "secondary",
};

/** Minimal interface for sortable item fields used by the sort comparator. */
type SortableItem = {
  readonly name: string;
  readonly category: number;
  readonly totalPrice: number;
  readonly quantity: number;
};

/**
 * Pure comparator for two sortable items based on the active sort field.
 * Extracted to module scope to avoid a mutable `let` variable inside the useMemo callback.
 */
function resolveSortComparison(a: SortableItem, b: SortableItem, sortField: SortField, locale: string): number {
  switch (sortField) {
    case "name":
      return a.name.localeCompare(b.name, locale);
    case "category":
      return a.category - b.category;
    case "price":
      return a.totalPrice - b.totalPrice;
    case "quantity":
      return a.quantity - b.quantity;
    default: {
      const _exhaustive: never = sortField;
      throw new Error(`Unhandled sortField: ${String(_exhaustive)}`);
    }
  }
}

/**
 * Returns the Badge variant for a given OCR confidence score.
 * Extracted to module scope to avoid nested ternaries inside the render map.
 */
function getConfidenceVariant(confidence: number): "default" | "secondary" | "destructive" {
  if (confidence >= 0.9) return "default";
  if (confidence >= 0.7) return "secondary";
  return "destructive";
}

/**
 * Returns the confidence symbol character for a given OCR confidence score.
 * Extracted to module scope to avoid nested ternaries inside the render map.
 */
function getConfidenceSymbol(confidence: number): string {
  if (confidence >= 0.9) return "✓";
  if (confidence >= 0.7) return "~";
  return "!";
}

/**
 * Selects the pre-translated confidence level label from the three candidates.
 * Extracted to module scope to avoid nested ternaries inside the render map.
 *
 * @param confidence - OCR confidence value between 0 and 1
 * @param high - Pre-translated "high" label
 * @param medium - Pre-translated "medium" label
 * @param low - Pre-translated "low" label
 */
function getConfidenceLevel(confidence: number, high: string, medium: string, low: string): string {
  if (confidence >= 0.9) return high;
  if (confidence >= 0.7) return medium;
  return low;
}

/**
 * Enhanced item-level analytics card with interactive table, search, and sorting.
 *
 * @remarks
 * **Features:**
 * - Search input filters items by `name`
 * - Sortable columns: Name, Category, Price, Quantity
 * - Total row with quantity and price aggregations
 * - Summary section with key statistics
 * - Category badges with color coding
 * - Allergen warning badges with tooltips
 * - Empty state handling
 * - Motion entrance animation
 *
 * **Component State:**
 * - `searchQuery`: User's search input
 * - `sortField`: Currently active sort field
 * - `sortDirection`: Current sort direction (asc/desc)
 *
 * **Data Transformations:**
 * 1. Filter by search query (memoized)
 * 2. Sort by selected field and direction (memoized)
 * 3. Compute totals and statistics (memoized)
 *
 * @returns Rendered card component with items table
 */
export function ItemAnalyticsCard(): React.JSX.Element {
  const locale = useLocale();
  const t = useTranslations();
  const {invoice} = useInvoiceContext();

  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  /**
   * Filters items based on search query.
   *
   * @remarks
   * Searches against product name for comprehensive matching.
   * Case-insensitive search using locale-aware lowercase transformation.
   *
   * **Performance:** Memoized to recompute only when items or query change.
   */
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return invoice.items;

    const query = searchQuery.toLowerCase();
    return invoice.items.filter((item) => item.name.toLowerCase().includes(query));
  }, [invoice.items, searchQuery]);

  /**
   * Sorts filtered items by selected field and direction.
   *
   * @remarks
   * Uses `Array#toSorted()` (ES2023) to avoid in-place mutation.
   * Implements locale-aware string comparison for names.
   *
   * **Sort Logic:**
   * - `name`: Sorts by `name` using locale collation
   * - `category`: Sorts by `category` enum numeric value
   * - `price`: Sorts by `totalPrice` (total, not unit price)
   * - `quantity`: Sorts by `quantity`
   *
   * **Performance:** Memoized to recompute only when dependencies change.
   */
  const sortedItems = useMemo(() => {
    return filteredItems.toSorted((a, b) => {
      const comparison = resolveSortComparison(a, b, sortField, locale);
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredItems, sortField, sortDirection, locale]);

  /**
   * Computes aggregated totals for quantity and price.
   *
   * @remarks
   * Sums all items (not filtered items) for accurate invoice totals.
   * Uses `reduce` with explicit typing for type safety.
   *
   * **Performance:** Memoized to recompute only when items change.
   */
  const totals = useMemo(() => {
    let quantity = 0;
    let price = 0;
    for (const item of invoice.items) {
      quantity += item.quantity;
      price += item.totalPrice;
    }
    return {quantity, price};
  }, [invoice.items]);

  /**
   * Computes summary statistics for the items list.
   *
   * @remarks
   * Identifies:
   * - Most expensive item by `totalPrice`
   * - Least expensive item by `totalPrice`
   * - Unique category count
   * - Unique allergen count across all items
   *
   * **Performance:** Memoized to recompute only when items change.
   */
  const summary = useMemo(() => {
    if (invoice.items.length === 0) {
      return {
        mostExpensive: null,
        cheapest: null,
        categoryCount: 0,
        allergenCount: 0,
      };
    }

    const sortedByPrice = invoice.items.toSorted((a, b) => b.totalPrice - a.totalPrice);
    const uniqueCategories = new Set(invoice.items.map((item) => item.category));
    const allAllergens = new Set(invoice.items.flatMap((item) => item.detectedAllergens.map((allergen) => allergen.name)));

    return {
      mostExpensive: sortedByPrice[0],
      cheapest: sortedByPrice.at(-1),
      categoryCount: uniqueCategories.size,
      allergenCount: allAllergens.size,
    };
  }, [invoice.items]);

  /**
   * Toggles sort field and direction.
   *
   * @remarks
   * If clicking the same field, toggles direction (asc ↔ desc).
   * If clicking a new field, sets that field with ascending direction.
   *
   * **Stabilization:** Wrapped in `useCallback` to prevent handler recreation.
   *
   * @param field - The field to sort by
   */
  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDirection("asc");
      }
    },
    [sortField],
  );

  /** Updates the search query as the user types in the search input. */
  const handleSearchQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  /** Sorts items by the "name" column. */
  const handleSortByName = useCallback(() => handleSort("name"), [handleSort]);

  /** Sorts items by the "category" column. */
  const handleSortByCategory = useCallback(() => handleSort("category"), [handleSort]);

  /** Sorts items by the "price" column. */
  const handleSortByPrice = useCallback(() => handleSort("price"), [handleSort]);

  /** Sorts items by the "quantity" column. */
  const handleSortByQuantity = useCallback(() => handleSort("quantity"), [handleSort]);

  /**
   * Retrieves the display name for a product category.
   *
   * @remarks
   * Uses ProductCategory const-object to get the category name.
   * Returns "NOT_DEFINED" for unknown categories.
   *
   * @param category - The category enum value
   * @returns The category name string
   */
  const getCategoryName = useCallback((category: ProductCategory): string => {
    return formatEnum(ProductCategory, category) || "NOT_DEFINED";
  }, []);

  // Empty state: no items in invoice
  if (invoice.items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className={styles["titleRow"]}>
            <TbShoppingCart className={styles["iconTitle"]} />
            {t((m) => m.pages.invoices.viewInvoice.itemAnalytics.title)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles["emptyState"]}>
            <TbShoppingCart className={styles["emptyIcon"]} />
            <h3 className={styles["emptyTitle"]}>{t((m) => m.pages.invoices.viewInvoice.itemAnalytics.empty.title)}</h3>
            <p className={styles["emptySubtitle"]}>{t((m) => m.pages.invoices.viewInvoice.itemAnalytics.empty.subtitle)}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Pre-translate confidence level labels once per render so the map callback
  // can use getConfidenceLevel() without nested ternaries.
  const confidenceLevelHigh = t((m) => m.pages.invoices.viewInvoice.itemAnalytics.confidence.high);
  const confidenceLevelMedium = t((m) => m.pages.invoices.viewInvoice.itemAnalytics.confidence.medium);
  const confidenceLevelLow = t((m) => m.pages.invoices.viewInvoice.itemAnalytics.confidence.low);

  return (
    <motion.div
      initial={{opacity: 0, y: 20}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.4}}>
      <Card>
        <CardHeader>
          <CardTitle className={styles["titleRow"]}>
            <TbShoppingCart className={styles["iconTitle"]} />
            {t((m) => m.pages.invoices.viewInvoice.itemAnalytics.title)} ({invoice.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles["contentSpaced"]}>
            {/* Search Row */}
            <div className={styles["searchRow"]}>
              <div className={styles["searchInputWrapper"]}>
                <TbSearch className={styles["searchIcon"]} />
                <Input
                  type='text'
                  placeholder={t((m) => m.pages.invoices.viewInvoice.itemAnalytics.searchPlaceholder)}
                  value={searchQuery}
                  onChange={handleSearchQueryChange}
                  className={styles["searchInput"]}
                />
              </div>
            </div>

            {/* Items Table */}
            <div className={styles["tableContainer"]}>
              <TooltipProvider>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <button
                          type='button'
                          onClick={handleSortByName}
                          className={styles["sortButton"]}>
                          {t((m) => m.pages.invoices.viewInvoice.itemAnalytics.columns.name)}
                          <TbArrowsSort className={styles["sortIcon"]} />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          type='button'
                          onClick={handleSortByCategory}
                          className={styles["sortButton"]}>
                          {t((m) => m.pages.invoices.viewInvoice.itemAnalytics.columns.category)}
                          <TbArrowsSort className={styles["sortIcon"]} />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          type='button'
                          onClick={handleSortByPrice}
                          className={styles["sortButton"]}>
                          {t((m) => m.pages.invoices.viewInvoice.itemAnalytics.columns.price)}
                          <TbArrowsSort className={styles["sortIcon"]} />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          type='button'
                          onClick={handleSortByQuantity}
                          className={styles["sortButton"]}>
                          {t((m) => m.pages.invoices.viewInvoice.itemAnalytics.columns.quantity)}
                          <TbArrowsSort className={styles["sortIcon"]} />
                        </button>
                      </TableHead>
                      <TableHead>{t((m) => m.pages.invoices.viewInvoice.itemAnalytics.columns.total)}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedItems.map((item) => {
                      // Extract confidence-based values using module-scope helpers to avoid nested ternaries
                      const {confidence} = item.metadata;
                      const confidenceVariant = getConfidenceVariant(confidence);
                      const confidenceSymbol = getConfidenceSymbol(confidence);
                      const confidenceLevel = getConfidenceLevel(confidence, confidenceLevelHigh, confidenceLevelMedium, confidenceLevelLow);

                      return (
                      <TableRow key={item.productCode ?? item.name}>
                        <TableCell>
                          <div className={styles["itemCell"]}>
                            <div className={styles["itemNameRow"]}>
                              <div className={styles["itemName"]}>{item.name}</div>
                              {/* OCR Confidence Indicator - New DI v4.0 field */}
                              {confidence > 0 && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge
                                      variant={confidenceVariant}
                                      className={styles["confidenceBadge"]}
                                      aria-label={t((m) => m.pages.invoices.viewInvoice.itemAnalytics.confidence.ariaLabel, {
                                        level: confidenceLevel,
                                        percent: (confidence * 100).toFixed(0),
                                      })}>
                                      {confidenceSymbol}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className={styles["confidenceTooltip"]}>
                                      {t((m) => m.pages.invoices.viewInvoice.itemAnalytics.confidence.label)}:{" "}
                                      {(confidence * 100).toFixed(0)}%
                                    </p>
                                    {confidence < 0.7 && (
                                      <p className={styles["confidenceWarning"]}>
                                        {t((m) => m.pages.invoices.viewInvoice.itemAnalytics.confidence.lowWarning)}
                                      </p>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                            {item.detectedAllergens.length > 0 && (
                              <div className={styles["allergenList"]}>
                                {item.detectedAllergens.map((allergen) => (
                                  <Tooltip key={allergen.name}>
                                    <TooltipTrigger>
                                      <Badge
                                        variant='destructive'
                                        className={styles["allergenBadge"]}>
                                        <TbAlertTriangle className={styles["allergenIcon"]} />
                                        {allergen.name}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className={styles["allergenDescription"]}>{allergen.description}</p>
                                      {allergen.learnMoreAddress ? (
                                        <a
                                          href={allergen.learnMoreAddress}
                                          target='_blank'
                                          rel='noopener noreferrer'
                                          className={styles["allergenLink"]}>
                                          Learn more →
                                        </a>
                                      ) : null}
                                    </TooltipContent>
                                  </Tooltip>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={categoryColors[item.category]}>{getCategoryName(item.category)}</Badge>
                        </TableCell>
                        <TableCell>{item.price.toFixed(2)}</TableCell>
                        <TableCell>
                          {item.quantity} {item.quantityUnit}
                        </TableCell>
                        <TableCell>{item.totalPrice.toFixed(2)}</TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TooltipProvider>
            </div>

            {/* Total Row */}
            <div className={styles["totalRow"]}>
              <div className={styles["totalLabel"]}>{t((m) => m.pages.invoices.viewInvoice.itemAnalytics.totalLabel)}</div>
              <div className={styles["totalValues"]}>
                <div className={styles["totalQuantity"]}>{totals.quantity}</div>
                <div className={styles["totalPrice"]}>{totals.price.toFixed(2)}</div>
              </div>
            </div>

            {/* Summary Section */}
            <div className={styles["summarySection"]}>
              <h4 className={styles["summaryTitle"]}>📊 {t((m) => m.pages.invoices.viewInvoice.itemAnalytics.summary.title)}</h4>
              <ul className={styles["summaryList"]}>
                {summary.mostExpensive ? (
                  <li className={styles["summaryItem"]}>
                    • {t((m) => m.pages.invoices.viewInvoice.itemAnalytics.summary.mostExpensive)}:{" "}
                    <strong>{summary.mostExpensive.name}</strong> ({summary.mostExpensive.totalPrice.toFixed(2)})
                  </li>
                ) : null}
                {summary.cheapest ? (
                  <li className={styles["summaryItem"]}>
                    • {t((m) => m.pages.invoices.viewInvoice.itemAnalytics.summary.cheapest)}: <strong>{summary.cheapest.name}</strong> (
                    {summary.cheapest.totalPrice.toFixed(2)})
                  </li>
                ) : null}
                <li className={styles["summaryItem"]}>
                  • {summary.categoryCount}{" "}
                  {t((m) => m.pages.invoices.viewInvoice.itemAnalytics.summary.categories, {count: String(summary.categoryCount)})}
                </li>
                <li className={styles["summaryItem"]}>
                  • {summary.allergenCount}{" "}
                  {t((m) => m.pages.invoices.viewInvoice.itemAnalytics.summary.allergens, {count: String(summary.allergenCount)})}
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
