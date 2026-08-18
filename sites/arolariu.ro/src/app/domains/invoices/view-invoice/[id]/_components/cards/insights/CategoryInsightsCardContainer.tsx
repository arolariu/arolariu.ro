"use client";

import {useInvoiceContext} from "../../../_context/InvoiceContext";
import {CategorySuggestionCard} from "./CategorySuggestionCard";
import {DiningCard} from "./DiningCard";
import {GeneralExpenseCard} from "./GeneralExpenseCard";
import {HomeInventoryCard} from "./HomeInventoryCard";
import {NutritionCard} from "./NutritionCard";
import {VehicleCard} from "./VehicleCard";

/**
 * Renders an insight card based on the current invoice's ECOICOP root.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"`).
 *
 * **Component Logic**:
 * - Consumes `InvoiceContext` to get the current invoice classification.
 * - Uses a switch statement to determine the most relevant insight card.
 * - Fallback: Renders `GeneralExpenseCard` for unhandled categories or `CategorySuggestionCard` for undefined ones.
 *
 * **Dependencies**:
 * - Requires `InvoiceContextProvider` to be present in the parent tree.
 *
 * @returns The specific insight card component corresponding to the invoice classification.
 *
 * @example
 * ```tsx
 * <CategoryInsightsCardContainer />
 * ```
 */
export function CategoryInsightsCardContainer(): React.JSX.Element {
  const {invoice} = useInvoiceContext();
  const rootCode = invoice.classification?.hierarchy[0]?.code;

  switch (rootCode) {
    case "01":
      return <NutritionCard />;
    case "11":
      return <DiningCard />;
    case "05":
      return <HomeInventoryCard />;
    case "07":
      return <VehicleCard />;
    case undefined:
      return <CategorySuggestionCard />;
    default:
      return <GeneralExpenseCard />;
  }
}
