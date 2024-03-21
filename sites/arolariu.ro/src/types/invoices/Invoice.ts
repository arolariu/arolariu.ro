import NamedEntity from "../DDD/NamedEntity";
import { KeyValuePair } from "../KvPair";
import Merchant from "./Merchant";
import Product from "./Product";

export default interface Invoice extends NamedEntity<string> {
	category: InvoiceCategory;
	userIdentifier: string;
	photoLocation: string;
	paymentInformation: PaymentInformation;
	merchant: Merchant;
	items: Product[];
	possibleRecipes: Recipe[];
	estimatedSurvivalDays: number;
	additionalMetadata: KeyValuePair<string, object>[];
}

export interface InvoiceAnalysisOptions {
	completeAnalysis: boolean;
	invoiceOnly: boolean;
	invoiceItemsOnly: boolean;
}


export type Recipe = {
	name: string;
	duration: string;
	complexity: number;
	recipeIngredients: Product[];
	observations: string[];
}

export type PaymentInformation = {
	dateOfPurchase: Date;
	currency: Currency;
	totalAmount: number;
	totalTax: number;
}

export type Currency = {name: string, symbol:string}

export enum InvoiceCategory {
	NOT_DEFINED = 0,
	FOOD,
	DRINKS,
	OTHER,
}
