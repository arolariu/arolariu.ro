/**
 * @fileoverview Routes an invoice to its most relevant insight card.
 * @module app/domains/invoices/view-invoice/[id]/components/cards/insights/CategoryInsightsCardContainer
 */

"use client";

import {ClassificationSystem, type StandardClassification} from "@/types/invoices";
import {useInvoiceContext} from "../../../_context/InvoiceContext";
import {CategorySuggestionCard} from "./CategorySuggestionCard";
import {DiningCard} from "./DiningCard";
import {GeneralExpenseCard} from "./GeneralExpenseCard";
import {HomeInventoryCard} from "./HomeInventoryCard";
import {NutritionCard} from "./NutritionCard";
import {VehicleCard} from "./VehicleCard";

/**
 * ECOICOP v2 division codes that map onto a dedicated insight card.
 *
 * @remarks
 * These are direct taxonomy semantics, not inferred heuristics: division `01` is
 * literally "Food and non-alcoholic beverages", `11` is "Restaurants and accommodation
 * services", and so on. Nothing here parses labels or guesses from keywords.
 *
 * Divisions without a dedicated card fall through to {@link GeneralExpenseCard}.
 */
const ECOICOP_DIVISION = {
  /** Food and non-alcoholic beverages. */
  Food: "01",
  /** Furnishings, household equipment and routine household maintenance. */
  Household: "05",
  /** Transport. */
  Transport: "07",
  /** Restaurants and accommodation services. */
  Restaurants: "11",
} as const;

/**
 * Extracts the ECOICOP division code from an invoice classification.
 *
 * @remarks
 * A persisted hierarchy is ordered root to leaf, so the first node is the division.
 * Returns null for an unclassified invoice or a classification from another system.
 *
 * @param classification - The invoice classification, or null when unclassified.
 * @returns The two-character division code, or null when none applies.
 */
function resolveEcoicopDivision(classification: StandardClassification | null): string | null {
  if (classification === null || classification.system !== ClassificationSystem.EcoicopV2) {
    return null;
  }

  return classification.hierarchy[0]?.code ?? null;
}

/**
 * Renders the insight card that matches the invoice's taxonomy classification.
 *
 * @remarks
 * An unclassified invoice shows {@link CategorySuggestionCard}, which prompts the user to
 * classify it, rather than a generic card that implies the invoice was understood.
 *
 * @returns The insight card component.
 */
export function CategoryInsightsCardContainer(): React.JSX.Element {
  const {invoice} = useInvoiceContext();
  const division = resolveEcoicopDivision(invoice.classification);

  if (division === null) {
    return <CategorySuggestionCard />;
  }

  switch (division) {
    case ECOICOP_DIVISION.Food: {
      return <NutritionCard />;
    }
    case ECOICOP_DIVISION.Restaurants: {
      return <DiningCard />;
    }
    case ECOICOP_DIVISION.Household: {
      return <HomeInventoryCard />;
    }
    case ECOICOP_DIVISION.Transport: {
      return <VehicleCard />;
    }
    default: {
      return <GeneralExpenseCard />;
    }
  }
}
