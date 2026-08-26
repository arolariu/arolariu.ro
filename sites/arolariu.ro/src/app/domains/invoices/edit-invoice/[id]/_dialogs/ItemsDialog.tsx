"use client";

import {usePaginationWithSearch} from "@/hooks";
import {type Invoice, type Product} from "@/types/invoices";
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
} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {useCallback, useState} from "react";
import {TbDisc, TbPlus, TbTrash} from "react-icons/tb";
import {useDialog} from "../../../_contexts/DialogContext";
import styles from "./ItemsDialog.module.scss";

/**
 * Applies an editable input value to an invoice product.
 *
 * @param item - Existing product value.
 * @param field - Input field submitted by the editable row.
 * @param value - Raw input value.
 * @returns The updated product, or the original product for unsupported fields.
 */
function updateEditableItem(item: Product, field: string, value: string): Product {
  switch (field) {
    case "name":
      return {...item, name: value};
    case "quantity":
      return {...item, quantity: Number.parseFloat(value)};
    case "quantityUnit":
      return {...item, quantityUnit: value};
    case "price":
      return {...item, price: Number.parseFloat(value)};
    default:
      return item;
  }
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
 * - `classification`: `null` (unclassified)
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
  const {
    currentDialog: {payload},
    isOpen,
    close,
  } = useDialog("EDIT_INVOICE__ITEMS");

  // `payload` is `null` at runtime whenever the dialog has not been opened yet
  // (e.g. Storybook mounting this component directly, ahead of `DialogContainer`'s
  // production gate which only renders this component once `open()` has already
  // set a real invoice payload). Fall back to an empty items list so the
  // component never crashes on an initial closed render.
  const invoice: Invoice | null = payload ?? null;
  const items = invoice?.items ?? [];

  const [editableItems, setEditableItems] = useState<Product[]>(items);
  const {currentPage, setCurrentPage, totalPages, paginatedItems, pageSize} = usePaginationWithSearch<Product>({
    items: editableItems,
  });

  const handleSaveChanges = useCallback(() => {
    // TODO: Implement save functionality
    close();
  }, [close]);

  const handleAddNewItem = useCallback(() => {
    const newItem: Product = {
      name: "",
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
      allergenAssessment: null,
    };
    setEditableItems((prev) => [...prev, newItem]);
  }, [setEditableItems]);

  const handleDeleteItem = useCallback(
    (item: Product) => () => {
      // eslint-disable-next-line sonarjs/no-nested-functions -- Curried callback pattern required for item-specific delete handler
      setEditableItems((prev) => prev.filter((i) => i !== item));
    },
    [setEditableItems],
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

          const updatedItem = updateEditableItem(currentItem, name, value);

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

  /** Closes the dialog when its controlled open state changes to false. */
  const handleOpenChange = useCallback(
    (shouldOpen: boolean) => {
      if (!shouldOpen) close();
    },
    [close],
  );

  return (
    <Dialog
      open={isOpen}
      onOpenChange={handleOpenChange}>
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
                          onClick={handleDeleteItem(item)}>
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
                    colSpan={2}>
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
            onClick={handleSaveChanges}>
            <TbDisc className={styles["buttonIcon"]} />
            {t((m) => m.dialogs.invoices.itemsDialog.buttons.saveChanges)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
