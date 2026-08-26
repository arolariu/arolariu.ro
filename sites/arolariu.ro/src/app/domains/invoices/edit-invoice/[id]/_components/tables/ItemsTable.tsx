"use client";

import {patchInvoice} from "@/app/domains/invoices/_actions/invoices";
import {usePaginationWithSearch} from "@/hooks";
import {formatCurrency} from "@/lib/utils.generic";
import {Invoice, Product} from "@/types/invoices";
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
import {useLocale} from "next-intl";
import {useTranslations} from "next-intl-selector";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {TbEdit, TbFlask, TbPencil, TbPlus, TbRefresh, TbSearch, TbTrash} from "react-icons/tb";
import {useDialog, useDialogs} from "../../../../_contexts/DialogContext";
import styles from "./ItemsTable.module.scss";

type Props = {invoice: Invoice};

const EMPTY_ITEM_ROW_KEYS = ["empty-item-row-1", "empty-item-row-2", "empty-item-row-3", "empty-item-row-4", "empty-item-row-5"] as const;

function isSelectedProduct(product: Product | undefined): product is Product {
  return product !== undefined;
}

type EditingCell = {rowIndex: number; field: "name" | "price" | "quantity" | "quantityUnit"} | null;
type SortField = "name" | "price" | "quantity" | null;
type SortDirection = "asc" | "desc";

type ItemNameCellProps = {
  readonly item: Product;
  readonly isEditing: boolean;
  readonly isSoftDeleted: boolean;
  readonly detectedSignals: NonNullable<Product["allergenAssessment"]>["signals"];
  readonly editValue: string;
  readonly editInputRef: React.RefObject<HTMLInputElement | null>;
  readonly onCellClick: (() => void) | undefined;
  readonly onEditChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  readonly onSaveEdit: () => void;
  readonly onEditKeyDown: (event: React.KeyboardEvent) => void;
};

