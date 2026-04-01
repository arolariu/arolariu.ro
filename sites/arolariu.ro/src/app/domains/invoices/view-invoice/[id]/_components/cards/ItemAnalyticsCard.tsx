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

"use client";

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
import {useLocale, useTranslations} from "next-intl";
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

/**
 * Enhanced item-level analytics card with interactive table, search, and sorting.
 *
 * @remarks
 * **Features:**
 * - Search input filters items by `genericName` or `rawName`
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
  const t = useTranslations("Invoices.ViewInvoice.itemAnalytics");
  const {invoice} = useInvoiceContext();

  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  /**
   * Filters items based on search query.
   *
   * @remarks
   * Searches against both `genericName` and `rawName` for comprehensive matching.
   * Case-insensitive search using locale-aware lowercase transformation.
   *
   * **Performance:** Memoized to recompute only when items or query change.
   */
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return invoice.items;

    const query = searchQuery.toLowerCase();
    return invoice.items.filter((item) => item.genericName.toLowerCase().includes(query) || item.rawName.toLowerCase().includes(query));
  }, [invoice.items, searchQuery]);

  /**
   * Sorts filtered items by selected field and direction.
   *
   * @remarks
   * Uses `Array#toSorted()` (ES2023) to avoid in-place mutation.
   * Implements locale-aware string comparison for names.
   *
   * **Sort Logic:**
   * - `name`: Sorts by `genericName` using locale collation
   * - `category`: Sorts by `category` enum numeric value
   * - `price`: Sorts by `totalPrice` (total, not unit price)
   * - `quantity`: Sorts by `quantity`
   *
   * **Performance:** Memoized to recompute only when dependencies change.
   */
  const sortedItems = useMemo(() => {
    return filteredItems.toSorted((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "name":
          comparison = a.genericName.localeCompare(b.genericName, locale);
          break;
        case "category":
          comparison = a.category - b.category;
          break;
        case "price":
          comparison = a.totalPrice - b.totalPrice;
          break;
        case "quantity":
          comparison = a.quantity - b.quantity;
          break;
      }

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
    return invoice.items.reduce(
      (acc, item) => ({
        quantity: acc.quantity + item.quantity,
        price: acc.price + item.totalPrice,
      }),
      {quantity: 0, price: 0},
    );
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

  /**
   * Retrieves the display name for a product category.
   *
   * @remarks
   * Uses ProductCategory enum to get the category name.
   * Returns "NOT_DEFINED" for unknown categories.
   *
   * @param category - The category enum value
   * @returns The category name string
   */
  const getCategoryName = useCallback((category: ProductCategory): string => {
    return ProductCategory[category] ?? "NOT_DEFINED";
  }, []);

  // Empty state: no items in invoice
  if (invoice.items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className={styles["titleRow"]}>
            <TbShoppingCart className={styles["iconTitle"]} />
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles["emptyState"]}>
            <TbShoppingCart className={styles["emptyIcon"]} />
            <h3 className={styles["emptyTitle"]}>{t("empty.title")}</h3>
            <p className={styles["emptySubtitle"]}>{t("empty.subtitle")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{opacity: 0, y: 20}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.4}}>
      <Card>
        <CardHeader>
          <CardTitle className={styles["titleRow"]}>
            <TbShoppingCart className={styles["iconTitle"]} />
            {t("title")} ({invoice.items.length})
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
                  placeholder={t("searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
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
                          onClick={() => handleSort("name")}
                          className={styles["sortButton"]}>
                          {t("columns.name")}
                          <TbArrowsSort className={styles["sortIcon"]} />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          type='button'
                          onClick={() => handleSort("category")}
                          className={styles["sortButton"]}>
                          {t("columns.category")}
                          <TbArrowsSort className={styles["sortIcon"]} />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          type='button'
                          onClick={() => handleSort("price")}
                          className={styles["sortButton"]}>
                          {t("columns.price")}
                          <TbArrowsSort className={styles["sortIcon"]} />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          type='button'
                          onClick={() => handleSort("quantity")}
                          className={styles["sortButton"]}>
                          {t("columns.quantity")}
                          <TbArrowsSort className={styles["sortIcon"]} />
                        </button>
                      </TableHead>
                      <TableHead>{t("columns.total")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedItems.map((item, index) => (
                      <TableRow key={`${item.productCode}-${index}`}>
                        <TableCell>
                          <div className={styles["itemCell"]}>
                            <div className={styles["itemNameRow"]}>
                              <div className={styles["itemName"]}>{item.genericName}</div>
                              {/* OCR Confidence Indicator - New DI v4.0 field */}
                              {item.metadata.confidence > 0 && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge
                                      variant={
                                        item.metadata.confidence >= 0.9
                                          ? "default"
                                          : item.metadata.confidence >= 0.7
                                            ? "secondary"
                                            : "destructive"
                                      }
                                      className={styles["confidenceBadge"]}
                                      aria-label={`${item.metadata.confidence >= 0.9 ? "High" : item.metadata.confidence >= 0.7 ? "Medium" : "Low"} OCR confidence ${(item.metadata.confidence * 100).toFixed(0)}%`}>
                                      {item.metadata.confidence >= 0.9 ? "✓" : item.metadata.confidence >= 0.7 ? "~" : "!"}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className={styles["confidenceTooltip"]}>
                                      {t("confidence.label")}: {(item.metadata.confidence * 100).toFixed(0)}%
                                    </p>
                                    {item.metadata.confidence < 0.7 && (
                                      <p className={styles["confidenceWarning"]}>{t("confidence.lowWarning")}</p>
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
                    ))}
                  </TableBody>
                </Table>
              </TooltipProvider>
            </div>

            {/* Total Row */}
            <div className={styles["totalRow"]}>
              <div className={styles["totalLabel"]}>{t("totalLabel")}</div>
              <div className={styles["totalValues"]}>
                <div className={styles["totalQuantity"]}>{totals.quantity}</div>
                <div className={styles["totalPrice"]}>{totals.price.toFixed(2)}</div>
              </div>
            </div>

            {/* Summary Section */}
            <div className={styles["summarySection"]}>
              <h4 className={styles["summaryTitle"]}>📊 {t("summary.title")}</h4>
              <ul className={styles["summaryList"]}>
                {summary.mostExpensive ? (
                  <li className={styles["summaryItem"]}>
                    • {t("summary.mostExpensive")}: <strong>{summary.mostExpensive.genericName}</strong> (
                    {summary.mostExpensive.totalPrice.toFixed(2)})
                  </li>
                ) : null}
                {summary.cheapest ? (
                  <li className={styles["summaryItem"]}>
                    • {t("summary.cheapest")}: <strong>{summary.cheapest.genericName}</strong> ({summary.cheapest.totalPrice.toFixed(2)})
                  </li>
                ) : null}
                <li className={styles["summaryItem"]}>
                  • {summary.categoryCount} {t("summary.categories", {count: String(summary.categoryCount)})}
                </li>
                <li className={styles["summaryItem"]}>
                  • {summary.allergenCount} {t("summary.allergens", {count: String(summary.allergenCount)})}
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
