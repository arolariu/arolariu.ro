/** @format */

import type NamedEntity from "../DDD/Entities/NamedEntity";
import type Merchant from "./Merchant";
import type {PaymentInformation} from "./Payment";
import type Product from "./Product";
import type {Recipe} from "./Recipe";

/**
 * Represents the options for the invoice analysis.
 */
export type InvoiceAnalysisOptions = {
  completeAnalysis: boolean;
  invoiceOnly: boolean;
  invoiceItemsOnly: boolean;
};

/**
 * Represents the category of an invoice from the invoice domain system.
 */
export enum InvoiceCategory {
  NOT_DEFINED,
  FOOD,
  DRINKS,
  OTHER,
}

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
