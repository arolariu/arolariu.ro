/** @format */

import type {Merchant} from "@/types/invoices";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  TableBody,
  TableCell,
  TableRow,
} from "@arolariu/components";
import {Building, Building2, MapPin, Phone, Table} from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  merchant: Merchant;
};

export function MerchantDetailsDialog({open, onOpenChange, merchant}: Readonly<Props>) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}>
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
              <TableRow>
                <TableCell className='py-2 pl-0'>
                  <div className='flex items-center'>
                    <span className='font-medium'>ID</span>
                  </div>
                </TableCell>
                <TableCell className='py-2'>{merchant.id}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
