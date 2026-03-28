"use client";

import {formatCurrency} from "@/lib/utils.generic";
import {Invoice, InvoiceCategory, Merchant} from "@/types/invoices";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Progress,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useLocalStorage,
} from "@arolariu/components";
import {motion} from "motion/react";
import {useTranslations} from "next-intl";
import {useMemo} from "react";
import {TbAlertCircle, TbArrowRight, TbBulb, TbCheck, TbPercentage, TbPigMoney, TbSparkles, TbThumbUp, TbX} from "react-icons/tb";
import styles from "./TriviaTips.module.scss";

type Props = {
  merchant: Merchant;
  invoice: Invoice;
};

/**
 * Empty GUID constant representing an unset reference.
 */
const EMPTY_GUID = "00000000-0000-0000-0000-000000000000";

/**
 * Represents a context-aware tip suggestion.
 */
type ContextTipMessageKey = "contextTips.noItems" | "contextTips.noDescription" | "contextTips.noCategory" | "contextTips.noRecipes";
type ContextTipActionKey = "contextActions.analyze" | "contextActions.addDescription" | "contextActions.setCategory";

type ContextTip = {
  /** Unique identifier for the tip */
  readonly id: string;
  /** i18n key for the tip message */
  readonly messageKey: ContextTipMessageKey;
  /** i18n key for the action button */
  readonly actionKey: ContextTipActionKey;
  /** Action handler function */
  readonly action: () => void;
  /** Icon component */
  readonly icon: React.JSX.Element;
};

/**
 * Displays personalized savings tips and context-aware invoice completion suggestions.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` directive).
 *
 * **Why Client Component?**
 * - Uses Framer Motion for hover interactions and staggered animations
 * - Displays dynamic savings calculations based on invoice totals
 * - Manages dismissible tips state with localStorage
 * - Computes completeness score based on invoice data
 *
 * **Feature Overview**:
 * - **Completeness Progress**: Shows invoice completion percentage with progress bar
 * - **Context-Aware Tips**: Dynamic suggestions based on missing invoice data
 * - **Dismissible Tips**: Each context tip can be dismissed and persisted to localStorage
 * - **Savings Tips**: Actionable recommendations with difficulty badges (EASY/MEDIUM)
 * - **Merchant-Specific**: Tips reference the specific merchant name for personalization
 *
 * **Completeness Scoring**: Same as InvoiceHealthScore (name, items, merchant, payment, category, description, date, recipes)
 * - Has name: 10 points
 * - Has merchant: 15 points
 * - Has items: 20 points
 * - Has payment info: 15 points
 * - Has transaction date: 10 points
 * - Has category: 10 points
 * - Has description: 10 points
 * - Has recipes: 10 points
 * Total: 100 points
 *
 * **Context-Aware Tips**:
 * - No items → "Run AI analysis to extract items"
 * - No description → "Add a description"
 * - No category / Default category → "Set a category"
 * - No recipes → "AI can suggest recipes"
 *
 * **Savings Calculations**: Currently uses mock data with percentage-based estimates
 * (5%, 10%, 8% of total) derived from `invoice.paymentInformation.totalCostAmount`.
 * Future implementation should fetch real savings data from backend analytics.
 *
 * **Animation**: Each tip animates in with staggered delay and scales on hover
 * for tactile feedback. Dismissed tips animate out smoothly.
 *
 * **Domain Context**: Part of the invoices bounded context analytics features.
 * Provides value-add insights to encourage user engagement with invoice tracking.
 *
 * @param props - Component properties with merchant and invoice for context
 * @returns Client-rendered card with completeness progress, context tips, and savings tips
 *
 * @example
 * ```tsx
 * <TriviaTipsCard merchant={merchant} invoice={invoice} />
 * // Displays: Completeness progress → Context tips → Savings tips
 * ```
 *
 * @see {@link Merchant} - Merchant type for personalization
 * @see {@link Invoice} - Invoice type for completeness and savings calculations
 * @see {@link InvoiceHealthScore} - Reference implementation for scoring logic
 */
