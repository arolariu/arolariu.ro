"use client";

import {usePaginationWithSearch} from "@/hooks";
import patchInvoice from "@/lib/actions/invoices/patchInvoice";
import {formatCurrency} from "@/lib/utils.generic";
import {Invoice, Product, ProductCategory} from "@/types/invoices";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Checkbox,
  Input,
  Table,
  TableBody,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  toast,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@arolariu/components";
import {motion} from "motion/react";
import {useLocale, useTranslations} from "next-intl";
import {useCallback, useMemo, useState} from "react";
import {TbEdit, TbFlask, TbPencil, TbPlus, TbRefresh, TbSearch, TbTag, TbTrash} from "react-icons/tb";
import {useDialog} from "../../../../_contexts/DialogContext";
import {useEditInvoiceContext} from "../../_context/EditInvoiceContext";
import styles from "./ItemsTable.module.scss";

type Props = {
  invoice: Invoice;
};

// Stable keys for rendering placeholder rows (avoid using array index as key)
const EMPTY_ITEM_ROW_KEYS = ["empty-item-row-1", "empty-item-row-2", "empty-item-row-3", "empty-item-row-4", "empty-item-row-5"] as const;

/**
 * Tracks which cell is currently being edited.
 */
type EditingCell = {
  rowIndex: number;
  field: "genericName" | "price" | "quantity" | "quantityUnit";
} | null;

/**
 * Sort field options for table columns.
 */
type SortField = "genericName" | "price" | "quantity" | "category" | null;

/**
 * Sort direction for table columns.
 */
type SortDirection = "asc" | "desc";

/**
 * Displays a paginated table of invoice items with inline editing and management capabilities.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` directive).
 *
 * **Enhanced Features (ws5-item-management)**:
 * - **Inline Cell Editing**: Click on editable cells (name, price, quantity, unit) to edit in-place
 * - **Add New Item Row**: Button to append empty items for manual entry
 * - **Bulk Select & Delete**: Checkboxes with multi-select and bulk deletion
 * - **Search Within Items**: Filter items by name with search input
 * - **Sort Columns**: Click column headers to sort (name, price, quantity, category)
 *
 * **Table Display**:
 * - **Columns**: Checkbox, Item name, Quantity (with unit), Unit Price, Line Total
 * - **Footer**: Aggregated total amount for all items
 * - **Pagination**: Client-side with 5 items per page, Previous/Next controls
 * - **Empty Rows**: Placeholder rows maintain consistent table height
 *
 * **Editing Flow**:
 * - Click cell → Input appears
 * - Enter or blur → save change to local state
 * - Escape → cancel edit
 * - Changes persist via EditInvoiceContext.saveChanges()
 *
 * **Bulk Operations**:
 * - Select All checkbox in header
 * - Individual row checkboxes
 * - Delete selected button with confirmation dialog
 *
 * **Animation**: Each row animates in with staggered vertical slide via
 * Framer Motion for smooth table population.
 *
 * **Performance**: Uses `useCallback` for memoized handlers and `useMemo`
 * for filtered/sorted items computation.
 *
 * **Domain Context**: Core component of the `InvoiceCard`, providing the
 * primary interface for viewing and editing invoice line items.
 *
 * @param props - Component properties containing the invoice with items array
 * @returns Client-rendered table with paginated items and edit controls
 *
 * @example
 * ```tsx
 * <ItemsTable invoice={invoice} />
 * // Displays: Enhanced table with inline editing, search, sort, and bulk operations
 * ```
 *
 * @see {@link ItemsDialog} - Dialog for bulk item editing
 * @see {@link usePaginationWithSearch} - Pagination hook
 * @see {@link useEditInvoiceContext} - Context for tracking changes
 * @see {@link Invoice} - Invoice type with items array
 * @see {@link Product} - Product type for line items
 */
