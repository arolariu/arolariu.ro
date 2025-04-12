/** @format */

import type {Merchant} from "@/types/invoices";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@arolariu/components";
import {TbArrowRight, TbShoppingBag, TbShoppingCart} from "react-icons/tb";
import {useDialog} from "../../_contexts/DialogContext";

type Props = {
  merchant: Merchant;
};

/**
 * The MerchantCard component displays information about a merchant.
 * It includes the merchant's name and address, and buttons to view more details or all receipts from this merchant.
 * @returns The MerchantCard component, CSR'ed.
 */
export default function MerchantCard({merchant}: Readonly<Props>) {
  const {open: openMerchantInfoDialog} = useDialog("merchant", "view", merchant);
  const {open: openMerchantReceiptsDialog} = useDialog("merchantReceipts", "view", merchant);

  return (
    <Card className='group transition-shadow duration-300 hover:shadow-md'>
      <CardHeader>
        <CardTitle>Merchant</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='flex items-center'>
          <div className='bg-primary/10 mr-3 flex h-10 w-10 items-center justify-center rounded-full'>
            <TbShoppingCart className='text-primary h-5 w-5' />
          </div>
          <div>
            <p className='font-medium'>{merchant.name}</p>
            <p className='text-muted-foreground text-sm'>Address: {merchant.address}</p>
          </div>
        </div>
        <div className='space-y-2'>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='outline'
                  className='group w-full'
                  onClick={openMerchantInfoDialog}>
                  <span>View Merchant Details</span>
                  <TbArrowRight className='ml-2 h-4 w-4 transition-transform group-hover:translate-x-1' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>See detailed information about this merchant</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='outline'
                  className='group w-full'
                  onClick={openMerchantReceiptsDialog}>
                  <TbShoppingBag className='mr-2 h-4 w-4' />
                  <span>View All Receipts</span>
                  <TbArrowRight className='ml-2 h-4 w-4 transition-transform group-hover:translate-x-1' />
                </Button>
              </TooltipTrigger>
              <TooltipContent side='bottom'>
                <p>View all receipts from this merchant</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}
