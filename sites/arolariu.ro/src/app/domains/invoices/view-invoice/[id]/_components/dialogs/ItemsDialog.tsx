/** @format */

"use client";

import {usePagination} from "@/hooks/usePagination";
import {Invoice, Product} from "@/types/invoices";
import {Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@arolariu/components";
import {Plus, Save} from "lucide-react";
import {useState} from "react";
import {useDialog} from "../../_contexts/DialogContext";

type Props = {
  invoice: Invoice;
};

export function ItemsDialog({invoice}: Readonly<Props>) {
  const {isOpen, open, close} = useDialog("editItems");
  const [items, setItems] = useState<Product[]>(invoice.items);

  // Use our custom pagination hook
  const {currentPage, setCurrentPage, pageSize, setPageSize, totalPages, paginatedItems} = usePagination<Product>({
    items: items,
  });

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(shouldOpen) => (shouldOpen ? open() : close())}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Edit Invoice Items</DialogTitle>
          <DialogDescription>Update quantities, prices, or add new items to this invoice</DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='overflow-hidden rounded-md border'>
            <table className='divide-border min-w-full divide-y'>
              <thead>
                <tr className='bg-muted/50'>
                  <th className='text-muted-foreground px-4 py-3 text-left text-xs font-medium uppercase tracking-wider'>Item</th>
                  <th className='text-muted-foreground px-4 py-3 text-center text-xs font-medium uppercase tracking-wider'>Quantity</th>
                  <th className='text-muted-foreground px-4 py-3 text-center text-xs font-medium uppercase tracking-wider'>Unit</th>
                  <th className='text-muted-foreground px-4 py-3 text-right text-xs font-medium uppercase tracking-wider'>Price</th>
                  <th className='text-muted-foreground px-4 py-3 text-right text-xs font-medium uppercase tracking-wider'>Total</th>
                  <th className='text-muted-foreground px-4 py-3 text-center text-xs font-medium uppercase tracking-wider'>Actions</th>
                </tr>
              </thead>
              <tbody className='bg-popover divide-border divide-y'>
                {paginatedItems.map((item) => (
                  <tr
                    key={item.rawName}
                    className='hover:bg-muted/50'></tr>
                ))}
              </tbody>
              <tfoot>
                <tr className='bg-muted/50'>
                  <th
                    colSpan={4}
                    className='px-4 py-3 text-right text-sm font-medium'>
                    Total
                  </th>
                  <th className='px-4 py-3 text-right text-sm font-medium'>TOTAL</th>
                  <th></th>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Pagination */}

          {/* Controls */}
          <div className='flex justify-between'>
            <Button
              type='button'
              variant='outline'
              onClick={() => {}}>
              <Plus className='mr-2 h-4 w-4' />
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
          <Button onClick={() => {}}>
            <Save className='mr-2 h-4 w-4' />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