export default function ItemsTable({invoice}: Readonly<Props>) {
  const locale = useLocale();
  const t = useTranslations("IMS--Edit.itemsTable");
  const {open} = useDialog("EDIT_INVOICE__ITEMS", "edit", invoice);
  const {openWith: openAllergenDialog} = useDialog("EDIT_INVOICE__ALLERGENS");
  const {openWith: openBulkCategoryDialog} = useDialog("EDIT_INVOICE__BULK_CATEGORY");

  // Local state for item management
  const [localItems, setLocalItems] = useState<Product[]>(invoice.items);
  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Filter items by search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) {
      return localItems;
    }
    const query = searchQuery.toLowerCase();
    return localItems.filter((item) => item.genericName.toLowerCase().includes(query) || item.rawName.toLowerCase().includes(query));
  }, [localItems, searchQuery]);

  // Sort filtered items
  const sortedItems = useMemo(() => {
    if (!sortField) {
      return filteredItems;
    }

    return filteredItems.toSorted((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "genericName":
          comparison = a.genericName.localeCompare(b.genericName);
          break;
        case "price":
          comparison = a.price - b.price;
          break;
        case "quantity":
          comparison = a.quantity - b.quantity;
          break;
        case "category":
          comparison = a.category - b.category;
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredItems, sortField, sortDirection]);

  const totalAmount = localItems.filter((item) => !item.metadata.isSoftDeleted).reduce((acc, item) => acc + item.price * item.quantity, 0);
  const {paginatedItems, currentPage, setCurrentPage, totalPages} = usePaginationWithSearch({items: sortedItems, initialPageSize: 5});

  const handleNextPage = useCallback(() => {
    const nextPage = currentPage + 1;
    if (nextPage <= totalPages) {
      setCurrentPage(nextPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, totalPages]);

  const handlePreviousPage = useCallback(() => {
    const previousPage = currentPage - 1;
    if (previousPage >= 1) {
      setCurrentPage(previousPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Handle column header click for sorting
  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        // Toggle direction if same field
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        // New field, default to ascending
        setSortField(field);
        setSortDirection("asc");
      }
    },
    [sortField],
  );

  // Handle cell click to start editing
  const handleCellClick = useCallback(
    (rowIndex: number, field: "genericName" | "price" | "quantity" | "quantityUnit") => {
      const item = sortedItems[rowIndex];
      if (!item) return;

      setEditingCell({rowIndex, field});
      setEditValues({[`${rowIndex}-${field}`]: String(item[field])});
    },
    [sortedItems],
  );

  // Handle edit value change
  const handleEditChange = useCallback((rowIndex: number, field: string, value: string) => {
    setEditValues((prev) => ({...prev, [`${rowIndex}-${field}`]: value}));
  }, []);

  // Handle save edit (Enter or blur)
  const handleSaveEdit = useCallback(() => {
    if (!editingCell) return;

    const {rowIndex, field} = editingCell;
    const key = `${rowIndex}-${field}`;
    const value = editValues[key];

    if (value === undefined) {
      setEditingCell(null);
      return;
    }

    setLocalItems((prev) => {
      const newItems = [...prev];
      const actualItem = sortedItems[rowIndex];
      const actualIndex = prev.findIndex((item) => item.rawName === actualItem?.rawName);

      if (actualIndex === -1) return prev;

      const existingItem = newItems[actualIndex];
      if (!existingItem) return prev;
      const item = {...existingItem};

      // Update field based on type
      if (field === "genericName" || field === "quantityUnit") {
        item[field] = value;
      } else if (field === "price" || field === "quantity") {
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && numValue >= 0) {
          item[field] = numValue;
          // Recalculate totalPrice
          item.totalPrice = (item.price ?? 0) * (item.quantity ?? 0);
        }
      }

      // Mark as edited
      item.metadata = {...item.metadata, isEdited: true};
      newItems[actualIndex] = item;

      return newItems;
    });

    setEditingCell(null);
    toast.success(t("editing.saved"));
  }, [editingCell, editValues, sortedItems, t]);

  // Handle cancel edit (Escape)
  const handleCancelEdit = useCallback(() => {
    setEditingCell(null);
    setEditValues({});
  }, []);

  // Handle key down in edit input
  const handleEditKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter") {
        handleSaveEdit();
      } else if (event.key === "Escape") {
        handleCancelEdit();
      }
    },
    [handleSaveEdit, handleCancelEdit],
  );

  // Handle select all checkbox
  const handleSelectAll = useCallback(() => {
    if (selectedIndices.size === sortedItems.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(sortedItems.map((_, idx) => idx)));
    }
  }, [selectedIndices.size, sortedItems]);

  // Handle individual row checkbox
  const handleSelectRow = useCallback((rowIndex: number) => {
    setSelectedIndices((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(rowIndex)) {
        newSet.delete(rowIndex);
      } else {
        newSet.add(rowIndex);
      }
      return newSet;
    });
  }, []);

  // Handle delete selected items
  const handleDeleteSelected = useCallback(() => {
    if (selectedIndices.size === 0) return;

    const itemsToDelete = Array.from(selectedIndices)
      .map((idx) => sortedItems[idx])
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    setLocalItems((prev) => prev.filter((item) => !itemsToDelete.some((delItem) => delItem.rawName === item.rawName)));

    setSelectedIndices(new Set());
    setShowDeleteDialog(false);
    toast.success(t("deleteConfirm.success", {count: itemsToDelete.length}));
  }, [selectedIndices, sortedItems, t]);

  // Handle add new item
  const handleAddItem = useCallback(() => {
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newItem: Product = {
      rawName: `${t("newItem.defaultName")}_${uniqueSuffix}`,
      genericName: t("newItem.defaultName"),
      category: ProductCategory.NOT_DEFINED,
      quantity: 1,
      quantityUnit: "pcs",
      productCode: "",
      price: 0,
      totalPrice: 0,
      detectedAllergens: [],
      metadata: {
        isEdited: true,
        isComplete: false,
        isSoftDeleted: false,
        confidence: 0,
      },
    };

    setLocalItems((prev) => [...prev, newItem]);
    toast.success(t("newItem.added"));
  }, [t]);

  /**
   * Soft-deletes a product (sets metadata.isSoftDeleted = true).
   */
  const handleSoftDelete = useCallback(
    async (productIndex: number) => {
      const product = localItems[productIndex];
      if (!product) return;

      setIsSaving(true);

      try {
        const updatedItems = [...localItems];
        updatedItems[productIndex] = {
          ...product,
          metadata: {
            ...product.metadata,
            isSoftDeleted: true,
            isEdited: true,
          },
        };

        const result = await patchInvoice({
          invoiceId: invoice.id,
          payload: {
            items: updatedItems,
          },
        });

        if (result.success) {
          setLocalItems(updatedItems);
          toast.success(t("softDelete.success", {name: product.genericName || product.rawName}));
        } else {
          toast.error(result.error);
        }
      } catch (error) {
        console.error("Failed to soft-delete product:", error);
        toast.error(t("softDelete.error"));
      } finally {
        setIsSaving(false);
      }
    },
    [localItems, invoice.id, t],
  );

  /**
   * Restores a soft-deleted product (sets metadata.isSoftDeleted = false).
   */
  const handleRestore = useCallback(
    async (productIndex: number) => {
      const product = localItems[productIndex];
      if (!product) return;

      setIsSaving(true);

      try {
        const updatedItems = [...localItems];
        updatedItems[productIndex] = {
          ...product,
          metadata: {
            ...product.metadata,
            isSoftDeleted: false,
            isEdited: true,
          },
        };

        const result = await patchInvoice({
          invoiceId: invoice.id,
          payload: {
            items: updatedItems,
          },
        });

        if (result.success) {
          setLocalItems(updatedItems);
          toast.success(t("restore.success", {name: product.genericName || product.rawName}));
        } else {
          toast.error(result.error);
        }
      } catch (error) {
        console.error("Failed to restore product:", error);
        toast.error(t("restore.error"));
      } finally {
        setIsSaving(false);
      }
    },
    [localItems, invoice.id, t],
  );

  /**
   * Opens the allergen editing dialog for a product.
   */
  const handleEditAllergens = useCallback(
    (productIndex: number) => {
      const product = localItems[productIndex];
      if (!product) return;

      openAllergenDialog("edit", {
        invoice,
        product,
        productIndex,
      });
    },
    [localItems, invoice, openAllergenDialog],
  );

  /**
   * Opens the bulk category dialog for selected products.
   */
  const handleBulkCategoryChange = useCallback(() => {
    if (selectedIndices.size === 0) {
      toast.warning(t("bulkCategory.noSelection"));
      return;
    }

    const selectedProducts = Array.from(selectedIndices)
      .map((idx) => sortedItems[idx])
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    // Map selected indices from sorted view to actual localItems indices
    const actualIndices = selectedProducts.map((product) => localItems.findIndex((item) => item.rawName === product.rawName));

    openBulkCategoryDialog("edit", {
      invoice,
      selectedProducts,
      selectedIndices: actualIndices,
    });
  }, [selectedIndices, sortedItems, localItems, invoice, openBulkCategoryDialog, t]);

  /**
   * Determines the visual indicator class for a product based on its completeness status.
   *
   * @param item - The product to analyze
   * @returns CSS class name for the row indicator or empty string
   */
  const getProductIndicatorClass = useCallback((item: Product): string => {
    // Skip soft-deleted items
    if (item.metadata.isSoftDeleted) return "";

    // Priority 1: Incomplete products (yellow border)
    if (!item.metadata.isComplete) {
      return styles["rowIndicatorIncomplete"] ?? "";
    }

    // Priority 2: Low confidence OCR (orange border)
    if (item.metadata.confidence > 0 && item.metadata.confidence < 0.7) {
      return styles["rowIndicatorLowConfidence"] ?? "";
    }

    return "";
  }, []);

  return (
    <div>
      <div className={styles["headerRow"]}>
        <h3 className={styles["itemsLabel"]}>{t("title")}</h3>
        <div className={styles["headerActions"]}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={open}
                    className={styles["editButton"]}>
                    <TbEdit className={styles["editIcon"]} />
                    {t("buttons.editItems")}
                  </Button>
                }
              />
              <TooltipContent>
                <p>{t("tooltips.editInvoiceItemsAndQuantities")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Search row */}
      <div className={styles["searchRow"]}>
        <div className={styles["searchInputWrapper"]}>
          <TbSearch className={styles["searchIcon"]} />
          <Input
            type='text'
            placeholder={t("search.placeholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles["searchInput"]}
          />
        </div>
        {selectedIndices.size > 0 && (
          <div className={styles["bulkToolbar"]}>
            <span className={styles["bulkToolbarText"]}>{t("bulkToolbar.selectedCount", {count: selectedIndices.size})}</span>
            <Button
              variant='outline'
              size='sm'
              onClick={handleBulkCategoryChange}
              className={styles["categoryButton"]}>
              <TbTag className={styles["categoryIcon"]} />
              {t("bulkToolbar.changeCategory")}
            </Button>
            <Button
              variant='destructive'
              size='sm'
              onClick={() => setShowDeleteDialog(true)}
              className={styles["deleteButton"]}>
              <TbTrash className={styles["deleteIcon"]} />
              {t("bulkToolbar.deleteSelected")}
            </Button>
          </div>
        )}
      </div>

      <div className={styles["tableWrapper"]}>
        <Table className={styles["table"]}>
          <TableHeader>
            <TableRow className={styles["mutedRow"]}>
              <TableHead className={styles["tableHeaderCheckbox"]}>
                <Checkbox
                  checked={selectedIndices.size === sortedItems.length && sortedItems.length > 0}
                  onCheckedChange={handleSelectAll}
                  aria-label={t("columns.selectAll")}
                  className={styles["selectCheckbox"]}
                />
              </TableHead>
              <TableHead
                className={styles["tableHeaderSortable"]}
                onClick={() => handleSort("genericName")}>
                {t("columns.name")}
                {sortField === "genericName" && <span className={styles["sortIndicator"]}>{sortDirection === "asc" ? " ▲" : " ▼"}</span>}
              </TableHead>
              <TableHead
                className={styles["tableHeaderRightSortable"]}
                onClick={() => handleSort("quantity")}>
                {t("columns.quantity")}
                {sortField === "quantity" && <span className={styles["sortIndicator"]}>{sortDirection === "asc" ? " ▲" : " ▼"}</span>}
              </TableHead>
              <TableHead
                className={styles["tableHeaderRightSortable"]}
                onClick={() => handleSort("price")}>
                {t("columns.price")}
                {sortField === "price" && <span className={styles["sortIndicator"]}>{sortDirection === "asc" ? " ▲" : " ▼"}</span>}
              </TableHead>
              <TableHead className={styles["tableHeaderRight"]}>{t("columns.total")}</TableHead>
              <TableHead className={styles["tableHeaderCenter"]}>{t("columns.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className={styles["tableBody"]}>
            {paginatedItems.map((item, index) => {
              const isEditing = editingCell?.rowIndex === index;
              const isSelected = selectedIndices.has(index);
              const isSoftDeleted = item.metadata.isSoftDeleted;
              const isEdited = item.metadata.isEdited;
              const hasAllergens = item.detectedAllergens.length > 0;
              const indicatorClass = getProductIndicatorClass(item);

              return (
                <motion.tr
                  key={item.rawName}
                  initial={{opacity: 0, y: -20}}
                  animate={{opacity: 1, y: 0}}
                  transition={{delay: index * 0.05}}
                  className={`${styles["tableRow"]} ${isSelected ? styles["tableRowSelected"] : ""} ${
                    isSoftDeleted ? styles["tableRowSoftDeleted"] : ""
                  } ${indicatorClass}`}>
                  <td className={styles["tableCellCheckbox"]}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleSelectRow(index)}
                      aria-label={t("columns.selectRow", {name: item.genericName})}
                      className={styles["selectCheckbox"]}
                      disabled={isSoftDeleted}
                    />
                  </td>
                  <td
                    className={`${styles["tableCell"]} ${styles["tableCellEditable"]} ${isSoftDeleted ? styles["strikethrough"] : ""}`}
                    onClick={() => !isEditing && !isSoftDeleted && handleCellClick(index, "genericName")}>
                    <div className={styles["cellWithIndicators"]}>
                      {isEditing && editingCell.field === "genericName" ? (
                        <Input
                          type='text'
                          value={editValues[`${index}-genericName`] ?? ""}
                          onChange={(e) => handleEditChange(index, "genericName", e.target.value)}
                          onBlur={handleSaveEdit}
                          onKeyDown={handleEditKeyDown}
                          autoFocus
                          aria-label={t("editing.fieldLabel", {field: t("columns.name"), name: item.rawName})}
                          className={styles["editInput"]}
                        />
                      ) : (
                        <>
                          <span>{item.genericName}</span>
                          {isEdited && !isSoftDeleted && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger
                                  render={
                                    <Badge
                                      variant='outline'
                                      className={styles["editedBadge"]}>
                                      <TbPencil className={styles["editedIcon"]} />
                                      {t("indicators.edited")}
                                    </Badge>
                                  }
                                />
                                <TooltipContent>
                                  <p>{t("indicators.editedTooltip")}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {hasAllergens && !isSoftDeleted && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger
                                  render={
                                    <Badge
                                      variant='secondary'
                                      className={styles["allergenBadge"]}>
                                      <TbFlask className={styles["allergenIcon"]} />
                                      {t("indicators.allergens", {count: item.detectedAllergens.length})}
                                    </Badge>
                                  }
                                />
                                <TooltipContent>
                                  <p>{item.detectedAllergens.map((a) => a.name).join(", ")}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                  <td
                    className={`${styles["tableCellRight"]} ${styles["tableCellEditable"]} ${isSoftDeleted ? styles["strikethrough"] : ""}`}
                    onClick={() => !isEditing && !isSoftDeleted && handleCellClick(index, "quantity")}>
                    {isEditing && editingCell.field === "quantity" ? (
                      <Input
                        type='number'
                        value={editValues[`${index}-quantity`] ?? ""}
                        onChange={(e) => handleEditChange(index, "quantity", e.target.value)}
                        onBlur={handleSaveEdit}
                        onKeyDown={handleEditKeyDown}
                        autoFocus
                        aria-label={t("editing.fieldLabel", {field: t("columns.quantity"), name: item.rawName})}
                        className={styles["editInput"]}
                      />
                    ) : (
                      `${item.quantity} ${item.quantityUnit}`
                    )}
                  </td>
                  <td
                    className={`${styles["tableCellRight"]} ${styles["tableCellEditable"]} ${isSoftDeleted ? styles["strikethrough"] : ""}`}
                    onClick={() => !isEditing && !isSoftDeleted && handleCellClick(index, "price")}>
                    {isEditing && editingCell.field === "price" ? (
                      <Input
                        type='number'
                        step='0.01'
                        value={editValues[`${index}-price`] ?? ""}
                        onChange={(e) => handleEditChange(index, "price", e.target.value)}
                        onBlur={handleSaveEdit}
                        onKeyDown={handleEditKeyDown}
                        autoFocus
                        aria-label={t("editing.fieldLabel", {field: t("columns.price"), name: item.rawName})}
                        className={styles["editInput"]}
                      />
                    ) : (
                      formatCurrency(item.price, {currencyCode: invoice.paymentInformation.currency.code, locale})
                    )}
                  </td>
                  <td className={`${styles["tableCellRightBold"]} ${isSoftDeleted ? styles["strikethrough"] : ""}`}>
                    {formatCurrency(item.price * item.quantity, {currencyCode: invoice.paymentInformation.currency.code, locale})}
                  </td>
                  <td className={styles["tableCellActions"]}>
                    <div className={styles["actionButtons"]}>
                      {isSoftDeleted ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  onClick={() => handleRestore(index)}
                                  disabled={isSaving}
                                  className={styles["actionButton"]}>
                                  <TbRefresh className={styles["actionIcon"]} />
                                </Button>
                              }
                            />
                            <TooltipContent>
                              <p>{t("actions.restore")}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    variant='ghost'
                                    size='sm'
                                    onClick={() => handleEditAllergens(index)}
                                    disabled={isSaving}
                                    className={styles["actionButton"]}>
                                    <TbFlask className={styles["actionIcon"]} />
                                  </Button>
                                }
                              />
                              <TooltipContent>
                                <p>{t("actions.editAllergens")}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    variant='ghost'
                                    size='sm'
                                    onClick={() => handleSoftDelete(index)}
                                    disabled={isSaving}
                                    className={styles["actionButton"]}>
                                    <TbTrash className={styles["actionIcon"]} />
                                  </Button>
                                }
                              />
                              <TooltipContent>
                                <p>{t("actions.remove")}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </>
                      )}
                    </div>
                  </td>
                </motion.tr>
              );
            })}
            {EMPTY_ITEM_ROW_KEYS.slice(0, Math.max(0, 5 - paginatedItems.length)).map((key, index) => (
              <motion.tr
                key={key}
                initial={{opacity: 0, x: 0}}
                animate={{opacity: 1, x: 0}}
                transition={{delay: index * 0.05}}
                className={styles["emptyRow"]}>
                <td className={styles["tableCellCheckbox"]} />
                <td className={styles["tableCell"]} />
                <td className={styles["tableCellRight"]} />
                <td className={styles["tableCellRight"]} />
                <td className={styles["tableCellRight"]} />
                <td className={styles["tableCellActions"]} />
              </motion.tr>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow className={styles["mutedRow"]}>
              <TableHead colSpan={1} />
              <TableHead
                colSpan={3}
                className={styles["footerLabel"]}>
                {t("footer.total")}
              </TableHead>
              <TableHead className={styles["footerLabel"]}>
                {formatCurrency(totalAmount, {currencyCode: invoice.paymentInformation.currency.code, locale})}
              </TableHead>
              <TableHead colSpan={1} />
            </TableRow>
          </TableFooter>
        </Table>

        {/* Add new item row */}
        <div className={styles["addItemRow"]}>
          <Button
            variant='outline'
            size='sm'
            onClick={handleAddItem}
            className={styles["addItemButton"]}>
            <TbPlus className={styles["addItemIcon"]} />
            {t("buttons.addItem")}
          </Button>
        </div>

        {/* Pagination controls - only show when more than one page */}
        {totalPages > 1 && (
          <div className={styles["paginationBar"]}>
            <div className={styles["paginationInfo"]}>{t("pagination.totalItems", {count: sortedItems.length})}</div>
            <div className={styles["paginationControls"]}>
              <Button
                variant='outline'
                className={styles["cursorPointer"]}
                size='sm'
                onClick={handlePreviousPage}>
                {t("pagination.previous")}
              </Button>
              <span className={styles["paginationText"]}>
                {t("pagination.pageOf", {currentPage: String(currentPage), totalPages: String(totalPages)})}
              </span>
              <Button
                variant='outline'
                className={styles["cursorPointer"]}
                size='sm'
                onClick={handleNextPage}>
                {t("pagination.next")}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteConfirm.description", {count: selectedIndices.size})}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("deleteConfirm.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSelected}>{t("deleteConfirm.confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
