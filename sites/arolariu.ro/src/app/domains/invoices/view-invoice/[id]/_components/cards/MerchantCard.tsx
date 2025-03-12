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

type Props = {
  merchant: Merchant;
};

export default function MerchantCard({merchant}: Readonly<Props>) {
  return (
    <Card className='group transition-shadow duration-300 hover:shadow-md'>
      <CardHeader>
        <CardTitle>Merchant</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='flex items-center'>
          <div className='mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10'>
            <TbShoppingCart className='h-5 w-5 text-primary' />
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
                  onClick={() => {}}>
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
                  onClick={() => {}}>
                  <TbShoppingBag className='mr-2 h-4 w-4' />
                  <span>View All Receipts</span>
                  <TbArrowRight className='ml-2 h-4 w-4 transition-transform group-hover:translate-x-1' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View all receipts from this merchant</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}
