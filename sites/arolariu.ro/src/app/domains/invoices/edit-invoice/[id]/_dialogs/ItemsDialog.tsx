"use client";

import {usePaginationWithSearch} from "@/hooks";
import {ClassificationSystem, type ClassificationSelection, type Product, ProductCategory} from "@/types/invoices";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from "@arolariu/components";
import {selectorFromPath, useTranslations} from "next-intl-selector";
import {useRouter} from "next/navigation";
import {useCallback, useEffect, useState} from "react";
import {TbDisc, TbPlus, TbTrash} from "react-icons/tb";
import {addInvoiceProduct, deleteInvoiceProduct, updateInvoiceProduct} from "../../../_actions/invoices";
import {useDialog} from "../../../_contexts/DialogContext";
import {ClassificationPicker} from "../../../_components/analysis/ClassificationPicker";
import styles from "./ItemsDialog.module.scss";

type EditableProduct = Omit<Product, "classification">
  & Readonly<{
    classification: ClassificationSelection | null;
    originalProductName: string | null;
  }>;

function toEditableProduct(product: Product): EditableProduct {
  return {
    ...product,
    classification: product.classification ?? null,
    originalProductName: product.name,
  };
}

function toProductMutation(
  item: EditableProduct,
): Omit<Product, "classification"> & Readonly<{classification: ClassificationSelection | null}> {
  const {classification, originalProductName: _originalProductName, ...product} = item;
  return {...product, classification};
}

/**
 * Dialog for bulk editing invoice line items with add, modify, and delete operations.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` directive).
 *
 * **Editing Capabilities**:
 * - **Add New Item**: Creates empty product row for manual entry
 * - **Edit Existing**: Inline editing of name, quantity, and price per item
 * - **Delete Item**: Remove items from the invoice
 * - **Pagination**: Navigate large item lists with page controls
 *
 * **Item Fields**:
 * - `name`: Product name as scanned/entered
 * - `classification`: Optional manual GS1 GPC code selection
 * - `quantity`: Number of units purchased
 * - `quantityUnit`: Unit of measurement (e.g., "kg", "pcs")
 * - `price`: Unit price
 * - `totalPrice`: Calculated line total
 *
 * **State Management**: Uses local `editableItems` state initialized from
 * invoice payload. Changes are staged locally until "Save Changes" is clicked.
 *
 * **Dialog Integration**: Uses `useDialog` hook with `INVOICE_ITEMS` type.
 * Payload contains the full invoice object.
 *
 * **Validation**: New items are created with sensible defaults:
 * - `category`: `ProductCategory.NOT_DEFINED` for legacy compatibility
 * - `quantity`: 1
 * - `price`: 0
 *
 * @returns Client-rendered dialog with editable items table and controls
 *
 * @example
 * ```tsx
 * // Opened via ItemsTable "Edit Items" button:
 * const {open} = useDialog("INVOICE_ITEMS", "edit", invoice);
 * <Button onClick={open}>Edit Items</Button>
 * ```
 *
 * @see {@link ItemsTable} - Component that opens this dialog
 * @see {@link Product} - Product type definition for line items
 * @see {@link useDialog} - Dialog state management hook
 */
