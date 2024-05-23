/** @format */

import NamedEntity from "../DDD/NamedEntity";
import Merchant from "./Merchant";
import Product from "./Product";

/**
 * Represents an invoice (the main entity) from the invoice domain system.
 */
export default interface Invoice extends NamedEntity<string> {
  category: InvoiceCategory;
  userIdentifier: string;
  photoLocation: string;
  paymentInformation: PaymentInformation;
  merchant: Merchant;
  items: Product[];
  possibleRecipes: Recipe[];
  estimatedSurvivalDays: number;
  additionalMetadata: Record<string, object>[];
}

/**
 * Represents the options for the invoice analysis.
 */
export interface InvoiceAnalysisOptions {
  completeAnalysis: boolean;
  invoiceOnly: boolean;
  invoiceItemsOnly: boolean;
}

/**
 * Represents a recipe from the invoice domain system.
 */
export type Recipe = {
  name: string;
  duration: string;
  complexity: number;
  recipeIngredients: Product[];
  observations: string[];
};

/**
 * Represents the payment information of an invoice from the invoice domain system.
 */
export type PaymentInformation = {
  dateOfPurchase: Date;
  currency: Currency;
  totalAmount: number;
  totalTax: number;
};

/**
 * Represents a currency from the invoice domain system.
 */
export type Currency = {name: string; symbol: string};

/**
 * Represents the category of an invoice from the invoice domain system.
 */
export enum InvoiceCategory {
  NOT_DEFINED = 0,
  FOOD,
  DRINKS,
  OTHER,
}
