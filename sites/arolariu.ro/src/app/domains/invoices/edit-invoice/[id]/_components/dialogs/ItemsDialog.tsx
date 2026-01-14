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
import {useCallback, useState} from "react";
import {TbDisc, TbPlus, TbTrash} from "react-icons/tb";
import {useDialog} from "../../../../_contexts/DialogContext";

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
      <DialogContent className='sm:max-w-2xl md:max-w-6xl'>
        <DialogHeader>
          <DialogTitle>Edit Invoice Items</DialogTitle>
          <DialogDescription>Update quantities, prices, or add new items to this invoice</DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='overflow-hidden rounded-md border'>
            <Table className='divide-border min-w-full divide-y'>
              <TableHeader>
                <TableRow className='bg-muted/50'>
                  <TableHead className='text-muted-foreground px-4 py-3 text-left text-xs font-medium tracking-wider uppercase'>
                    Item
                  </TableHead>
                  <TableHead className='text-muted-foreground px-4 py-3 text-center text-xs font-medium tracking-wider uppercase'>
                    Quantity
                  </TableHead>
                  <TableHead className='text-muted-foreground px-4 py-3 text-center text-xs font-medium tracking-wider uppercase'>
                    Unit
                  </TableHead>
                  <TableHead className='text-muted-foreground px-4 py-3 text-right text-xs font-medium tracking-wider uppercase'>
                    Price
                  </TableHead>
                  <TableHead className='text-muted-foreground px-4 py-3 text-right text-xs font-medium tracking-wider uppercase'>
                    Total
                  </TableHead>
                  <TableHead className='text-muted-foreground px-4 py-3 text-center text-xs font-medium tracking-wider uppercase'>
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className='divide-border bg-popover divide-y'>
                {paginatedItems.map((item, index) => (
                  <TableRow
                    key={item.rawName}
                    className='hover:bg-muted/50'>
                    <TableCell className='px-4 py-3 text-sm font-medium whitespace-nowrap'>
                      <Input
                        type='text'
                        name='rawName'
                        value={item.rawName}
                        // eslint-disable-next-line -- inputs always change - ok usage.
                        onChange={(e) => handleValueChange(e, index)}
                        className='w-48'
                      />
                    </TableCell>
                    <TableCell className='px-4 py-3 text-center text-sm whitespace-nowrap'>
                      <Input
                        type='number'
                        name='quantity'
                        value={item.quantity}
                        // eslint-disable-next-line -- inputs always change - ok usage.
                        onChange={(e) => handleValueChange(e, index)}
                        className='w-16 text-center'
                      />
                    </TableCell>
                    <TableCell className='px-4 py-3 text-center text-sm whitespace-nowrap'>
                      <Input
                        type='text'
                        name='quantityUnit'
                        value={item.quantityUnit}
                        // eslint-disable-next-line -- inputs always change - ok usage.
                        onChange={(e) => handleValueChange(e, index)}
                        className='w-16 text-center'
                      />
                    </TableCell>
                    <TableCell className='px-4 py-3 text-right text-sm whitespace-nowrap'>
                      <Input
                        type='number'
                        name='price'
                        value={item.price}
                        // eslint-disable-next-line -- inputs always change - ok usage.
                        onChange={(e) => handleValueChange(e, index)}
                        className='w-16 text-right'
                      />
                    </TableCell>
                    <TableCell className='px-4 py-3 text-right text-sm font-medium whitespace-nowrap'>
                      {item.price * item.quantity}
                    </TableCell>
                    <TableCell className='px-4 py-3 text-center text-sm whitespace-nowrap'>
                      <Button
                        variant='ghost'
                        size='icon'
                        aria-label={`Delete item: ${item.rawName || "unnamed item"}`}
                        onClick={handleDeleteItem(item)}>
                        <TbTrash className='h-4 w-4 text-red-500' />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className='bg-muted/50'>
                  <TableHead
                    className='text-muted-foreground px-4 py-3 text-sm font-medium'
                    colSpan={2}>
                    <span
                      role='status'
                      aria-live='polite'
                      aria-atomic='true'>
                      {editableItems.length} items found (showing {paginatedItems.length})
                    </span>
                  </TableHead>
                  <TableHead
                    className='text-muted-foreground px-4 py-3 text-right text-sm font-medium'
                    colSpan={2}>
                    <span
                      role='status'
                      aria-live='polite'
                      aria-atomic='true'>
                      Page {currentPage} of {totalPages}
                    </span>
                  </TableHead>
                  <TableHead
                    className='text-muted-foreground px-4 py-3 text-right text-sm font-medium'
                    colSpan={2}>
                    <Button
                      variant='ghost'
                      size='sm'
                      aria-label={`Go to previous page (page ${currentPage - 1})`}
                      // eslint-disable-next-line -- inputs always change - ok usage.
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}>
                      Previous
                    </Button>
                    <Button
                      variant='ghost'
                      size='sm'
                      aria-label={`Go to next page (page ${currentPage + 1})`}
                      // eslint-disable-next-line -- inputs always change - ok usage.
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}>
                      Next
                    </Button>
                  </TableHead>
                </TableRow>
              </TableFooter>
            </Table>
          </div>

          {/* Controls */}
          <div className='flex justify-between'>
            <Button
              type='button'
              variant='outline'
              aria-label='Add a new item to the invoice'
              onClick={handleAddNewItem}>
              <TbPlus className='mr-2 h-4 w-4' />
              Add Item
            </Button>
            <div
              className='text-muted-foreground text-sm'
              role='status'
              aria-live='polite'>
              {items.length} {items.length === 1 ? "item" : "items"} in total
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant='outline'
            aria-label='Cancel editing and close dialog'
            onClick={close}>
            Cancel
          </Button>
          <Button
            aria-label='Save changes to invoice items'
            onClick={handleSaveChanges}>
            <TbDisc className='mr-2 h-4 w-4' />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
