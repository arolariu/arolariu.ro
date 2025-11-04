"use client";

import {useCallback, useState} from "react";
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
import {TbDisc, TbPlus, TbTrash} from "react-icons/tb";
import {useDialog} from "../../../../_contexts/DialogContext";

/**
 * This function renders a dialog that allows users to edit invoice items.
 * It includes a table for displaying items, pagination, and controls for adding new items.
 * @returns The JSX for the items dialog.
 */
export default function ItemsDialog(): React.JSX.Element {
  const {
    currentDialog: {payload},
    isOpen,
    open,
    close,
  } = useDialog("INVOICE_ITEMS");

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

  const handleDeleteItem = useCallback((item: Product) => {
    const newItems = editableItems.filter((i) => i.rawName !== item.rawName);
    setEditableItems(newItems);
  }, [editableItems, setEditableItems]);

  const handleValueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const {name, value} = e.target;

    // Validate index is within bounds
    if (index < 0 || index >= editableItems.length) {
      return; // Early return if index is invalid
    }

    setEditableItems((prev) => {
      const updatedItems = [...prev];
      const currentItem = updatedItems.at(index);

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

      return [...updatedItems.slice(0, index), updatedItem, ...updatedItems.slice(index + 1)];
    });
  }, [editableItems, setEditableItems]);

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
                        onClick={() => handleDeleteItem(item)}>
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
                    {editableItems.length} items found (showing {paginatedItems.length})
                  </TableHead>
                  <TableHead
                    className='text-muted-foreground px-4 py-3 text-right text-sm font-medium'
                    colSpan={2}>
                    Page {currentPage} of {totalPages}
                  </TableHead>
                  <TableHead
                    className='text-muted-foreground px-4 py-3 text-right text-sm font-medium'
                    colSpan={2}>
                    <Button
                      variant='ghost'
                      size='sm'
                      // eslint-disable-next-line -- inputs always change - ok usage.
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}>
                      Previous
                    </Button>
                    <Button
                      variant='ghost'
                      size='sm'
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
              onClick={handleAddNewItem}>
              <TbPlus className='mr-2 h-4 w-4' />
              Add Item
            </Button>
            <div className='text-muted-foreground text-sm'>
              {items.length} {items.length === 1 ? "item" : "items"} in total
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={close}>
            Cancel
          </Button>
          <Button onClick={handleSaveChanges}>
            <TbDisc className='mr-2 h-4 w-4' />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
