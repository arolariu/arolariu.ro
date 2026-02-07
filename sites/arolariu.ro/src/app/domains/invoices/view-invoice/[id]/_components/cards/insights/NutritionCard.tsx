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
import {useLocale} from "next-intl";
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
function getScoreLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Needs Work";
}

/** Get the color class for a balance score */
function getScoreColorClass(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-emerald-600";
  if (score >= 40) return "text-yellow-600";
  return "text-red-600";
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
function generateSuggestion(hasVeggies: boolean, hasFruits: boolean, processedPct: number): string {
  if (!hasVeggies && !hasFruits) {
    return "Add more fruits and vegetables to balance your basket";
  }
  if (!hasVeggies) {
    return "Consider adding vegetables for a more balanced diet";
  }
  if (!hasFruits) {
    return "Adding some fruits would improve nutritional balance";
  }
  if (processedPct > 40) {
    return "Try swapping some processed items for whole foods";
  }
  return "Great balanced shopping!";
}

export function NutritionCard(): React.JSX.Element {
  const locale = useLocale();
  const {invoice} = useInvoiceContext();
  const {items, paymentInformation} = invoice;
  const {currency} = paymentInformation;

  // Define food groups
  const foodGroups: FoodGroup[] = [
    {
      name: "Fruits",
      icon: <TbApple className='h-5 w-5 text-red-500' />,
      items: 0,
      amount: 0,
      categories: [ProductCategory.FRUITS],
    },
    {
      name: "Vegetables",
      icon: <TbLeaf className='h-5 w-5 text-green-500' />,
      items: 0,
      amount: 0,
      categories: [ProductCategory.VEGETABLES],
    },
    {
      name: "Protein",
      icon: <TbMeat className='h-5 w-5 text-amber-700' />,
      items: 0,
      amount: 0,
      categories: [ProductCategory.MEAT, ProductCategory.FISH, ProductCategory.DAIRY],
    },
    {
      name: "Grains",
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
  const hasVeggies = foodGroups.find((g) => g.name === "Vegetables")!.items > 0;
  const hasFruits = foodGroups.find((g) => g.name === "Fruits")!.items > 0;
  const hasProtein = foodGroups.find((g) => g.name === "Protein")!.items > 0;
  const balanceScore = calculateBalanceScore(hasVeggies, hasFruits, hasProtein, wholeFoodPct);
  const scoreLabel = getScoreLabel(balanceScore);
  const scoreColor = getScoreColorClass(balanceScore);

  // Collect allergens
  const allergenMap = new Map<string, number>();
  items.forEach((item) => {
    item.detectedAllergens.forEach((a) => {
      allergenMap.set(a.name, (allergenMap.get(a.name) || 0) + 1);
    });
  });
  const allergens = Array.from(allergenMap.entries());

  // Generate suggestion
  const suggestion = generateSuggestion(hasVeggies, hasFruits, processedPct);

  return (
    <Card>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center gap-2 text-lg'>
          <TbLeaf className='h-5 w-5 text-green-600' />
          Nutrition Overview
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-6'>
        {/* Food Balance Score */}
        <main className={styles["scoreSection"]}>
          <main className={styles["scoreRow"]}>
            <span className={styles["scoreLabel"]}>Food Balance Score</span>
            <span className={`${styles["scoreLabel"]} ${scoreColor}`}>
              {balanceScore}/100 - {scoreLabel}
            </span>
          </main>
          <Progress
            value={balanceScore}
            className='h-2'
          />
        </main>

        {/* Basket Composition */}
        <main className={styles["compositionSection"]}>
          <h4 className={styles["compositionTitle"]}>Your Basket Composition</h4>
          <main className={styles["compositionList"]}>
            <main className={styles["compositionRow"]}>
              <TbLeaf className='h-4 w-4 shrink-0 text-green-500' />
              <span className={styles["compositionLabel"]}>Whole Foods</span>
              <main className={styles["progressTrack"]}>
                <main
                  className={`${styles["progressBar"]} bg-green-500`}
                  style={{width: `${wholeFoodPct}%`}}
                />
              </main>
              <span className={styles["compositionPct"]}>{wholeFoodPct}%</span>
            </main>
            <main className={styles["compositionRow"]}>
              <TbWheat className='h-4 w-4 shrink-0 text-amber-500' />
              <span className={styles["compositionLabel"]}>Processed</span>
              <main className={styles["progressTrack"]}>
                <main
                  className={`${styles["progressBar"]} bg-amber-500`}
                  style={{width: `${processedPct}%`}}
                />
              </main>
              <span className={styles["compositionPct"]}>{processedPct}%</span>
            </main>
            <main className={styles["compositionRow"]}>
              <TbMilk className='h-4 w-4 shrink-0 text-blue-500' />
              <span className={styles["compositionLabel"]}>Dairy/Other</span>
              <main className={styles["progressTrack"]}>
                <main
                  className={`${styles["progressBar"]} bg-blue-500`}
                  style={{width: `${dairySnackPct}%`}}
                />
              </main>
              <span className={styles["compositionPct"]}>{dairySnackPct}%</span>
            </main>
          </main>
        </main>

        {/* Food Groups Grid */}
        <main className={styles["foodGroupsGrid"]}>
          {foodGroups.map((group) => (
            <main
              key={group.name}
              className={styles["foodGroupCard"]}>
              <main className={styles["foodGroupIconRow"]}>{group.icon}</main>
              <p className={styles["foodGroupName"]}>{group.name}</p>
              <p className={styles["foodGroupCount"]}>
                {group.items} item{group.items === 1 ? "" : "s"}
              </p>
              <p className={styles["foodGroupAmount"]}>{formatCurrency(group.amount, {currencyCode: currency.code, locale})}</p>
            </main>
          ))}
        </main>

        {/* Allergens */}
        {allergens.length > 0 && (
          <main className={styles["allergensSection"]}>
            <main className={styles["allergensHeader"]}>
              <TbAlertTriangle className='h-4 w-4 text-amber-500' />
              <h4 className={styles["allergensTitle"]}>Allergens Detected</h4>
            </main>
            <main className={styles["allergensList"]}>
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
                      <p>
                        Found in {count} item{count === 1 ? "" : "s"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
            </main>
          </main>
        )}

        {/* Suggestion */}
        <main className={styles["suggestionBox"]}>
          <TbBulb className='mt-0.5 h-4 w-4 shrink-0 text-amber-500' />
          <p className={styles["suggestionText"]}>{suggestion}</p>
        </main>
      </CardContent>
    </Card>
  );
}
