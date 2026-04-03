"use client";

import {usePaginationWithSearch} from "@/hooks";
import {Invoice, Product, ProductCategory} from "@/types/invoices";
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
import {useTranslations} from "next-intl";
import {useCallback, useState} from "react";
import {TbDisc, TbPlus, TbTrash} from "react-icons/tb";
import {useDialog} from "../../../../_contexts/DialogContext";
import styles from "./ItemsDialog.module.scss";

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
 * - `rawName`: Product name as scanned/entered
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
 * - `category`: `ProductCategory.NOT_DEFINED`
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
  const t = useTranslations("IMS--Dialogs.itemsDialog");
  const {
    currentDialog: {payload},
    isOpen,
    open,
    close,
  } = useDialog("EDIT_INVOICE__ITEMS");

  const {items} = payload as Invoice;

  const [editableItems, setEditableItems] = useState<Product[]>(items || []);
  const {currentPage, setCurrentPage, totalPages, paginatedItems} = usePaginationWithSearch<Product>({
    items: editableItems,
  });

  const handleSaveChanges = useCallback(() => {
    // TODO: Implement save functionality
    close();
  }, [close]);

  const handleAddNewItem = useCallback(() => {
    const newItem: Product = {
      rawName: "",
      genericName: "",
      category: ProductCategory.NOT_DEFINED,
      detectedAllergens: [],
      metadata: {
        isComplete: false,
        isEdited: false,
        isSoftDeleted: false,
      },
      productCode: "",
      totalPrice: 0,
      quantity: 1,
      quantityUnit: "",
      price: 0,
    };
    setEditableItems((prev) => [...prev, newItem]);
  }, [setEditableItems]);

  const handleDeleteItem = useCallback(
    (item: Product) => () => {
      // eslint-disable-next-line sonarjs/no-nested-functions -- Curried callback pattern required for item-specific delete handler
      setEditableItems((prev) => prev.filter((i) => i.rawName !== item.rawName));
    },
    [setEditableItems],
  );

  const handleValueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
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
        const getUpdatedItem = (): Product => {
          switch (name) {
            case "rawName":
              return {...currentItem, rawName: value};
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
    },
    [setEditableItems],
  );

  return (
    <Dialog
      open={isOpen}
      // eslint-disable-next-line react/jsx-no-bind -- this is a simple fn.
      onOpenChange={(shouldOpen) => (shouldOpen ? open() : close())}>
      <DialogContent className={styles["dialogContent"]}>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className={styles["body"]}>
          <div className={styles["tableWrapper"]}>
            <Table className={styles["table"]}>
              <TableHeader>
                <TableRow className={styles["headerRow"]}>
                  <TableHead className={styles["tableHeader"]}>{t("table.item")}</TableHead>
                  <TableHead className={styles["tableHeaderCenter"]}>{t("table.quantity")}</TableHead>
                  <TableHead className={styles["tableHeaderCenter"]}>{t("table.unit")}</TableHead>
                  <TableHead className={styles["tableHeaderRight"]}>{t("table.price")}</TableHead>
                  <TableHead className={styles["tableHeaderRight"]}>{t("table.total")}</TableHead>
                  <TableHead className={styles["tableHeaderCenter"]}>{t("table.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className={styles["tableBody"]}>
                {paginatedItems.map((item, index) => (
                  <TableRow
                    key={item.rawName}
                    className={styles["dataRow"]}>
                    <TableCell className={styles["cellName"]}>
                      <Input
                        type='text'
                        name='rawName'
                        value={item.rawName}
                        // eslint-disable-next-line react-compiler/react-compiler -- inputs always change - ok usage.
                        onChange={(e) => handleValueChange(e, index)}
                        className={styles["nameInput"]}
                      />
                    </TableCell>
                    <TableCell className={styles["cellCenter"]}>
                      <Input
                        type='number'
                        name='quantity'
                        value={item.quantity}
                        // eslint-disable-next-line react-compiler/react-compiler -- inputs always change - ok usage.
                        onChange={(e) => handleValueChange(e, index)}
                        className={styles["smallInput"]}
                      />
                    </TableCell>
                    <TableCell className={styles["cellCenter"]}>
                      <Input
                        type='text'
                        name='quantityUnit'
                        value={item.quantityUnit}
                        // eslint-disable-next-line react-compiler/react-compiler -- inputs always change - ok usage.
                        onChange={(e) => handleValueChange(e, index)}
                        className={styles["smallInput"]}
                      />
                    </TableCell>
                    <TableCell className={styles["cellRight"]}>
                      <Input
                        type='number'
                        name='price'
                        value={item.price}
                        // eslint-disable-next-line react-compiler/react-compiler -- inputs always change - ok usage.
                        onChange={(e) => handleValueChange(e, index)}
                        className={styles["smallInputRight"]}
                      />
                    </TableCell>
                    <TableCell className={styles["cellRightBold"]}>{item.price * item.quantity}</TableCell>
                    <TableCell className={styles["cellCenter"]}>
                      <Button
                        variant='ghost'
                        size='icon'
                        aria-label={t("aria.deleteItem", {name: item.rawName || t("aria.unnamedItem")})}
                        onClick={handleDeleteItem(item)}>
                        <TbTrash className={styles["trashIcon"]} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
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
                      {t("footer.itemsFound", {total: String(editableItems.length), shown: String(paginatedItems.length)})}
                    </span>
                  </TableHead>
                  <TableHead
                    className={styles["tableHeaderRight"]}
                    colSpan={2}>
                    <span
                      role='status'
                      aria-live='polite'
                      aria-atomic='true'>
                      {t("footer.page", {current: String(currentPage), total: String(totalPages)})}
                    </span>
                  </TableHead>
                  <TableHead
                    className={styles["tableHeaderRight"]}
                    colSpan={2}>
                    <Button
                      variant='ghost'
                      size='sm'
                      aria-label={t("aria.previousPage", {page: String(currentPage - 1)})}
                      // eslint-disable-next-line react-compiler/react-compiler -- inputs always change - ok usage.
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}>
                      {t("buttons.previous")}
                    </Button>
                    <Button
                      variant='ghost'
                      size='sm'
                      aria-label={t("aria.nextPage", {page: String(currentPage + 1)})}
                      // eslint-disable-next-line react-compiler/react-compiler -- inputs always change - ok usage.
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}>
                      {t("buttons.next")}
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
              aria-label={t("aria.addItem")}
              onClick={handleAddNewItem}>
              <TbPlus className={styles["buttonIcon"]} />
              {t("buttons.addItem")}
            </Button>
            <div
              className={styles["itemCount"]}
              role='status'
              aria-live='polite'>
              {t("footer.itemsTotal", {count: items.length})}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant='outline'
            aria-label={t("aria.cancel")}
            onClick={close}>
            {t("buttons.cancel")}
          </Button>
          <Button
            aria-label={t("aria.save")}
            onClick={handleSaveChanges}>
            <TbDisc className={styles["buttonIcon"]} />
            {t("buttons.saveChanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
