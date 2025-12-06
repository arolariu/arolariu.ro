import {type Merchant, MerchantCategory} from "@/types/invoices";
import {
  Badge,
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
import {TbBuilding, TbBuildingStore, TbMapPin, TbPhone} from "react-icons/tb";
import {useDialog} from "../../../../_contexts/DialogContext";

/**
 * This function renders a dialog that displays information about a specific merchant.
 * It includes details such as the merchant's name, address, phone number, and parent company.
 * The dialog is opened and closed using a custom hook.
 * @returns The JSX for the merchant dialog, CSR'ed.
 */
export default function MerchantDialog(): React.JSX.Element {
  const {
    currentDialog: {payload},
    isOpen,
    open,
    close,
  } = useDialog("INVOICE_MERCHANT");

  const merchant = payload as Merchant;

  const merchantCategoryKey = Object.keys(MerchantCategory)[merchant.category];
  const merchantCategoryAsString = MerchantCategory[merchantCategoryKey as keyof typeof MerchantCategory];

  return (
    <Dialog
      open={isOpen}
      // eslint-disable-next-line react/jsx-no-bind -- this is a simple fn.
      onOpenChange={(shouldOpen) => (shouldOpen ? open() : close())}>
      <DialogContent className='sm:max-w-md md:max-w-xl'>
        <DialogHeader className='items-start justify-start justify-items-start'>
          <DialogTitle>Merchant Details</DialogTitle>
          <DialogDescription>Information about {merchant.name}</DialogDescription>
        </DialogHeader>
        <div className='space-y-4 py-2'>
          <div className='flex items-center space-x-3'>
            <div className='bg-primary/10 flex h-12 w-12 items-center justify-center rounded-full'>
              <TbBuilding className='text-primary h-6 w-6' />
            </div>
            <div>
              <h3 className='text-lg font-medium'>{merchant.name}</h3>
              <Badge
                variant='outline'
                className='text-muted-foreground'>
                {merchantCategoryAsString}
              </Badge>
            </div>
          </div>

          <Table>
            <TableBody>
              <TableRow>
                <TableCell className='py-2 pl-0'>
                  <div className='flex items-center'>
                    <TbMapPin className='text-muted-foreground mr-2 h-4 w-4' />
                    <span className='font-medium'>Address</span>
                  </div>
                </TableCell>
                <TableCell className='py-2'>{merchant.address.address}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className='py-2 pl-0'>
                  <div className='flex items-center'>
                    <TbPhone className='text-muted-foreground mr-2 h-4 w-4' />
                    <span className='font-medium'>Phone</span>
                  </div>
                </TableCell>
                <TableCell className='py-2'>{merchant.address.phoneNumber}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className='py-2 pl-0'>
                  <div className='flex items-center'>
                    <TbBuildingStore className='text-muted-foreground mr-2 h-4 w-4' />
                    <span className='font-medium'>Parent Company</span>
                  </div>
                </TableCell>
                <TableCell className='py-2'>{merchant.parentCompanyId}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div className='flex flex-col items-center justify-center justify-items-center gap-2'>
          <Button
            type='button'
            className='w-full'>
            Open in Maps
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
