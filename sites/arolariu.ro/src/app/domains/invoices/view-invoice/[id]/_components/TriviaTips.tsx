/** @format */

"use client";

import {formatCurrency} from "@/lib/utils.generic";
import {Invoice, Merchant} from "@/types/invoices";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@arolariu/components";
import {motion} from "motion/react";
import {TbAlertCircle, TbArrowRight, TbBulb, TbPercentage, TbPigMoney, TbSparkles, TbThumbUp} from "react-icons/tb";

type Props = {
  merchant: Merchant;
  invoice: Invoice;
};

/**
 * The TriviaTipsCard component displays savings tips for a specific merchant.
 * It includes potential savings, difficulty level, and a button to view more tips.
 * @returns The TriviaTipsCard component, CSR'ed.
 */
export default function TriviaTipsCard({merchant, invoice}: Readonly<Props>) {
  // Mock savings tips
  const savingsTips = [
    {
      id: 1,
      title: "Join Loyalty Program",
      description: `Sign up for ${merchant.name}'s loyalty program to earn points on every purchase.`,
      potentialSavings: invoice.paymentInformation?.totalCostAmount! * 0.05,
      difficulty: "EASY",
      icon: <TbPigMoney className='h-5 w-5' />,
    },
    {
      id: 2,
      title: "Buy in Bulk",
      description: "Purchase non-perishable items in bulk to save on per-unit costs.",
      potentialSavings: invoice.paymentInformation?.totalCostAmount! * 0.1,
      difficulty: "MEDIUM",
      icon: <TbPercentage className='h-5 w-5' />,
    },
    {
      id: 3,
      title: "Use Digital Coupons",
      description: `Check ${merchant.name}'s app for digital coupons before shopping.`,
      potentialSavings: invoice.paymentInformation?.totalCostAmount! * 0.08,
      difficulty: "EASY",
      icon: <TbBulb className='h-5 w-5' />,
    },
  ];

  // Calculate total potential savings
  const totalPotentialSavings = savingsTips.reduce((sum, tip) => sum + tip.potentialSavings, 0);

  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='flex items-center text-lg'>
          <TbSparkles className='mr-2 h-5 w-5 text-primary' />
          <span>Savings Tips</span>
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <motion.div
          className='rounded-md border border-primary/20 bg-primary/10 p-3'
          whileHover={{scale: 1.02}}
          transition={{type: "spring", stiffness: 400, damping: 10}}>
          <div className='flex items-center justify-between'>
            <p className='text-sm font-medium'>Potential Savings</p>
            <p className='text-lg font-bold'>{formatCurrency(totalPotentialSavings)}</p>
          </div>
          <p className='mt-1 text-xs text-muted-foreground'>Apply these tips to save on your next visit to {merchant.name}</p>
        </motion.div>

        <Separator />

        <div className='space-y-3'>
          {savingsTips.map((tip, index) => (
            <motion.div
              key={tip.id}
              className='group rounded-md border p-3 hover:border-primary/50 hover:bg-muted/50'
              initial={{opacity: 0, y: 10}}
              animate={{opacity: 1, y: 0}}
              transition={{delay: index * 0.1}}
              whileHover={{scale: 1.02, backgroundColor: "hsl(var(--muted) / 0.5)"}}>
              <div className='flex items-start gap-3'>
                <div className='mt-0.5 rounded-md bg-primary/10 p-1.5 text-primary'>{tip.icon}</div>
                <div className='flex-1'>
                  <div className='flex items-start justify-between'>
                    <div>
                      <h3 className='text-sm font-medium'>{tip.title}</h3>
                      <Badge
                        variant={tip.difficulty === "EASY" ? "default" : "secondary"}
                        className='mt-1 text-xs'>
                        {tip.difficulty}
                      </Badge>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className='flex items-center text-sm font-medium text-success'>
                            <span>{formatCurrency(tip.potentialSavings)}</span>
                            <TbThumbUp className='ml-1 h-3.5 w-3.5' />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Estimated savings with this tip</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <p className='mt-1 text-sm text-muted-foreground'>{tip.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className='pt-2'>
          <Button
            variant='outline'
            className='group w-full'>
            <span>View More Savings Tips</span>
            <TbArrowRight className='ml-2 h-4 w-4 transition-transform group-hover:translate-x-1' />
          </Button>
        </div>

        <div className='flex items-center gap-2 text-xs text-muted-foreground'>
          <TbAlertCircle className='h-3.5 w-3.5' />
          <span>Savings are estimates based on average prices and promotions</span>
        </div>
      </CardContent>
    </Card>
  );
}
