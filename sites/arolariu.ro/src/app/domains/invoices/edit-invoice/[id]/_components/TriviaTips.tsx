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
import {useTranslations} from "next-intl";
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
  const t = useTranslations("Invoices.EditInvoice.triviaTips");

  // Mock savings tips
  const savingsTips = [
    {
      id: 1,
      title: t("tips.loyaltyProgram.title"),
      description: t("tips.loyaltyProgram.description", {merchantName: merchant.name}),
      potentialSavings: invoice.paymentInformation?.totalCostAmount! * 0.05,
      difficulty: "easy",
      icon: <TbPigMoney className={styles["tipIcon"]} />,
    },
    {
      id: 2,
      title: t("tips.bulkPurchase.title"),
      description: t("tips.bulkPurchase.description"),
      potentialSavings: invoice.paymentInformation?.totalCostAmount! * 0.1,
      difficulty: "medium",
      icon: <TbPercentage className={styles["tipIcon"]} />,
    },
    {
      id: 3,
      title: t("tips.digitalCoupons.title"),
      description: t("tips.digitalCoupons.description", {merchantName: merchant.name}),
      potentialSavings: invoice.paymentInformation?.totalCostAmount! * 0.08,
      difficulty: "easy",
      icon: <TbBulb className={styles["tipIcon"]} />,
    },
  ];

  // Calculate total potential savings
  const totalPotentialSavings = savingsTips.reduce((sum, tip) => sum + tip.potentialSavings, 0);

  return (
    <Card>
      <CardHeader className={styles["cardHeader"]}>
        <CardTitle className={styles["cardTitle"]}>
          <TbSparkles className={styles["sparklesIcon"]} />
          <span>{t("title")}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className={styles["cardContent"]}>
        <motion.div
          className={styles["savingsBanner"]}
          whileHover={{scale: 1.02}}
          transition={{type: "spring", stiffness: 400, damping: 10}}>
          <div className={styles["savingsBannerInner"]}>
            <p className={styles["savingsLabel"]}>{t("banner.potentialSavingsLabel")}</p>
            <p className={styles["savingsAmount"]}>
              {formatCurrency(totalPotentialSavings, {currencyCode: invoice.paymentInformation.currency.code, locale: "en"})}
            </p>
          </div>
          <p className={styles["savingsHint"]}>{t("banner.hint", {merchantName: merchant.name})}</p>
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
                        variant={tip.difficulty === "easy" ? "default" : "secondary"}
                        className={styles["difficultyBadge"]}>
                        {tip.difficulty === "easy" ? t("difficulty.easy") : t("difficulty.medium")}
                      </Badge>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <div className={styles["tipSavings"]}>
                              <span>
                                {formatCurrency(tip.potentialSavings, {currencyCode: invoice.paymentInformation.currency.code, locale: "en"})}
                              </span>
                              <TbThumbUp className={styles["thumbIcon"]} />
                            </div>
                          }
                        />
                        <TooltipContent>
                          <p>{t("tooltips.estimatedSavings")}</p>
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
            variant='outline'>
            <span>{t("buttons.viewMoreSavingsTips")}</span>
            <TbArrowRight className={styles["arrowIcon"]} />
          </Button>
        </div>

        <div className={styles["disclaimer"]}>
          <TbAlertCircle className={styles["alertCircleIcon"]} />
          <span>{t("disclaimer")}</span>
        </div>
      </CardContent>
    </Card>
  );
}