export default function TriviaTipsCard({merchant, invoice}: Readonly<Props>) {
  const t = useTranslations("Invoices.EditInvoice.triviaTips");

  // State for dismissed tips (persisted to localStorage)
  const [dismissedTips, setDismissedTips] = useLocalStorage<string[]>("invoice-dismissed-tips", []);

  /**
   * Compute invoice completeness score based on InvoiceHealthScore logic.
   *
   * @remarks
   * Memoized to prevent recalculation on every render.
   * Uses same scoring as InvoiceHealthScore component.
   */
  const {completenessScore, maxScore, percentage} = useMemo(() => {
    let score = 0;
    const max = 100;

    // Name (10 points)
    if (invoice.name.length > 0) score += 10;

    // Merchant (15 points)
    if (invoice.merchantReference !== EMPTY_GUID && invoice.merchantReference.length > 0) score += 15;

    // Items (20 points)
    if (invoice.items.length > 0) score += 20;

    // Payment info (15 points)
    if (invoice.paymentInformation.totalCostAmount > 0) score += 15;

    // Transaction date (10 points)
    if (Boolean(invoice.paymentInformation.transactionDate) && new Date(invoice.paymentInformation.transactionDate).getTime() > 0) {
      score += 10;
    }

    // Category (10 points)
    if (invoice.category !== InvoiceCategory.NOT_DEFINED) score += 10;

    // Description (10 points)
    if (invoice.description.length > 0) score += 10;

    // Recipes (10 points)
    if (invoice.possibleRecipes.length > 0) score += 10;

    const percent = Math.round((score / max) * 100);

    return {
      completenessScore: score,
      maxScore: max,
      percentage: percent,
    };
  }, [invoice]);

  /**
   * Compute context-aware tips based on missing invoice data.
   *
   * @remarks
   * Filters out dismissed tips and prioritizes critical missing data.
   */
  const contextTips = useMemo((): ContextTip[] => {
    const tips: ContextTip[] = [];

    // No items → Run AI analysis
    if (invoice.items.length === 0 && !dismissedTips.includes("noItems")) {
      tips.push({
        id: "noItems",
        messageKey: "contextTips.noItems",
        actionKey: "contextActions.analyze",
        action: () => {
          // TODO: Open AnalyzeDialog when connected to island
          console.log("Open AnalyzeDialog");
        },
        icon: <TbSparkles className={styles["contextIcon"]} />,
      });
    }

    // No description → Add description
    if (invoice.description.length === 0 && !dismissedTips.includes("noDescription")) {
      tips.push({
        id: "noDescription",
        messageKey: "contextTips.noDescription",
        actionKey: "contextActions.addDescription",
        action: () => {
          // Focus description field
          const descriptionInput = document.querySelector<HTMLTextAreaElement>('textarea[name="description"]');
          descriptionInput?.focus();
          descriptionInput?.scrollIntoView({behavior: "smooth", block: "center"});
        },
        icon: <TbBulb className={styles["contextIcon"]} />,
      });
    }

    // No category or default category → Set category
    if (invoice.category === InvoiceCategory.NOT_DEFINED && !dismissedTips.includes("noCategory")) {
      tips.push({
        id: "noCategory",
        messageKey: "contextTips.noCategory",
        actionKey: "contextActions.setCategory",
        action: () => {
          // Focus category select
          const categorySelect = document.querySelector<HTMLButtonElement>('button[role="combobox"]');
          categorySelect?.focus();
          categorySelect?.scrollIntoView({behavior: "smooth", block: "center"});
        },
        icon: <TbBulb className={styles["contextIcon"]} />,
      });
    }

    // No recipes → AI can suggest recipes
    if (invoice.possibleRecipes.length === 0 && invoice.items.length > 0 && !dismissedTips.includes("noRecipes")) {
      tips.push({
        id: "noRecipes",
        messageKey: "contextTips.noRecipes",
        actionKey: "contextActions.analyze",
        action: () => {
          // TODO: Open AnalyzeDialog when connected to island
          console.log("Open AnalyzeDialog");
        },
        icon: <TbSparkles className={styles["contextIcon"]} />,
      });
    }

    return tips;
  }, [invoice, dismissedTips]);

  /**
   * Dismiss a context tip and persist to localStorage.
   */
  const dismissTip = (tipId: string): void => {
    setDismissedTips((prev) => [...prev, tipId]);
  };

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
        {/* Completeness Progress Bar */}
        <div className={styles["completenessSection"]}>
          <div className={styles["completenessHeader"]}>
            <p className={styles["completenessLabel"]}>{t("completeness", {percentage: String(percentage)})}</p>
            <p className={styles["completenessScore"]}>
              {completenessScore} / {maxScore}
            </p>
          </div>
          <Progress
            value={percentage}
            className={styles["completenessProgress"]}
          />
          {percentage === 100 ? (
            <div className={styles["completeLabel"]}>
              <TbCheck className={styles["completeIcon"]} />
              <span>{t("completeLabel")}</span>
            </div>
          ) : null}
        </div>

        {/* Context-Aware Tips */}
        {contextTips.length > 0 ? (
          <>
            <Separator />
            <div className={styles["contextTipsList"]}>
              {contextTips.map((tip, index) => (
                <motion.div
                  key={tip.id}
                  className={styles["contextTipCard"]}
                  initial={{opacity: 0, x: -10}}
                  animate={{opacity: 1, x: 0}}
                  exit={{opacity: 0, x: 10}}
                  transition={{delay: index * 0.1}}>
                  <div className={styles["contextTipIcon"]}>{tip.icon}</div>
                  <div className={styles["contextTipContent"]}>
                    <p className={styles["contextTipMessage"]}>{t(tip.messageKey)}</p>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={tip.action}
                      className={styles["contextTipAction"]}>
                      {t(tip.actionKey)}
                    </Button>
                  </div>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => dismissTip(tip.id)}
                    className={styles["dismissButton"]}>
                    <TbX className={styles["dismissIcon"]} />
                  </Button>
                </motion.div>
              ))}
            </div>
          </>
        ) : null}

        <Separator />

        {/* Savings Banner */}
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

        {/* Savings Tips */}
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
                                {formatCurrency(tip.potentialSavings, {
                                  currencyCode: invoice.paymentInformation.currency.code,
                                  locale: "en",
                                })}
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
            variant='outline'
            className={styles["moreButton"]}>
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
