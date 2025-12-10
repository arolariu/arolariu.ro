"use client";

import {InvoiceCategory} from "@/types/invoices";
import {useInvoiceContext} from "../../../_context/InvoiceContext";
import {CategorySuggestionCard} from "./CategorySuggestionCard";
import {DiningCard} from "./DiningCard";
import {GeneralExpenseCard} from "./GeneralExpenseCard";
import {HomeInventoryCard} from "./HomeInventoryCard";
import {NutritionCard} from "./NutritionCard";
import {VehicleCard} from "./VehicleCard";

/**
 * Renders a category-specific insight card based on the current invoice's category.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"`).
 *
 * **Component Logic**:
 * - Consumes `InvoiceContext` to get the current invoice category.
 * - Uses a switch statement to determine the most relevant insight card.
 * - Fallback: Renders `GeneralExpenseCard` for unhandled categories or `CategorySuggestionCard` for undefined ones.
 *
 * **Dependencies**:
 * - Requires `InvoiceContextProvider` to be present in the parent tree.
 *
 * @returns The specific insight card component corresponding to the invoice category.
 *
 * @example
 * ```tsx
 * <CategoryInsightsCardContainer />
 * ```
 */
export function CategoryInsightsCardContainer(): React.JSX.Element {
  const {
    invoice: {category},
  } = useInvoiceContext();

  switch (category) {
    case InvoiceCategory.GROCERY:
      return <NutritionCard />;
    case InvoiceCategory.FAST_FOOD:
      return <DiningCard />;
    case InvoiceCategory.HOME_CLEANING:
      return <HomeInventoryCard />;
    case InvoiceCategory.CAR_AUTO:
      return <VehicleCard />;
    case InvoiceCategory.NOT_DEFINED:
      return <CategorySuggestionCard />;
    default:
      return <GeneralExpenseCard />;
  }
}