export default function ItemsDialog(): React.JSX.Element {
  const t = useTranslations();
  const router = useRouter();
  const {
    currentDialog: {payload},
    isOpen,
    close,
  } = useDialog("EDIT_INVOICE__ITEMS");

  const invoice = payload;
  const {items} = invoice;

  const [editableItems, setEditableItems] = useState<EditableProduct[]>(() => items.map(toEditableProduct));
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const {currentPage, setCurrentPage, totalPages, paginatedItems, pageSize} = usePaginationWithSearch<EditableProduct>({
    items: editableItems,
  });

  useEffect(() => {
    setEditableItems(items.map(toEditableProduct));
  }, [items]);

  const handleSaveChanges = useCallback(async () => {
    setIsSaving(true);
    setSaveError(false);

    try {
      for (const item of editableItems) {
        if (item.name.trim().length === 0) {
          throw new Error("Product name is required.");
        }

        if (item.originalProductName === null) {
          const addResult = await addInvoiceProduct({
            invoiceId: invoice.id,
            product: toProductMutation(item),
          });
          if (!addResult.success) {
            throw new Error("Product creation failed.");
          }
          continue;
        }

        const updateResult = await updateInvoiceProduct({
          invoiceId: invoice.id,
          payload: {
            originalProductName: item.originalProductName,
            updatedProduct: toProductMutation(item),
          },
        });
        if (!updateResult.success) {
          throw new Error("Product update failed.");
        }
      }

      for (const originalItem of items) {
        const exists = editableItems.some((item) => item.originalProductName === originalItem.name);
        if (!exists) {
          const deleteResult = await deleteInvoiceProduct({invoiceId: invoice.id, productName: originalItem.name});
          if (!deleteResult.success) {
            throw new Error("Product deletion failed.");
          }
        }
      }

      close();
      router.refresh();
    } catch {
      setSaveError(true);
      toast.error(t(selectorFromPath("dialogs.invoices.itemsDialog.errors.saveFailed")));
    } finally {
      setIsSaving(false);
    }
  }, [close, editableItems, invoice.id, items, router, t]);

  const handleAddNewItem = useCallback(() => {
    const newItem: EditableProduct = {
      name: "",
      category: ProductCategory.NOT_DEFINED,
      detectedAllergens: [],
      metadata: {
        isComplete: false,
        isEdited: false,
        isSoftDeleted: false,
        confidence: 0,
      },
      productCode: "",
      totalPrice: 0,
      quantity: 1,
      quantityUnit: "",
      price: 0,
      classification: null,
      originalProductName: null,
    };
    setEditableItems((prev) => [...prev, newItem]);
  }, [setEditableItems]);

  const handleDeleteItem = useCallback(
    (item: EditableProduct) => () => {
      // eslint-disable-next-line sonarjs/no-nested-functions -- Curried callback pattern required for item-specific delete handler
      setEditableItems((prev) => prev.filter((i) => i !== item));
    },
    [setEditableItems],
  );

  const handleClassificationChangeAtIndex = useCallback(
    (index: number) => (classification: ClassificationSelection | null) => {
      setEditableItems((previousItems) => {
        const item = previousItems.at(index);
        return item === undefined
          ? previousItems
          : [...previousItems.slice(0, index), {...item, classification}, ...previousItems.slice(index + 1)];
      });
    },
    [],
  );

  /**
   * Factory: returns a stable input change handler for a specific item by index.
   * Supports editing name, quantity, quantityUnit, and price fields.
   */
  const handleValueChangeAtIndex = useCallback(
    (index: number) => {
      return (e: React.ChangeEvent<HTMLInputElement>) => {
        const {name, value} = e.target;

        setEditableItems((prev) => {
          // Validate index is within bounds
          if (index < 0 || index >= prev.length) {
            return prev; // Early return if index is invalid
          }

          const currentItem = prev.at(index);

          if (!currentItem) {
            return prev;
          }

          // Use specific property assignments with functional approach
          const getUpdatedItem = (): EditableProduct => {
            switch (name) {
              case "name":
                return {...currentItem, name: value};
              case "quantity":
                return {...currentItem, quantity: Number.parseFloat(value)};
              case "quantityUnit":
                return {...currentItem, quantityUnit: value};
              case "price":
                return {...currentItem, price: Number.parseFloat(value)};
              default:
                return currentItem;
            }
          };

          const updatedItem = getUpdatedItem();

          if (updatedItem === currentItem) {
            // No changes made
            return prev;
          }

          return [...prev.slice(0, index), updatedItem, ...prev.slice(index + 1)];
        });
      };
    },
    [setEditableItems],
  );

  /** Navigates to the previous page of items. */
  const handlePreviousPage = useCallback(() => {
    setCurrentPage(currentPage - 1);
  }, [currentPage, setCurrentPage]);

  /** Navigates to the next page of items. */
  const handleNextPage = useCallback(() => {
    setCurrentPage(currentPage + 1);
  }, [currentPage, setCurrentPage]);

  return (
    <Dialog
      open={isOpen}
      // eslint-disable-next-line react/jsx-no-bind -- simple dialog close handler
      onOpenChange={(shouldOpen) => {
        if (!shouldOpen) close();
      }}>
      <DialogContent className={styles["dialogContent"]}>
        <DialogHeader>
          <DialogTitle>{t((m) => m.dialogs.invoices.itemsDialog.title)}</DialogTitle>
          <DialogDescription>{t((m) => m.dialogs.invoices.itemsDialog.description)}</DialogDescription>
        </DialogHeader>

        <div className={styles["body"]}>
          <div className={styles["tableWrapper"]}>
            <Table className={styles["table"]}>
              <TableHeader>
                <TableRow className={styles["headerRow"]}>
                  <TableHead className={styles["tableHeader"]}>{t((m) => m.dialogs.invoices.itemsDialog.table.item)}</TableHead>
                  <TableHead className={styles["tableHeader"]}>{t((m) => m.dialogs.invoices.itemsDialog.table.classification)}</TableHead>
                  <TableHead className={styles["tableHeaderCenter"]}>{t((m) => m.dialogs.invoices.itemsDialog.table.quantity)}</TableHead>
                  <TableHead className={styles["tableHeaderCenter"]}>{t((m) => m.dialogs.invoices.itemsDialog.table.unit)}</TableHead>
                  <TableHead className={styles["tableHeaderRight"]}>{t((m) => m.dialogs.invoices.itemsDialog.table.price)}</TableHead>
                  <TableHead className={styles["tableHeaderRight"]}>{t((m) => m.dialogs.invoices.itemsDialog.table.total)}</TableHead>
                  <TableHead className={styles["tableHeaderCenter"]}>{t((m) => m.dialogs.invoices.itemsDialog.table.actions)}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className={styles["tableBody"]}>
                {paginatedItems.map((item, index) => {
                  const absoluteIndex = (currentPage - 1) * pageSize + index;
                  return (
                    <TableRow
                      key={`item-${absoluteIndex}`}
                      className={styles["dataRow"]}>
                      <TableCell className={styles["cellName"]}>
                        <Input
                          type='text'
                          name='name'
                          value={item.name}
                          onChange={handleValueChangeAtIndex(absoluteIndex)}
                          className={styles["nameInput"]}
                        />
                      </TableCell>
                      <TableCell className={styles["cellClassification"]}>
                        <ClassificationPicker
                          system={ClassificationSystem.Gs1Gpc}
                          value={item.classification}
                          onChange={handleClassificationChangeAtIndex(absoluteIndex)}
                          disabled={isSaving}
                        />
                      </TableCell>
                      <TableCell className={styles["cellCenter"]}>
                        <Input
                          type='number'
                          name='quantity'
                          value={item.quantity}
                          onChange={handleValueChangeAtIndex(absoluteIndex)}
                          className={styles["smallInput"]}
                        />
                      </TableCell>
                      <TableCell className={styles["cellCenter"]}>
                        <Input
                          type='text'
                          name='quantityUnit'
                          value={item.quantityUnit}
                          onChange={handleValueChangeAtIndex(absoluteIndex)}
                          className={styles["smallInput"]}
                        />
                      </TableCell>
                      <TableCell className={styles["cellRight"]}>
                        <Input
                          type='number'
                          name='price'
                          value={item.price}
                          onChange={handleValueChangeAtIndex(absoluteIndex)}
                          className={styles["smallInputRight"]}
                        />
                      </TableCell>
                      <TableCell className={styles["cellRightBold"]}>{item.price * item.quantity}</TableCell>
                      <TableCell className={styles["cellCenter"]}>
                        <Button
                          variant='ghost'
                          size='icon'
                          aria-label={t((m) => m.dialogs.invoices.itemsDialog.aria.deleteItem, {
                            name: item.name || t((m) => m.dialogs.invoices.itemsDialog.aria.unnamedItem),
                          })}
                          onClick={handleDeleteItem(item)}
                          disabled={isSaving}>
                          <TbTrash className={styles["trashIcon"]} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow className={styles["headerRow"]}>
                  <TableHead
                    className={styles["tableHeader"]}
                    colSpan={3}>
                    <span
                      role='status'
                      aria-live='polite'
                      aria-atomic='true'>
                      {t((m) => m.dialogs.invoices.itemsDialog.footer.itemsFound, {
                        total: String(editableItems.length),
                        shown: String(paginatedItems.length),
                      })}
                    </span>
                  </TableHead>
                  <TableHead
                    className={styles["tableHeaderRight"]}
                    colSpan={2}>
                    <span
                      role='status'
                      aria-live='polite'
                      aria-atomic='true'>
                      {t((m) => m.dialogs.invoices.itemsDialog.footer.page, {current: String(currentPage), total: String(totalPages)})}
                    </span>
                  </TableHead>
                  <TableHead
                    className={styles["tableHeaderRight"]}
                    colSpan={2}>
                    <Button
                      variant='ghost'
                      size='sm'
                      aria-label={t((m) => m.dialogs.invoices.itemsDialog.aria.previousPage, {page: String(currentPage - 1)})}
                      onClick={handlePreviousPage}
                      disabled={currentPage === 1}>
                      {t((m) => m.dialogs.invoices.itemsDialog.buttons.previous)}
                    </Button>
                    <Button
                      variant='ghost'
                      size='sm'
                      aria-label={t((m) => m.dialogs.invoices.itemsDialog.aria.nextPage, {page: String(currentPage + 1)})}
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}>
                      {t((m) => m.dialogs.invoices.itemsDialog.buttons.next)}
                    </Button>
                  </TableHead>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
          {saveError ? (
            <p
              className={styles["saveError"]}
              role='alert'>
              {t(selectorFromPath("dialogs.invoices.itemsDialog.errors.saveFailed"))}
            </p>
          ) : null}

          {/* Controls */}
          <div className={styles["controls"]}>
            <Button
              type='button'
              variant='outline'
              aria-label={t((m) => m.dialogs.invoices.itemsDialog.aria.addItem)}
              onClick={handleAddNewItem}>
              <TbPlus className={styles["buttonIcon"]} />
              {t((m) => m.dialogs.invoices.itemsDialog.buttons.addItem)}
            </Button>
            <div
              className={styles["itemCount"]}
              role='status'
              aria-live='polite'>
              {t((m) => m.dialogs.invoices.itemsDialog.footer.itemsTotal, {count: items.length})}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant='outline'
            aria-label={t((m) => m.dialogs.invoices.itemsDialog.aria.cancel)}
            onClick={close}>
            {t((m) => m.dialogs.invoices.itemsDialog.buttons.cancel)}
          </Button>
          <Button
            aria-label={t((m) => m.dialogs.invoices.itemsDialog.aria.save)}
            onClick={handleSaveChanges}
            disabled={isSaving}>
            <TbDisc className={styles["buttonIcon"]} />
            {isSaving
              ? t((m) => m.dialogs.invoices.itemsDialog.buttons.saving)
              : t((m) => m.dialogs.invoices.itemsDialog.buttons.saveChanges)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
