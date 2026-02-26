"use client";

import {formatCurrency} from "@/lib/utils.generic";
import {ProductCategory} from "@/types/invoices";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Progress,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@arolariu/components";
import {useLocale, useTranslations} from "next-intl";
import {TbAlertTriangle, TbApple, TbBulb, TbLeaf, TbMeat, TbMilk, TbWheat} from "react-icons/tb";
import {useInvoiceContext} from "../../../_context/InvoiceContext";
import styles from "./NutritionCard.module.scss";

type FoodGroup = {
  name: string;
  icon: React.ReactNode;
  items: number;
  amount: number;
  categories: ProductCategory[];
};

/** Get the label for a balance score */
function getScoreLabel(score: number, t: ReturnType<typeof useTranslations>): string {
  if (score >= 80) return t("score.excellent");
  if (score >= 60) return t("score.good");
  if (score >= 40) return t("score.fair");
  return t("score.needsWork");
}

/** Get the color class for a balance score */
function getScoreColorClass(score: number, moduleStyles: Record<string, string>): string {
  if (score >= 80) return moduleStyles["scoreGreen"] ?? "";
  if (score >= 60) return moduleStyles["scoreEmerald"] ?? "";
  if (score >= 40) return moduleStyles["scoreYellow"] ?? "";
  return moduleStyles["scoreRed"] ?? "";
}

/** Calculate the balance score based on food group presence */
function calculateBalanceScore(hasVeggies: boolean, hasFruits: boolean, hasProtein: boolean, wholeFoodPct: number): number {
  let score = 50;
  if (hasVeggies) score += 15;
  if (hasFruits) score += 15;
  if (hasProtein) score += 10;
  if (wholeFoodPct >= 50) score += 10;
  return Math.min(100, score);
}

/** Generate a nutrition suggestion based on basket composition */
function generateSuggestion(hasVeggies: boolean, hasFruits: boolean, processedPct: number, t: ReturnType<typeof useTranslations>): string {
  if (!hasVeggies && !hasFruits) {
    return t("suggestions.addFruitsAndVegetables");
  }
  if (!hasVeggies) {
    return t("suggestions.addVegetables");
  }
  if (!hasFruits) {
    return t("suggestions.addFruits");
  }
  if (processedPct > 40) {
    return t("suggestions.swapProcessed");
  }
  return t("suggestions.greatBalance");
}

