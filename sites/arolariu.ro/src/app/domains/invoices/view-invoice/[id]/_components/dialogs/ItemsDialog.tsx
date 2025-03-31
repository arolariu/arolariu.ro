/** @format */

"use client";

import {usePaginationWithSearch} from "@/hooks/usePagination";
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
import {useState} from "react";
import {TbDisc, TbPlus, TbTrash} from "react-icons/tb";
import {useDialog} from "../../_contexts/DialogContext";

/**
 * This function renders a dialog that allows users to edit invoice items.
 * It includes a table for displaying items, pagination, and controls for adding new items.
 * @returns The JSX for the items dialog.
 */
export default function ItemsDialog() {
  const {
    currentDialog: {payload},
  } = useDialog("editItems");

  const {items} = payload as Invoice;

  const {isOpen, open, close} = useDialog("editItems");
  const [editableItems, setEditableItems] = useState<Product[]>(items || []);
  const {currentPage, setCurrentPage, totalPages, paginatedItems} = usePaginationWithSearch<Product>({
    items: editableItems,
  });

  const handleAddNewItem = () => {
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
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const {name, value} = e.target;

    // Validate index is within bounds
    if (index < 0 || index >= editableItems.length) {
      return; // Early return if index is invalid
    }

    setEditableItems((prev) => {
      const updatedItems = [...prev];
      const currentItem = {...updatedItems[index]!};

      // Use specific property assignments rather than dynamic keys
      /* eslint-disable functional/immutable-data */
      switch (name) {
        case "rawName":
          currentItem.rawName = value;
          break;
        case "quantity":
          currentItem.quantity = Number.parseFloat(value);
          break;
        case "quantityUnit":
          currentItem.quantityUnit = value;
          break;
        case "price":
          currentItem.price = Number.parseFloat(value);
          break;
        default:
          // Ignore unrecognized properties
          return prev;
      }
      /* eslint-enable functional/immutable-data */

      updatedItems[index] = currentItem;
      return updatedItems;
    });
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(shouldOpen) => (shouldOpen ? open() : close())}>
      <DialogContent className='sm:max-w-2xl md:max-w-6xl'>
        <DialogHeader>
          <DialogTitle>Edit Invoice Items</DialogTitle>
          <DialogDescription>Update quantities, prices, or add new items to this invoice</DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='overflow-hidden rounded-md border'>
            <Table className='min-w-full divide-y divide-border'>
              <TableHeader>
                <TableRow className='bg-muted/50'>
                  <TableHead className='px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground'>
                    Item
                  </TableHead>
                  <TableHead className='px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground'>
                    Quantity
                  </TableHead>
                  <TableHead className='px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground'>
                    Unit
                  </TableHead>
                  <TableHead className='px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground'>
                    Price
                  </TableHead>
                  <TableHead className='px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground'>
                    Total
                  </TableHead>
                  <TableHead className='px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground'>
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className='divide-y divide-border bg-popover'>
                {paginatedItems.map((item, index) => (
                  <TableRow
                    key={item.rawName}
                    className='hover:bg-muted/50'>
                    <TableCell className='whitespace-nowrap px-4 py-3 text-sm font-medium'>
                      <Input
                        type='text'
                        name='rawName'
                        value={item.rawName}
                        onChange={(e) => handleValueChange(e, index)}
                        className='w-48'
                      />
                    </TableCell>
                    <TableCell className='whitespace-nowrap px-4 py-3 text-center text-sm'>
                      <Input
                        type='number'
                        name='quantity'
                        value={item.quantity}
                        onChange={(e) => handleValueChange(e, index)}
                        className='w-16 text-center'
                      />
                    </TableCell>
                    <TableCell className='whitespace-nowrap px-4 py-3 text-center text-sm'>
                      <Input
                        type='text'
                        name='quantityUnit'
                        value={item.quantityUnit}
                        onChange={(e) => handleValueChange(e, index)}
                        className='w-16 text-center'
                      />
                    </TableCell>
                    <TableCell className='whitespace-nowrap px-4 py-3 text-right text-sm'>
                      <Input
                        type='number'
                        name='price'
                        value={item.price}
                        onChange={(e) => handleValueChange(e, index)}
                        className='w-16 text-right'
                      />
                    </TableCell>
                    <TableCell className='whitespace-nowrap px-4 py-3 text-right text-sm font-medium'>
                      {item.price * item.quantity}
                    </TableCell>
                    <TableCell className='whitespace-nowrap px-4 py-3 text-center text-sm'>
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => {
                          const newItems = editableItems.filter((i) => i.rawName !== item.rawName);
                          setEditableItems(newItems);
                        }}>
                        <TbTrash className='h-4 w-4 text-red-500' />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className='bg-muted/50'>
                  <TableHead
                    className='px-4 py-3 text-sm font-medium text-muted-foreground'
                    colSpan={2}>
                    {editableItems.length} items found (showing {paginatedItems.length})
                  </TableHead>
                  <TableHead
                    className='px-4 py-3 text-right text-sm font-medium text-muted-foreground'
                    colSpan={2}>
                    Page {currentPage} of {totalPages}
                  </TableHead>
                  <TableHead
                    className='px-4 py-3 text-right text-sm font-medium text-muted-foreground'
                    colSpan={2}>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}>
                      Previous
                    </Button>
                    <Button
                      variant='ghost'
                      size='sm'
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
            <div className='text-sm text-muted-foreground'>
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
          <Button onClick={() => {}}>
            <TbDisc className='mr-2 h-4 w-4' />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
