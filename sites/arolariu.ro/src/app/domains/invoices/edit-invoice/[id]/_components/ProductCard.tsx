"use client";

import {Button} from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import Product, {ItemCategory} from "@/types/invoices/Product";
import {useState} from "react";

/**
 * This function renders the edit invoice item card.
 * @returns The JSX for the edit invoice item card.
 */
export default function ProductCard({item}: Readonly<{item: Product}>) {
  const [itemState, setItemState] = useState<Product>(item);
  const [isModified, setIsModified] = useState<boolean>(false);

  const capitalizeFirst15Words = (str: string) => {
    return str
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className='m-4 flex flex-col rounded-lg border border-gray-800 p-4 font-semibold dark:border-gray-200'>
      <Table className='table table-xs text-center'>
        <TableHeader>
          <TableRow>
            <TableHead className='text-center'>Attribute</TableHead>
            <TableHead className='text-center'>Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Raw Name</TableCell>
            <TableCell
              className='tooltip tooltip-top'
              data-tip={itemState.rawName}>
              {capitalizeFirst15Words(itemState.rawName)}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Generic Name</TableCell>
            <TableCell
              className='tooltip tooltip-bottom'
              data-tip={itemState.genericName}>
              {capitalizeFirst15Words(itemState.genericName)}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Category</TableCell>
            <TableCell>{ItemCategory[itemState.category]}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Quantity</TableCell>
            <TableCell>{itemState.quantity}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Quantity Unit</TableCell>
            <TableCell>{itemState.quantityUnit}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Price</TableCell>
            <TableCell>{itemState.price}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Total Price</TableCell>
            <TableCell>{itemState.totalPrice}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Product Code</TableCell>
            <TableCell>{itemState.productCode}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <div className='mx-auto mt-4 flex flex-row gap-4'>
        {isModified && (
          <Dialog>
            <DialogTrigger asChild>
              <Button className='mb-4 font-black'>✅ Save Changes</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Item</DialogTitle>
                <DialogDescription>
                  You can edit the item details here. <br />
                  Make sure to save or discard your changes.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button
                    type='submit'
                    className='btn btn-success'>
                    💾 Save item changes
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        <Dialog>
          <DialogTrigger asChild>
            <Button className='mb-4 font-black'>⚠️ Delete Item</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className='mb-4'>⚠️ WARNING: Delete Item</DialogTitle>
              <DialogDescription>
                This action is irreversible. <br />
                Deleting this item will remove it from the invoice.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button type='submit'>🗑️ Delete item</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
