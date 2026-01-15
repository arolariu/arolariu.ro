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
        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <span className='text-sm font-medium'>Food Balance Score</span>
            <span className={`text-sm font-semibold ${scoreColor}`}>
              {balanceScore}/100 - {scoreLabel}
            </span>
          </div>
          <Progress
            value={balanceScore}
            className='h-2'
          />
        </div>

        {/* Basket Composition */}
        <div className='space-y-3'>
          <h4 className='text-muted-foreground text-sm font-medium tracking-wide uppercase'>Your Basket Composition</h4>
          <div className='space-y-2'>
            <div className='flex items-center gap-3'>
              <TbLeaf className='h-4 w-4 shrink-0 text-green-500' />
              <span className='w-24 shrink-0 text-sm'>Whole Foods</span>
              <div className='bg-muted h-2 flex-1 overflow-hidden rounded-full'>
                <div
                  className='h-full bg-green-500 transition-all'
                  style={{width: `${wholeFoodPct}%`}}
                />
              </div>
              <span className='text-muted-foreground w-10 text-right text-sm'>{wholeFoodPct}%</span>
            </div>
            <div className='flex items-center gap-3'>
              <TbWheat className='h-4 w-4 shrink-0 text-amber-500' />
              <span className='w-24 shrink-0 text-sm'>Processed</span>
              <div className='bg-muted h-2 flex-1 overflow-hidden rounded-full'>
                <div
                  className='h-full bg-amber-500 transition-all'
                  style={{width: `${processedPct}%`}}
                />
              </div>
              <span className='text-muted-foreground w-10 text-right text-sm'>{processedPct}%</span>
            </div>
            <div className='flex items-center gap-3'>
              <TbMilk className='h-4 w-4 shrink-0 text-blue-500' />
              <span className='w-24 shrink-0 text-sm'>Dairy/Other</span>
              <div className='bg-muted h-2 flex-1 overflow-hidden rounded-full'>
                <div
                  className='h-full bg-blue-500 transition-all'
                  style={{width: `${dairySnackPct}%`}}
                />
              </div>
              <span className='text-muted-foreground w-10 text-right text-sm'>{dairySnackPct}%</span>
            </div>
          </div>
        </div>

        {/* Food Groups Grid */}
        <div className='grid grid-cols-2 gap-3'>
          {foodGroups.map((group) => (
            <div
              key={group.name}
              className='bg-card rounded-lg border p-3 text-center'>
              <div className='mb-1 flex justify-center'>{group.icon}</div>
              <p className='text-muted-foreground text-xs'>{group.name}</p>
              <p className='text-sm font-semibold'>
                {group.items} item{group.items === 1 ? "" : "s"}
              </p>
              <p className='text-muted-foreground text-xs'>{formatCurrency(group.amount, {currencyCode: currency.code, locale})}</p>
            </div>
          ))}
        </div>

        {/* Allergens */}
        {allergens.length > 0 && (
          <div className='space-y-2'>
            <div className='flex items-center gap-2'>
              <TbAlertTriangle className='h-4 w-4 text-amber-500' />
              <h4 className='text-sm font-medium'>Allergens Detected</h4>
            </div>
            <div className='flex flex-wrap gap-2'>
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
            </div>
          </div>
        )}

        {/* Suggestion */}
        <div className='bg-muted/50 flex items-start gap-2 rounded-lg p-3'>
          <TbBulb className='mt-0.5 h-4 w-4 shrink-0 text-amber-500' />
          <p className='text-muted-foreground text-sm'>{suggestion}</p>
        </div>
      </CardContent>
    </Card>
  );
}
