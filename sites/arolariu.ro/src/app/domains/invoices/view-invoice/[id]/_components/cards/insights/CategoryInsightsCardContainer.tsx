/**
 * @fileoverview Routes an invoice to its most relevant insight card.
 * @module app/domains/invoices/view-invoice/[id]/components/cards/insights/CategoryInsightsCardContainer
 */

"use client";

import {InvoiceCategory} from "@/types/invoices";
import {useInvoiceContext} from "../../../_context/InvoiceContext";
import {CategorySuggestionCard} from "./CategorySuggestionCard";
import {DiningCard} from "./DiningCard";
import {GeneralExpenseCard} from "./GeneralExpenseCard";
import {HomeInventoryCard} from "./HomeInventoryCard";
import {NutritionCard} from "./NutritionCard";
import {VehicleCard} from "./VehicleCard";

const nutrition = new Set<InvoiceCategory>([
  InvoiceCategory.Groceries,
  InvoiceCategory.FreshProduce,
  InvoiceCategory.MeatSeafood,
  InvoiceCategory.BakeryPurchases,
  InvoiceCategory.DairyEggs,
  InvoiceCategory.PantryStaples,
  InvoiceCategory.SnacksSweets,
  InvoiceCategory.NonAlcoholicDrinks,
  InvoiceCategory.Alcohol,
  InvoiceCategory.BabyFood,
]);
const dining = new Set<InvoiceCategory>([
  InvoiceCategory.RestaurantDining,
  InvoiceCategory.FastFood,
  InvoiceCategory.CafeDrinks,
  InvoiceCategory.FoodDelivery,
  InvoiceCategory.Catering,
  InvoiceCategory.WorkMeals,
  InvoiceCategory.SchoolMeals,
]);
const household = new Set<InvoiceCategory>([
  InvoiceCategory.CleaningSupplies,
  InvoiceCategory.LaundrySupplies,
  InvoiceCategory.PaperHouseholdSupplies,
  InvoiceCategory.KitchenSupplies,
  InvoiceCategory.HomeDecor,
  InvoiceCategory.Furniture,
  InvoiceCategory.HomeAppliances,
  InvoiceCategory.BeddingBath,
  InvoiceCategory.HardwareTools,
  InvoiceCategory.GardenPlants,
  InvoiceCategory.HomeMaintenance,
  InvoiceCategory.HomeRepairs,
]);
const vehicle = new Set<InvoiceCategory>([
  InvoiceCategory.VehicleFuel,
  InvoiceCategory.VehicleCharging,
  InvoiceCategory.VehicleMaintenance,
  InvoiceCategory.VehicleRepairs,
  InvoiceCategory.VehicleParts,
  InvoiceCategory.Tires,
  InvoiceCategory.CarWash,
  InvoiceCategory.Parking,
  InvoiceCategory.RoadTolls,
]);

/** Renders the insight most relevant to the receipt category. */
export function CategoryInsightsCardContainer({canEdit = false}: Readonly<{canEdit?: boolean}>): React.JSX.Element {
  const {invoice} = useInvoiceContext();
  const {category} = invoice;
  if (category === null) {
    return canEdit ? <CategorySuggestionCard editHref={`/domains/invoices/edit-invoice/${invoice.id}`} /> : <CategorySuggestionCard />;
  }
  if (nutrition.has(category)) return <NutritionCard />;
  if (dining.has(category)) return <DiningCard />;
  if (household.has(category)) return <HomeInventoryCard />;
  if (vehicle.has(category)) return <VehicleCard />;
  return <GeneralExpenseCard />;
}
