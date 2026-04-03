import type {Invoice} from "@/types/invoices";
import {ProductCategory} from "@/types/invoices/Product";

const EMPTY_GUID = "00000000-0000-0000-0000-000000000000";

/**
 * Calculates the invoice health score percentage (0-100).
 *
 * @remarks
 * Weighted scoring across 7 quality dimensions:
 * | Factor               | Weight |
 * |----------------------|--------|
 * | Products present     | 15%    |
 * | Product completeness | 20%    |
 * | OCR confidence       | 20%    |
 * | Merchant linked      | 10%    |
 * | Payment info         | 15%    |
 * | Categories assigned  | 10%    |
 * | Recipes generated    | 10%    |
 *
 * @param invoice - The invoice to score
 * @returns Health score percentage (0-100)
 */
export function calculateHealthScorePercentage(invoice: Invoice): number {
  const items = invoice.items.filter((item) => !item.metadata.isSoftDeleted);
  const totalItems = items.length;

  const productsPoints = totalItems > 0 ? 15 : 0;

  const completeProducts = items.filter((item) => item.metadata.isComplete).length;
  const completenessRatio = totalItems > 0 ? completeProducts / totalItems : 0;
  const completenessPoints = Math.round(completenessRatio * 20);

  const confidenceScores = items.map((item) => item.metadata.confidence).filter((c) => c > 0);
  const avgConfidence = confidenceScores.length > 0 ? confidenceScores.reduce((sum, c) => sum + c, 0) / confidenceScores.length : 0;
  const confidencePoints = Math.round(avgConfidence * 20);

  const hasMerchant = invoice.merchantReference !== EMPTY_GUID && invoice.merchantReference.length > 0;
  const merchantPoints = hasMerchant ? 10 : 0;

  const hasCompletePayment =
    Boolean(invoice.paymentInformation.transactionDate)
    && invoice.paymentInformation.totalCostAmount > 0
    && invoice.paymentInformation.currency.code.length > 0;
  const paymentPoints = hasCompletePayment ? 15 : 0;

  const categorizedProducts = items.filter((item) => item.category !== ProductCategory.NOT_DEFINED).length;
  const categoryRatio = totalItems > 0 ? categorizedProducts / totalItems : 0;
  const categoryPoints = Math.round(categoryRatio * 10);

  const recipesPoints = invoice.possibleRecipes.length > 0 ? 10 : 0;

  const totalScore =
    productsPoints + completenessPoints + confidencePoints + merchantPoints + paymentPoints + categoryPoints + recipesPoints;

  return Math.round((totalScore / 100) * 100);
}
