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
import styles from "./TriviaTips.module.scss";

type Props = {
  merchant: Merchant;
  invoice: Invoice;
};

/**
 * Displays personalized savings tips based on merchant and invoice data.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` directive).
 *
 * **Why Client Component?**
 * - Uses Framer Motion for hover interactions and staggered animations
 * - Displays dynamic savings calculations based on invoice totals
 *
 * **Feature Overview**:
 * - **Potential Savings Summary**: Aggregates estimated savings from all tips
 * - **Savings Tips**: Actionable recommendations with difficulty badges (EASY/MEDIUM)
 * - **Merchant-Specific**: Tips reference the specific merchant name for personalization
 *
 * **Savings Calculations**: Currently uses mock data with percentage-based estimates
 * (5%, 10%, 8% of total) derived from `invoice.paymentInformation.totalCostAmount`.
 * Future implementation should fetch real savings data from backend analytics.
 *
 * **Animation**: Each tip animates in with staggered delay and scales on hover
 * for tactile feedback.
 *
 * **Domain Context**: Part of the invoices bounded context analytics features.
 * Provides value-add insights to encourage user engagement with invoice tracking.
 *
 * @param props - Component properties with merchant and invoice for context
 * @returns Client-rendered card with savings tips and potential savings summary
 *
 * @example
 * ```tsx
 * <TriviaTipsCard merchant={merchant} invoice={invoice} />
 * // Displays: Potential Savings: $X.XX, followed by tip cards
 * ```
 *
 * @see {@link Merchant} - Merchant type for personalization
 * @see {@link Invoice} - Invoice type for savings calculations
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
          <TbSparkles className='text-primary mr-2 h-5 w-5' />
          <span>Savings Tips</span>
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <motion.div
          className={styles["savingsBanner"]}
          whileHover={{scale: 1.02}}
          transition={{type: "spring", stiffness: 400, damping: 10}}>
          <div className={styles["savingsBannerInner"]}>
            <p className={styles["savingsLabel"]}>Potential Savings</p>
            <p className={styles["savingsAmount"]}>
              {formatCurrency(totalPotentialSavings, {currencyCode: invoice.paymentInformation.currency.code, locale: "en"})}
            </p>
          </div>
          <p className={styles["savingsHint"]}>Apply these tips to save on your next visit to {merchant.name}</p>
        </motion.div>

        <Separator />

        <div className={styles["tipsList"]}>
          {savingsTips.map((tip, index) => (
            <motion.div
              key={tip.id}
              className={styles["tipCard"]}
              initial={{opacity: 0, y: 10}}
              animate={{opacity: 1, y: 0}}
              transition={{delay: index * 0.1}}
              whileHover={{scale: 1.02, backgroundColor: "hsl(var(--muted) / 0.5)"}}>
              <div className={styles["tipInner"]}>
                <div className={styles["tipIconWrapper"]}>{tip.icon}</div>
                <div className={styles["tipContent"]}>
                  <div className={styles["tipHeader"]}>
                    <div>
                      <h3 className={styles["tipTitle"]}>{tip.title}</h3>
                      <Badge
                        variant={tip.difficulty === "EASY" ? "default" : "secondary"}
                        className='mt-1 text-xs'>
                        {tip.difficulty}
                      </Badge>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className={styles["tipSavings"]}>
                            <span>
                              {formatCurrency(tip.potentialSavings, {currencyCode: invoice.paymentInformation.currency.code, locale: "en"})}
                            </span>
                            <TbThumbUp className='ml-1 h-3.5 w-3.5' />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Estimated savings with this tip</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <p className={styles["tipDescription"]}>{tip.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className={styles["moreButton"]}>
          <Button
            variant='outline'
            className='group w-full'>
            <span>View More Savings Tips</span>
            <TbArrowRight className='ml-2 h-4 w-4 transition-transform group-hover:translate-x-1' />
          </Button>
        </div>

        <div className={styles["disclaimer"]}>
          <TbAlertCircle className='h-3.5 w-3.5' />
          <span>Savings are estimates based on average prices and promotions</span>
        </div>
      </CardContent>
    </Card>
  );
}
