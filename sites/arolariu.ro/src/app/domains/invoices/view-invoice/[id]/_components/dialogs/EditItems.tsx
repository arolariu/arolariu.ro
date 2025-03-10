/** @format */

"use client";

import {Product} from "@/types/invoices";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@arolariu/components";
import {Edit2, Plus, Save, Table, Trash2, X} from "lucide-react";
import {useState} from "react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: Product[];
  currency: string;
  onSave: (items: Product[]) => void;
};

export function EditItemsDialog({open, onOpenChange, items: initialItems, currency, onSave}: Readonly<Props>) {
  const [items, setItems] = useState<Product[]>(initialItems);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<Partial<Product>>({
    quantityUnit: "item",
    quantity: 1,
    price: 0,
  });

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-[700px]'>
        <DialogHeader>
          <DialogTitle>Edit Invoice Items</DialogTitle>
          <DialogDescription>Add, edit or remove items from this invoice</DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className='w-[100px] text-right'>Qty</TableHead>
                <TableHead className='w-[100px] text-right'>Unit</TableHead>
                <TableHead className='w-[100px] text-right'>Price</TableHead>
                <TableHead className='w-[100px] text-right'>Total</TableHead>
                <TableHead className='w-[70px]'></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={`item-${index}`}>
                  <TableCell>{item.rawName}</TableCell>
                  <TableCell className='text-right'>{item.quantity}</TableCell>
                  <TableCell className='text-right'>{item.quantityUnit}</TableCell>
                  <TableCell className='text-right'>{item.price}</TableCell>
                  <TableCell className='text-right font-medium'>{item.price * item.quantity}</TableCell>
                  <TableCell>
                    <div className='flex items-center justify-end space-x-1'>
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => {}}>
                        <Edit2 className='h-4 w-4' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => {}}>
                        <Trash2 className='text-destructive h-4 w-4' />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {/* Add new item form */}
              {showAddForm && (
                <TableRow>
                  <TableCell>
                    <Input
                      placeholder='Item name'
                      value={newItem.rawName}
                      onChange={(e) => {}}
                      className='w-full'
                    />
                  </TableCell>
                  <TableCell className='text-right'>
                    <Input
                      type='number'
                      placeholder='Qty'
                      value={newItem.quantity}
                      onChange={(e) => {}}
                      className='w-full text-right'
                      min={0.01}
                      step={0.01}
                    />
                  </TableCell>
                  <TableCell className='text-right'>
                    <Input
                      placeholder='Unit'
                      value={newItem.quantityUnit}
                      onChange={(e) => {}}
                      className='w-full text-right'
                    />
                  </TableCell>
                  <TableCell className='text-right'>
                    <Input
                      type='number'
                      placeholder='Price'
                      value={newItem.price}
                      onChange={(e) => {}}
                      className='w-full text-right'
                      min={0.01}
                      step={0.01}
                    />
                  </TableCell>
                  <TableCell className='text-right font-medium'>
                    {((newItem.price as number) || 0) * ((newItem.quantity as number) || 0)}
                  </TableCell>
                  <TableCell>
                    <div className='flex items-center justify-end space-x-1'>
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => setShowAddForm(false)}>
                        <X className='h-4 w-4' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => {}}>
                        <Save className='h-4 w-4' />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {!showAddForm && (
            <Button
              variant='outline'
              size='sm'
              className='mt-2'
              onClick={() => setShowAddForm(true)}>
              <Plus className='mr-2 h-4 w-4' />
              Add Item
            </Button>
          )}

          <div className='flex items-center justify-between border-t pt-4'>
            <div>
              <p className='text-sm font-medium'>Total Items: {items.length}</p>
              <p className='text-muted-foreground text-sm'>
                Total Quantity: {items.reduce((sum, item) => sum + item.quantity, 0)}
              </p>
            </div>
            <div className='text-right'>
              <p className='text-sm font-medium'>Subtotal</p>
              <p className='text-lg font-bold'>{items.reduce((sum, item) => sum + item.price * item.quantity, 0)}</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}>
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