export function NutritionCard(): React.JSX.Element {
  const locale = useLocale();
  const t = useTranslations("Invoices.ViewInvoice.nutritionCard");
  const {invoice} = useInvoiceContext();
  const {items, paymentInformation} = invoice;
  const {currency} = paymentInformation;

  // Define food groups
  const foodGroups: FoodGroup[] = [
    {
      name: t("foodGroups.fruits"),
      icon: <TbApple className='h-5 w-5 text-red-500' />,
      items: 0,
      amount: 0,
      categories: [ProductCategory.FRUITS],
    },
    {
      name: t("foodGroups.vegetables"),
      icon: <TbLeaf className='h-5 w-5 text-green-500' />,
      items: 0,
      amount: 0,
      categories: [ProductCategory.VEGETABLES],
    },
    {
      name: t("foodGroups.protein"),
      icon: <TbMeat className='h-5 w-5 text-amber-700' />,
      items: 0,
      amount: 0,
      categories: [ProductCategory.MEAT, ProductCategory.FISH, ProductCategory.DAIRY],
    },
    {
      name: t("foodGroups.grains"),
      icon: <TbWheat className='h-5 w-5 text-amber-500' />,
      items: 0,
      amount: 0,
      categories: [ProductCategory.BAKED_GOODS],
    },
  ];

  // Calculate food groups
  items.forEach((item) => {
    foodGroups.forEach((group) => {
      if (group.categories.includes(item.category)) {
        group.items += 1;
        group.amount += item.totalPrice;
      }
    });
  });

  // Calculate basket composition
  const wholeFood = items.filter((i) =>
    [ProductCategory.FRUITS, ProductCategory.VEGETABLES, ProductCategory.MEAT, ProductCategory.FISH].includes(i.category),
  );
  const processed = items.filter((i) => [ProductCategory.BEVERAGES, ProductCategory.BAKED_GOODS].includes(i.category));
  const cleaningOther = items.filter((i) =>
    [ProductCategory.CLEANING_SUPPLIES, ProductCategory.PERSONAL_CARE, ProductCategory.OTHER].includes(i.category),
  );

  const totalFoodItems = items.length - cleaningOther.length;
  const wholeFoodPct = totalFoodItems > 0 ? Math.round((wholeFood.length / totalFoodItems) * 100) : 0;
  const processedPct = totalFoodItems > 0 ? Math.round((processed.length / totalFoodItems) * 100) : 0;
  const dairySnackPct = totalFoodItems > 0 ? 100 - wholeFoodPct - processedPct : 0;

  // Food balance score (simple heuristic)
  const hasVeggies = foodGroups.find((g) => g.name === t("foodGroups.vegetables"))!.items > 0;
  const hasFruits = foodGroups.find((g) => g.name === t("foodGroups.fruits"))!.items > 0;
  const hasProtein = foodGroups.find((g) => g.name === t("foodGroups.protein"))!.items > 0;
  const balanceScore = calculateBalanceScore(hasVeggies, hasFruits, hasProtein, wholeFoodPct);
  const scoreLabel = getScoreLabel(balanceScore, t);
  const scoreColor = getScoreColorClass(balanceScore, styles);

  // Collect allergens
  const allergenMap = new Map<string, number>();
  items.forEach((item) => {
    item.detectedAllergens.forEach((a) => {
      allergenMap.set(a.name, (allergenMap.get(a.name) || 0) + 1);
    });
  });
  const allergens = Array.from(allergenMap.entries());

  // Generate suggestion
  const suggestion = generateSuggestion(hasVeggies, hasFruits, processedPct, t);

  return (
    <Card>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center gap-2 text-lg'>
          <TbLeaf className='h-5 w-5 text-green-600' />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-6'>
        {/* Food Balance Score */}
        <div className={styles["scoreSection"]}>
          <div className={styles["scoreRow"]}>
            <span className={styles["scoreLabel"]}>{t("score.title")}</span>
            <span className={`${styles["scoreLabel"]} ${scoreColor}`}>
              {balanceScore}/100 - {scoreLabel}
            </span>
          </div>
          <Progress
            value={balanceScore}
            className='h-2'
          />
        </div>

        {/* Basket Composition */}
        <div className={styles["compositionSection"]}>
          <h4 className={styles["compositionTitle"]}>{t("composition.title")}</h4>
          <div className={styles["compositionList"]}>
            <div className={styles["compositionRow"]}>
              <TbLeaf className='h-4 w-4 shrink-0 text-green-500' />
              <span className={styles["compositionLabel"]}>{t("composition.wholeFoods")}</span>
              <div className={styles["progressTrack"]}>
                <div
                  className={`${styles["progressBar"]} ${styles["progressGreen"]}`}
                  style={{width: `${wholeFoodPct}%`}}
                />
              </div>
              <span className={styles["compositionPct"]}>{wholeFoodPct}%</span>
            </div>
            <div className={styles["compositionRow"]}>
              <TbWheat className='h-4 w-4 shrink-0 text-amber-500' />
              <span className={styles["compositionLabel"]}>{t("composition.processed")}</span>
              <div className={styles["progressTrack"]}>
                <div
                  className={`${styles["progressBar"]} ${styles["progressAmber"]}`}
                  style={{width: `${processedPct}%`}}
                />
              </div>
              <span className={styles["compositionPct"]}>{processedPct}%</span>
            </div>
            <div className={styles["compositionRow"]}>
              <TbMilk className='h-4 w-4 shrink-0 text-blue-500' />
              <span className={styles["compositionLabel"]}>{t("composition.dairyOther")}</span>
              <div className={styles["progressTrack"]}>
                <div
                  className={`${styles["progressBar"]} ${styles["progressBlue"]}`}
                  style={{width: `${dairySnackPct}%`}}
                />
              </div>
              <span className={styles["compositionPct"]}>{dairySnackPct}%</span>
            </div>
          </div>
        </div>

        {/* Food Groups Grid */}
        <div className={styles["foodGroupsGrid"]}>
          {foodGroups.map((group) => (
            <div
              key={group.name}
              className={styles["foodGroupCard"]}>
              <div className={styles["foodGroupIconRow"]}>{group.icon}</div>
              <p className={styles["foodGroupName"]}>{group.name}</p>
              <p className={styles["foodGroupCount"]}>{t("foodGroups.itemsCount", {count: String(group.items)})}</p>
              <p className={styles["foodGroupAmount"]}>{formatCurrency(group.amount, {currencyCode: currency.code, locale})}</p>
            </div>
          ))}
        </div>

        {/* Allergens */}
        {allergens.length > 0 && (
          <div className={styles["allergensSection"]}>
            <div className={styles["allergensHeader"]}>
              <TbAlertTriangle className='h-4 w-4 text-amber-500' />
              <h4 className={styles["allergensTitle"]}>{t("allergens.title")}</h4>
            </div>
            <div className={styles["allergensList"]}>
              <TooltipProvider>
                {allergens.map(([name, count]) => (
                  <Tooltip key={name}>
                    <TooltipTrigger asChild>
                      <Badge
                        variant='outline'
                        className='cursor-help'>
                        {name === "Lactose" && <TbMilk className='mr-1 h-3 w-3' />}
                        {name === "Gluten" && <TbWheat className='mr-1 h-3 w-3' />}
                        {name} ({count})
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t("allergens.foundInItems", {count: String(count)})}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
            </div>
          </div>
        )}

        {/* Suggestion */}
        <div className={styles["suggestionBox"]}>
          <TbBulb className='mt-0.5 h-4 w-4 shrink-0 text-amber-500' />
          <p className={styles["suggestionText"]}>{suggestion}</p>
        </div>
      </CardContent>
    </Card>
  );
}