function ItemNameCell({
  item,
  isEditing,
  isSoftDeleted,
  detectedSignals,
  editValue,
  editInputRef,
  onCellClick,
  onEditChange,
  onSaveEdit,
  onEditKeyDown,
}: Readonly<ItemNameCellProps>): React.JSX.Element {
  const t = useTranslations();
  const hasAllergens = detectedSignals.length > 0;
  const showEditedBadge = item.metadata.isEdited && !isSoftDeleted;
  const showAllergenBadge = hasAllergens && !isSoftDeleted;
  return (
    <td
      className={`${styles["tableCell"]} ${styles["tableCellEditable"]} ${isSoftDeleted ? styles["strikethrough"] : ""}`}
      onClick={onCellClick}>
      <div className={styles["cellWithIndicators"]}>
        {isEditing ? (
          <Input
            ref={editInputRef}
            type='text'
            value={editValue}
            onChange={onEditChange}
            onBlur={onSaveEdit}
            onKeyDown={onEditKeyDown}
            aria-label={t((m) => m.pages.invoices.editInvoice.itemsTable.editing.fieldLabel, {
              field: t((m) => m.pages.invoices.editInvoice.itemsTable.columns.name),
              name: item.name,
            })}
            className={styles["editInput"]}
          />
        ) : (
          <>
            <span>{item.name}</span>
            {showEditedBadge ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Badge
                        variant='outline'
                        className={styles["editedBadge"]}>
                        <TbPencil className={styles["editedIcon"]} />
                        {t((m) => m.pages.invoices.editInvoice.itemsTable.indicators.edited)}
                      </Badge>
                    }
                  />
                  <TooltipContent>
                    <p>{t((m) => m.pages.invoices.editInvoice.itemsTable.indicators.editedTooltip)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
            {showAllergenBadge ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Badge
                        variant='secondary'
                        className={styles["allergenBadge"]}>
                        <TbFlask className={styles["allergenIcon"]} />
                        {t((m) => m.pages.invoices.editInvoice.itemsTable.indicators.allergens, {
                          count: detectedSignals.length,
                        })}
                      </Badge>
                    }
                  />
                  <TooltipContent>
                    <p>{detectedSignals.map((signal) => signal.code).join(", ")}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
          </>
        )}
      </div>
    </td>
  );
}

type EditableValueCellProps = {
  readonly itemName: string;
  readonly fieldLabel: string;
  readonly inputType: "number";
  readonly inputStep?: string;
  readonly isEditing: boolean;
  readonly isSoftDeleted: boolean;
  readonly editValue: string;
  readonly displayValue: React.ReactNode;
  readonly editInputRef: React.RefObject<HTMLInputElement | null>;
  readonly onCellClick: (() => void) | undefined;
  readonly onEditChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  readonly onSaveEdit: () => void;
  readonly onEditKeyDown: (event: React.KeyboardEvent) => void;
};

function EditableValueCell({
  itemName,
  fieldLabel,
  inputType,
  inputStep,
  isEditing,
  isSoftDeleted,
  editValue,
  displayValue,
  editInputRef,
  onCellClick,
  onEditChange,
  onSaveEdit,
  onEditKeyDown,
}: Readonly<EditableValueCellProps>): React.JSX.Element {
  const t = useTranslations();
  return (
    <td
      className={`${styles["tableCellRight"]} ${styles["tableCellEditable"]} ${isSoftDeleted ? styles["strikethrough"] : ""}`}
      onClick={onCellClick}>
      {isEditing ? (
        <Input
          ref={editInputRef}
          type={inputType}
          step={inputStep}
          value={editValue}
          onChange={onEditChange}
          onBlur={onSaveEdit}
          onKeyDown={onEditKeyDown}
          aria-label={t((m) => m.pages.invoices.editInvoice.itemsTable.editing.fieldLabel, {
            field: fieldLabel,
            name: itemName,
          })}
          className={styles["editInput"]}
        />
      ) : (
        displayValue
      )}
    </td>
  );
}

type ItemActionsCellProps = {
  readonly isSoftDeleted: boolean;
  readonly isSaving: boolean;
  readonly onRestore: () => void;
  readonly onEditAllergens: () => void;
  readonly onSoftDelete: () => void;
};

type ItemActionButtonProps = {
  readonly label: string;
  readonly icon: React.ComponentType<{className?: string}>;
  readonly isSaving: boolean;
  readonly onClick: () => void;
};

function ItemActionButton({label, icon: Icon, isSaving, onClick}: Readonly<ItemActionButtonProps>): React.JSX.Element {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant='ghost'
              size='sm'
              onClick={onClick}
              disabled={isSaving}
              className={styles["actionButton"]}>
              <Icon className={styles["actionIcon"]} />
            </Button>
          }
        />
        <TooltipContent>
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ItemActionsCell({
  isSoftDeleted,
  isSaving,
  onRestore,
  onEditAllergens,
  onSoftDelete,
}: Readonly<ItemActionsCellProps>): React.JSX.Element {
  const t = useTranslations();
  if (isSoftDeleted) {
    return (
      <td className={styles["tableCellActions"]}>
        <div className={styles["actionButtons"]}>
          <ItemActionButton
            label={t((m) => m.pages.invoices.editInvoice.itemsTable.actions.restore)}
            icon={TbRefresh}
            isSaving={isSaving}
            onClick={onRestore}
          />
        </div>
      </td>
    );
  }
  return (
    <td className={styles["tableCellActions"]}>
      <div className={styles["actionButtons"]}>
        <ItemActionButton
          label={t((m) => m.pages.invoices.editInvoice.itemsTable.actions.editAllergens)}
          icon={TbFlask}
          isSaving={isSaving}
          onClick={onEditAllergens}
        />
        <ItemActionButton
          label={t((m) => m.pages.invoices.editInvoice.itemsTable.actions.remove)}
          icon={TbTrash}
          isSaving={isSaving}
          onClick={onSoftDelete}
        />
      </div>
    </td>
  );
}

type ItemTableRowProps = {
  readonly item: Product;
  readonly index: number;
  readonly editingCell: EditingCell;
  readonly editValues: Readonly<Record<string, string>>;
  readonly isSelected: boolean;
  readonly isSaving: boolean;
  readonly currencyCode: string;
  readonly locale: string;
  readonly indicatorClass: string;
  readonly editInputRef: React.RefObject<HTMLInputElement | null>;
  readonly onSelectRow: () => void;
  readonly onCellClickName: () => void;
  readonly onCellClickQuantity: () => void;
  readonly onCellClickPrice: () => void;
  readonly onNameChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  readonly onQuantityChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  readonly onPriceChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  readonly onSaveEdit: () => void;
  readonly onEditKeyDown: (event: React.KeyboardEvent) => void;
  readonly onRestore: () => void;
  readonly onEditAllergens: () => void;
  readonly onSoftDelete: () => void;
};

function ItemTableRow({
  item,
  index,
  editingCell,
  editValues,
  isSelected,
  isSaving,
  currencyCode,
  locale,
  indicatorClass,
  editInputRef,
  onSelectRow,
  onCellClickName,
  onCellClickQuantity,
  onCellClickPrice,
  onNameChange,
  onQuantityChange,
  onPriceChange,
  onSaveEdit,
  onEditKeyDown,
  onRestore,
  onEditAllergens,
  onSoftDelete,
}: Readonly<ItemTableRowProps>): React.JSX.Element {
  const t = useTranslations();
  const {isSoftDeleted} = item.metadata;
  const {quantity, quantityUnit, price} = item;
  const detectedSignals = item.allergenAssessment?.status === "detected" ? item.allergenAssessment.signals : [];
  const isEditingRow = editingCell?.rowIndex === index;
  const editingField = isEditingRow ? editingCell?.field : undefined;
  const nameClickHandler = isEditingRow || isSoftDeleted ? undefined : onCellClickName;
  const quantityClickHandler = isEditingRow || isSoftDeleted ? undefined : onCellClickQuantity;
  const priceClickHandler = isEditingRow || isSoftDeleted ? undefined : onCellClickPrice;
  return (
    <motion.tr
      initial={{opacity: 0, y: -20}}
      animate={{opacity: 1, y: 0}}
      transition={{delay: index * 0.05}}
      className={`${styles["tableRow"]} ${isSelected ? styles["tableRowSelected"] : ""} ${
        isSoftDeleted ? styles["tableRowSoftDeleted"] : ""
      } ${indicatorClass}`}>
      <td className={styles["tableCellCheckbox"]}>
        <Checkbox
          nativeButton
          checked={isSelected}
          onCheckedChange={onSelectRow}
          aria-label={t((m) => m.pages.invoices.editInvoice.itemsTable.columns.selectRow, {name: item.name})}
          className={styles["selectCheckbox"]}
          disabled={isSoftDeleted}
        />
      </td>
      <ItemNameCell
        item={item}
        isEditing={editingField === "name"}
        isSoftDeleted={isSoftDeleted}
        detectedSignals={detectedSignals}
        editValue={editValues[`${index}-name`] ?? ""}
        editInputRef={editInputRef}
        onCellClick={nameClickHandler}
        onEditChange={onNameChange}
        onSaveEdit={onSaveEdit}
        onEditKeyDown={onEditKeyDown}
      />
      <EditableValueCell
        itemName={item.name}
        fieldLabel={t((m) => m.pages.invoices.editInvoice.itemsTable.columns.quantity)}
        inputType='number'
        isEditing={editingField === "quantity"}
        isSoftDeleted={isSoftDeleted}
        editValue={editValues[`${index}-quantity`] ?? ""}
        displayValue={`${quantity} ${quantityUnit}`}
        editInputRef={editInputRef}
        onCellClick={quantityClickHandler}
        onEditChange={onQuantityChange}
        onSaveEdit={onSaveEdit}
        onEditKeyDown={onEditKeyDown}
      />
      <EditableValueCell
        itemName={item.name}
        fieldLabel={t((m) => m.pages.invoices.editInvoice.itemsTable.columns.price)}
        inputType='number'
        inputStep='0.01'
        isEditing={editingField === "price"}
        isSoftDeleted={isSoftDeleted}
        editValue={editValues[`${index}-price`] ?? ""}
        displayValue={formatCurrency(price, {currencyCode, locale})}
        editInputRef={editInputRef}
        onCellClick={priceClickHandler}
        onEditChange={onPriceChange}
        onSaveEdit={onSaveEdit}
        onEditKeyDown={onEditKeyDown}
      />
      <td className={`${styles["tableCellRightBold"]} ${isSoftDeleted ? styles["strikethrough"] : ""}`}>
        {formatCurrency(price * quantity, {currencyCode, locale})}
      </td>
      <ItemActionsCell
        isSoftDeleted={isSoftDeleted}
        isSaving={isSaving}
        onRestore={onRestore}
        onEditAllergens={onEditAllergens}
        onSoftDelete={onSoftDelete}
      />
    </motion.tr>
  );
}

/**
 * Displays a paginated table of invoice items with inline editing and management capabilities.
 *
 * @remarks
 * Supports inline editing, search, sorting, pagination, bulk deletion, soft
 * deletion, restoration, and allergen editing while preserving row animation.
 *
 * @param props - Component properties containing the invoice with items array
 * @returns Client-rendered table with paginated items and edit controls
 */
export default function ItemsTable({invoice}: Readonly<Props>) {
  const locale = useLocale();
  const t = useTranslations();
  const {open} = useDialog("EDIT_INVOICE__ITEMS", "edit", invoice);
  const {openDialog} = useDialogs();

  const [localItems, setLocalItems] = useState<Product[]>(invoice.items);
  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editingCell) editInputRef.current?.focus();
  }, [editingCell]);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(() => new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) {
      return localItems;
    }
    const query = searchQuery.toLowerCase();
    return localItems.filter((item) => item.name.toLowerCase().includes(query));
  }, [localItems, searchQuery]);
  const sortedItems = useMemo(() => {
    if (!sortField) {
      return filteredItems;
    }
    return filteredItems.toSorted((a, b) => {
      const multiplier = sortDirection === "asc" ? 1 : -1;
      switch (sortField) {
        case "name":
          return a.name.localeCompare(b.name) * multiplier;
        case "price":
          return (a.price - b.price) * multiplier;
        case "quantity":
          return (a.quantity - b.quantity) * multiplier;
        default: {
          const _exhaustive: never = sortField;
          throw new Error(`Unhandled sortField: ${String(_exhaustive)}`);
        }
      }
    });
  }, [filteredItems, sortField, sortDirection]);

  const totalAmount = localItems.filter((item) => !item.metadata.isSoftDeleted).reduce((acc, item) => acc + item.price * item.quantity, 0);
  const {paginatedItems, currentPage, setCurrentPage, totalPages, pageSize} = usePaginationWithSearch({
    items: sortedItems,
    initialPageSize: 5,
  });

  const handleNextPage = useCallback(() => {
    const nextPage = currentPage + 1;
    if (nextPage <= totalPages) {
      setCurrentPage(nextPage);
    }
  }, [currentPage, totalPages, setCurrentPage]);

  const handlePreviousPage = useCallback(() => {
    const previousPage = currentPage - 1;
    if (previousPage >= 1) {
      setCurrentPage(previousPage);
    }
  }, [currentPage, setCurrentPage]);

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

  const handleCellClick = useCallback(
    (rowIndex: number, field: "name" | "price" | "quantity" | "quantityUnit") => {
      const item = sortedItems[rowIndex];
      if (!item) return;
      setEditingCell({rowIndex, field});
      setEditValues({[`${rowIndex}-${field}`]: String(item[field])});
    },
    [sortedItems],
  );

  const handleEditChange = useCallback((rowIndex: number, field: string, value: string) => {
    setEditValues((prev) => ({...prev, [`${rowIndex}-${field}`]: value}));
  }, []);

  const createEditChangeHandler = useCallback(
    (rowIndex: number, field: string) => {
      return (e: React.ChangeEvent<HTMLInputElement>) => {
        handleEditChange(rowIndex, field, e.target.value);
      };
    },
    [handleEditChange],
  );

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
      const actualIndex = actualItem ? prev.indexOf(actualItem) : -1;
      if (actualIndex === -1) return prev;
      const existingItem = newItems[actualIndex];
      if (!existingItem) return prev;
      const item = {...existingItem};

      if (field === "name" || field === "quantityUnit") {
        item[field] = value;
      } else if (field === "price" || field === "quantity") {
        const numValue = Number.parseFloat(value);
        if (!Number.isNaN(numValue) && numValue >= 0) {
          item[field] = numValue;
          item.totalPrice = (item.price ?? 0) * (item.quantity ?? 0);
        }
      }
      item.metadata = {...item.metadata, isEdited: true};
      newItems[actualIndex] = item;
      return newItems;
    });
    setEditingCell(null);
    toast.success(t((m) => m.pages.invoices.editInvoice.itemsTable.editing.saved));
  }, [editingCell, editValues, sortedItems, t]);

  const handleCancelEdit = useCallback(() => {
    setEditingCell(null);
    setEditValues({});
  }, []);

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

  const handleSelectAll = useCallback(() => {
    if (selectedIndices.size === sortedItems.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(sortedItems.map((_, idx) => idx)));
    }
  }, [selectedIndices.size, sortedItems]);

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

  const handleDeleteSelected = useCallback(() => {
    if (selectedIndices.size === 0) return;
    const itemsToDelete = Array.from(selectedIndices)
      .map((idx) => sortedItems[idx])
      .filter(isSelectedProduct);
    setLocalItems((prev) => prev.filter((item) => !itemsToDelete.includes(item)));
    setSelectedIndices(new Set());
    setShowDeleteDialog(false);
    toast.success(t((m) => m.pages.invoices.editInvoice.itemsTable.deleteConfirm.success, {count: itemsToDelete.length}));
  }, [selectedIndices, sortedItems, t]);

  const handleAddItem = useCallback(() => {
    const uniqueSuffix = `${Date.now()}-${globalThis.crypto.randomUUID().slice(0, 5)}`;
    const newItem: Product = {
      name: `${t((m) => m.pages.invoices.editInvoice.itemsTable.newItem.defaultName)}_${uniqueSuffix}`,
      quantity: 1,
      quantityUnit: "pcs",
      productCode: "",
      price: 0,
      totalPrice: 0,
      metadata: {
        isEdited: true,
        isComplete: false,
        isSoftDeleted: false,
        confidence: 0,
      },
      classification: null,
      allergenAssessment: null,
    };
    setLocalItems((prev) => [...prev, newItem]);
    toast.success(t((m) => m.pages.invoices.editInvoice.itemsTable.newItem.added));
  }, [t]);

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
          toast.success(t((m) => m.pages.invoices.editInvoice.itemsTable.softDelete.success, {name: product.name}));
        } else {
          toast.error(t((m) => m.pages.invoices.editInvoice.itemsTable.softDelete.error));
        }
      } catch (error) {
        console.error("Failed to soft-delete product:", error);
        toast.error(t((m) => m.pages.invoices.editInvoice.itemsTable.softDelete.error));
      } finally {
        setIsSaving(false);
      }
    },
    [localItems, invoice.id, t],
  );

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
          toast.success(t((m) => m.pages.invoices.editInvoice.itemsTable.restore.success, {name: product.name}));
        } else {
          toast.error(t((m) => m.pages.invoices.editInvoice.itemsTable.restore.error));
        }
      } catch (error) {
        console.error("Failed to restore product:", error);
        toast.error(t((m) => m.pages.invoices.editInvoice.itemsTable.restore.error));
      } finally {
        setIsSaving(false);
      }
    },
    [localItems, invoice.id, t],
  );

  const handleEditAllergens = useCallback(
    (productIndex: number) => {
      const product = localItems[productIndex];
      if (!product) return;
      openDialog("EDIT_INVOICE__ALLERGENS", "edit", {
        invoice,
        product,
        productIndex,
      });
    },
    [localItems, invoice, openDialog],
  );

  const getProductIndicatorClass = useCallback((item: Product): string => {
    if (item.metadata.isSoftDeleted) return "";
    if (!item.metadata.isComplete) {
      return styles["rowIndicatorIncomplete"] ?? "";
    }
    if (item.metadata.confidence > 0 && item.metadata.confidence < 0.7) {
      return styles["rowIndicatorLowConfidence"] ?? "";
    }
    return "";
  }, []);

  const createSelectRowHandler = useCallback((index: number) => () => handleSelectRow(index), [handleSelectRow]);

  const createCellClickHandler = useCallback(
    (index: number, field: "name" | "price" | "quantity") => () => handleCellClick(index, field),
    [handleCellClick],
  );

  const createRestoreHandler = useCallback((index: number) => () => handleRestore(index), [handleRestore]);

  const createEditAllergensHandler = useCallback((index: number) => () => handleEditAllergens(index), [handleEditAllergens]);

  const createSoftDeleteHandler = useCallback((index: number) => () => handleSoftDelete(index), [handleSoftDelete]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleShowDeleteDialog = useCallback(() => {
    setShowDeleteDialog(true);
  }, []);

  const handleSortByName = useCallback(() => {
    handleSort("name");
  }, [handleSort]);

  const handleSortByQuantity = useCallback(() => {
    handleSort("quantity");
  }, [handleSort]);

  const handleSortByPrice = useCallback(() => {
    handleSort("price");
  }, [handleSort]);

  return (
    <div>
      <div className={styles["headerRow"]}>
        <h3 className={styles["itemsLabel"]}>{t((m) => m.pages.invoices.editInvoice.itemsTable.title)}</h3>
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
                    {t((m) => m.pages.invoices.editInvoice.itemsTable.buttons.editItems)}
                  </Button>
                }
              />
              <TooltipContent>
                <p>{t((m) => m.pages.invoices.editInvoice.itemsTable.tooltips.editInvoiceItemsAndQuantities)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className={styles["searchRow"]}>
        <div className={styles["searchInputWrapper"]}>
          <TbSearch className={styles["searchIcon"]} />
          <Input
            type='text'
            placeholder={t((m) => m.pages.invoices.editInvoice.itemsTable.search.placeholder)}
            value={searchQuery}
            onChange={handleSearchChange}
            className={styles["searchInput"]}
          />
        </div>
        {selectedIndices.size > 0 && (
          <div className={styles["bulkToolbar"]}>
            <span className={styles["bulkToolbarText"]}>
              {t((m) => m.pages.invoices.editInvoice.itemsTable.bulkToolbar.selectedCount, {count: selectedIndices.size})}
            </span>
            <Button
              variant='destructive'
              size='sm'
              onClick={handleShowDeleteDialog}
              className={styles["deleteButton"]}>
              <TbTrash className={styles["deleteIcon"]} />
              {t((m) => m.pages.invoices.editInvoice.itemsTable.bulkToolbar.deleteSelected)}
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
                  nativeButton
                  checked={selectedIndices.size === sortedItems.length && sortedItems.length > 0}
                  onCheckedChange={handleSelectAll}
                  aria-label={t((m) => m.pages.invoices.editInvoice.itemsTable.columns.selectAll)}
                  className={styles["selectCheckbox"]}
                />
              </TableHead>
              <TableHead
                className={styles["tableHeaderSortable"]}
                onClick={handleSortByName}>
                {t((m) => m.pages.invoices.editInvoice.itemsTable.columns.name)}
                {sortField === "name" && <span className={styles["sortIndicator"]}>{sortDirection === "asc" ? " ▲" : " ▼"}</span>}
              </TableHead>
              <TableHead
                className={styles["tableHeaderRightSortable"]}
                onClick={handleSortByQuantity}>
                {t((m) => m.pages.invoices.editInvoice.itemsTable.columns.quantity)}
                {sortField === "quantity" ? <span className={styles["sortIndicator"]}>{sortDirection === "asc" ? " ▲" : " ▼"}</span> : null}
              </TableHead>
              <TableHead
                className={styles["tableHeaderRightSortable"]}
                onClick={handleSortByPrice}>
                {t((m) => m.pages.invoices.editInvoice.itemsTable.columns.price)}
                {sortField === "price" ? <span className={styles["sortIndicator"]}>{sortDirection === "asc" ? " ▲" : " ▼"}</span> : null}
              </TableHead>
              <TableHead className={styles["tableHeaderRight"]}>
                {t((m) => m.pages.invoices.editInvoice.itemsTable.columns.total)}
              </TableHead>
              <TableHead className={styles["tableHeaderCenter"]}>
                {t((m) => m.pages.invoices.editInvoice.itemsTable.columns.actions)}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className={styles["tableBody"]}>
            {paginatedItems.map((item, pageIndex) => {
              const index = (currentPage - 1) * pageSize + pageIndex;
              return (
                <ItemTableRow
                  key={`${item.name}-${index}`}
                  item={item}
                  index={index}
                  editingCell={editingCell}
                  editValues={editValues}
                  isSelected={selectedIndices.has(index)}
                  isSaving={isSaving}
                  currencyCode={invoice.paymentInformation.currency.code}
                  locale={locale}
                  indicatorClass={getProductIndicatorClass(item)}
                  editInputRef={editInputRef}
                  onSelectRow={createSelectRowHandler(index)}
                  onCellClickName={createCellClickHandler(index, "name")}
                  onCellClickQuantity={createCellClickHandler(index, "quantity")}
                  onCellClickPrice={createCellClickHandler(index, "price")}
                  onNameChange={createEditChangeHandler(index, "name")}
                  onQuantityChange={createEditChangeHandler(index, "quantity")}
                  onPriceChange={createEditChangeHandler(index, "price")}
                  onSaveEdit={handleSaveEdit}
                  onEditKeyDown={handleEditKeyDown}
                  onRestore={createRestoreHandler(index)}
                  onEditAllergens={createEditAllergensHandler(index)}
                  onSoftDelete={createSoftDeleteHandler(index)}
                />
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
                {t((m) => m.pages.invoices.editInvoice.itemsTable.footer.total)}
              </TableHead>
              <TableHead className={styles["footerLabel"]}>
                {formatCurrency(totalAmount, {currencyCode: invoice.paymentInformation.currency.code, locale})}
              </TableHead>
              <TableHead colSpan={1} />
            </TableRow>
          </TableFooter>
        </Table>

        <div className={styles["addItemRow"]}>
          <Button
            variant='outline'
            size='sm'
            onClick={handleAddItem}
            className={styles["addItemButton"]}>
            <TbPlus className={styles["addItemIcon"]} />
            {t((m) => m.pages.invoices.editInvoice.itemsTable.buttons.addItem)}
          </Button>
        </div>

        {totalPages > 1 && (
          <div className={styles["paginationBar"]}>
            <div className={styles["paginationInfo"]}>
              {t((m) => m.pages.invoices.editInvoice.itemsTable.pagination.totalItems, {count: sortedItems.length})}
            </div>
            <div className={styles["paginationControls"]}>
              <Button
                variant='outline'
                className={styles["cursorPointer"]}
                size='sm'
                onClick={handlePreviousPage}>
                {t((m) => m.pages.invoices.editInvoice.itemsTable.pagination.previous)}
              </Button>
              <span className={styles["paginationText"]}>
                {t((m) => m.pages.invoices.editInvoice.itemsTable.pagination.pageOf, {
                  currentPage: String(currentPage),
                  totalPages: String(totalPages),
                })}
              </span>
              <Button
                variant='outline'
                className={styles["cursorPointer"]}
                size='sm'
                onClick={handleNextPage}>
                {t((m) => m.pages.invoices.editInvoice.itemsTable.pagination.next)}
              </Button>
            </div>
          </div>
        )}
      </div>

      <AlertDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t((m) => m.pages.invoices.editInvoice.itemsTable.deleteConfirm.title)}</AlertDialogTitle>
            <AlertDialogDescription>
              {t((m) => m.pages.invoices.editInvoice.itemsTable.deleteConfirm.description, {count: selectedIndices.size})}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t((m) => m.pages.invoices.editInvoice.itemsTable.deleteConfirm.cancel)}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSelected}>
              {t((m) => m.pages.invoices.editInvoice.itemsTable.deleteConfirm.confirm)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
