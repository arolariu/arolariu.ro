/** @format */

"use client";

import type {Currency} from "@/types/DDD";
import {InvoiceCategory, type Invoice} from "@/types/invoices";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@arolariu/components";
import {motion} from "framer-motion";
import {
  Calendar,
  DollarSign,
  Edit,
  Eye,
  Moon,
  MoreHorizontal,
  Receipt,
  Share2,
  ShoppingBag,
  Sun,
  Trash2,
} from "lucide-react";
import {useState} from "react";

type Props = {
  invoice: Invoice;
  onShare?: () => void;
  timeOfDay?: "day" | "night";
  currency?: Currency;
};

const getCategoryIcon = (invoice: Invoice) => {
  switch (invoice.category) {
    case InvoiceCategory.GROCERY:
      return <ShoppingBag className='h-16 w-16 text-green-500 opacity-20' />;
    case InvoiceCategory.FAST_FOOD:
      return <Receipt className='h-16 w-16 text-orange-500 opacity-20' />;
    case InvoiceCategory.HOME_CLEANING:
      return <DollarSign className='h-16 w-16 text-blue-500 opacity-20' />;
    case InvoiceCategory.CAR_AUTO:
      return <Eye className='h-16 w-16 text-purple-500 opacity-20' />;
    case InvoiceCategory.OTHER:
      return <Calendar className='h-16 w-16 text-yellow-500 opacity-20' />;
    case InvoiceCategory.NOT_DEFINED:
    default:
      return <Receipt className='h-16 w-16 text-gray-500 opacity-20' />;
  }
};

export function InvoiceCard({invoice, onShare, timeOfDay, currency}: Readonly<Props>) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      whileHover={{y: -5}}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}>
      <Card className='overflow-hidden'>
        <div className='relative'>
          {invoice.photoLocation ? (
            <div className='h-40 overflow-hidden'>
              <img
                src={invoice.photoLocation || "/placeholder.svg"}
                alt={invoice.name}
                className='h-full w-full object-cover transition-transform duration-500'
                style={{
                  transform: isHovered ? "scale(1.05)" : "scale(1)",
                }}
              />
            </div>
          ) : (
            <div className='bg-muted flex h-40 items-center justify-center'>{getCategoryIcon(invoice)}</div>
          )}
          <div className='absolute right-2 top-2 z-0 flex gap-2'>
            <Badge
              className='capitalize'
              variant='secondary'>
              {invoice.category}
            </Badge>
            {timeOfDay === "day" ? (
              <Badge
                variant='outline'
                className='bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'>
                <Sun className='mr-1 h-3 w-3' />
                Day
              </Badge>
            ) : (
              <Badge
                variant='outline'
                className='bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'>
                <Moon className='mr-1 h-3 w-3' />
                Night
              </Badge>
            )}
            <Badge
              variant='outline'
              className='bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'>
              Paid
            </Badge>
          </div>
        </div>
        <CardHeader className='pb-2'>
          <div className='flex items-start justify-between'>
            <CardTitle className='text-lg'>{invoice.name}</CardTitle>
            <div className='absolute right-2 top-2 z-10 flex gap-1'>
              <Button
                variant='ghost'
                size='icon'
                className='bg-background/80 h-8 w-8 backdrop-blur-sm'
                onClick={() => {
                  // View action
                }}>
                <Eye className='h-4 w-4' />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='bg-background/80 h-8 w-8 backdrop-blur-sm'>
                    <MoreHorizontal className='h-4 w-4' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Eye className='mr-2 h-4 w-4' />
                    View
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Edit className='mr-2 h-4 w-4' />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onShare}>
                    <Share2 className='mr-2 h-4 w-4' />
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className='text-destructive'>
                    <Trash2 className='mr-2 h-4 w-4' />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <CardDescription>{invoice.description}</CardDescription>
        </CardHeader>
        <CardContent className='pb-2'>
          <div className='flex items-center justify-between'>
            <div className='text-muted-foreground flex items-center gap-1 text-sm'>
              <Calendar className='h-3.5 w-3.5' />
              <span>{new Date(invoice.paymentInformation?.transactionDate ?? 0).toISOString()}</span>
            </div>
            <div className='text-lg font-medium'>
              {/* TODO: format currency */}
              {currency?.symbol} {invoice.paymentInformation?.totalCostAmount.toFixed(2)}
            </div>
          </div>
        </CardContent>
        <CardFooter className='flex justify-between pt-2'>
          <div className='text-muted-foreground text-sm'>{invoice.items?.length || 0} items</div>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
