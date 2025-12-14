"use client";

import {formatEnum} from "@/lib/utils.generic";
import {MerchantCategory} from "@/types/invoices";
import {Badge, Button, Card, CardContent, CardFooter, CardHeader, CardTitle} from "@arolariu/components";
import {TbGlobe, TbMapPin, TbPhone} from "react-icons/tb";
import {useInvoiceContext} from "../../_context/InvoiceContext";

export function MerchantInfoCard(): React.JSX.Element {
  const {merchant} = useInvoiceContext();
  return (
    <Card className='transition-shadow duration-300 hover:shadow-md'>
      <CardHeader>
        <CardTitle className='text-lg'>{merchant.name}</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='flex items-start gap-2'>
          <TbMapPin className='text-muted-foreground mt-0.5 h-4 w-4 shrink-0' />
          <span className='text-sm'>{merchant.address.address}</span>
        </div>
        <div className='flex items-center gap-2'>
          <TbPhone className='text-muted-foreground h-4 w-4' />
          <span className='text-sm'>{merchant.address.phoneNumber}</span>
        </div>
        <div className='flex items-center gap-2'>
          <Badge variant='outline'>{formatEnum(MerchantCategory, merchant.category)}</Badge>
        </div>
        {Boolean(merchant.address.website) && (
          <div className='flex items-center gap-2'>
            <TbGlobe className='text-muted-foreground h-4 w-4' />
            <a
              href={merchant.address.website}
              target='_blank'
              rel='noopener noreferrer'
              className='text-primary text-sm underline-offset-4 hover:underline'>
              {merchant.address.website.replace(/^https?:\/\//u, "")}
            </a>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button
          variant='outline'
          className='w-full bg-transparent'>
          View All Receipts
        </Button>
      </CardFooter>
    </Card>
  );
}
