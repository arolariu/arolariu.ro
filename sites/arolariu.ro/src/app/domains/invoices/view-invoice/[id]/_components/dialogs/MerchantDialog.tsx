/** @format */

import type {Merchant} from "@/types/invoices";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@arolariu/components";
import {Building, Building2, MapPin, Phone} from "lucide-react";
import {useDialog} from "../../_contexts/DialogContext";

type Props = {
  merchant: Merchant;
};

export function MerchantDialog({merchant}: Readonly<Props>) {
  const {isOpen, open, close} = useDialog("merchant");
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(shouldOpen) => (shouldOpen ? open() : close())}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Merchant Details</DialogTitle>
          <DialogDescription>Information about {merchant.name}</DialogDescription>
        </DialogHeader>
        <div className='space-y-4 py-2'>
          <div className='flex items-center space-x-3'>
            <div className='flex h-12 w-12 items-center justify-center rounded-full bg-primary/10'>
              <Building className='h-6 w-6 text-primary' />
            </div>
            <div>
              <h3 className='text-lg font-medium'>{merchant.name}</h3>
              <p className='text-muted-foreground text-sm'>{merchant.category}</p>
            </div>
          </div>

          <Table>
            <TableBody>
              <TableRow>
                <TableCell className='py-2 pl-0'>
                  <div className='flex items-center'>
                    <MapPin className='text-muted-foreground mr-2 h-4 w-4' />
                    <span className='font-medium'>Address</span>
                  </div>
                </TableCell>
                <TableCell className='py-2'>{merchant.address}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className='py-2 pl-0'>
                  <div className='flex items-center'>
                    <Phone className='text-muted-foreground mr-2 h-4 w-4' />
                    <span className='font-medium'>Phone</span>
                  </div>
                </TableCell>
                <TableCell className='py-2'>{merchant.phoneNumber}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className='py-2 pl-0'>
                  <div className='flex items-center'>
                    <Building2 className='text-muted-foreground mr-2 h-4 w-4' />
                    <span className='font-medium'>Parent Company</span>
                  </div>
                </TableCell>
                <TableCell className='py-2'>{merchant.parentCompanyId}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div className='flex flex-col items-center justify-end gap-4'>
          <Button
            type='button'
            variant={"default"}
            className='w-full'>
            Open in Maps
          </Button>
          <Button
            type='button'
            variant={"secondary"}
            className='w-full'>
            Call merchant
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
