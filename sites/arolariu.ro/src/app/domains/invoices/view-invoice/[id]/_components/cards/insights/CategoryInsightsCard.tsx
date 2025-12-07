"use client";

import {InvoiceCategory} from "@/types/invoices";
import {useInvoiceContext} from "../../../_context/InvoiceContext";
import {CategorySuggestionCard} from "./CategorySuggestionCard";
import {DiningCard} from "./DiningCard";
import {GeneralExpenseCard} from "./GeneralExpenseCard";
import {HomeInventoryCard} from "./HomeInventoryCard";
import {NutritionCard} from "./NutritionCard";
import {VehicleCard} from "./VehicleCard";

export function CategoryInsightsCard(): React.JSX.Element {
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
