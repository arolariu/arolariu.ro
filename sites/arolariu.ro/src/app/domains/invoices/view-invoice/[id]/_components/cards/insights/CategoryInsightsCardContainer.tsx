"use client";

import {useInvoiceContext} from "../../../_context/InvoiceContext";
import {GeneralExpenseCard} from "./GeneralExpenseCard";

/**
 * Renders a classification-appropriate insight card based on the current invoice.
 *
 * @remarks
 * Shows `GeneralExpenseCard` by default; specific insight cards can be
 * unlocked via taxonomy classification in a future iteration.
 *
 * @returns The insight card component.
 */
export function CategoryInsightsCardContainer(): React.JSX.Element {
  useInvoiceContext();
  return <GeneralExpenseCard />;
}
