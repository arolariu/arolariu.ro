/** @format */

/* eslint-disable no-unused-vars */
export default interface Invoice {
	id: string;
	imageUri: string;
	isAnalyzed: boolean;
	uploadedDate: Date;
	identifiedDate: Date;
	lastModifiedDate: Date;
	lastAnalyzedDate: Date;
	currency: string;
	totalAmount: number;
	totalTax: number;
	description: string;
	isImportant: boolean;
	possibleRecipes: string[];
	possibleAllergens: string[];
	estimatedSurvivalDays: number;
	userIdentifier: string;
	merchant: Merchant;
	items: Item[];
	additionalMetadata: KeyValuePair<string, string>[];
}

export type KeyValuePair<TKey, TValue> = {
	key: TKey;
	value: TValue;
};
export interface Merchant {
	name: string;
	address: string;
	phoneNumber: string;
	category: MerchantCategory;
	parentCompany: string;
}

export enum MerchantCategory {
	NOT_DEFINED = 0,
	LOCAL_SHOP,
	SUPERMARKET,
	HYPERMARKET,
	ONLINE_SHOP,
	OTHER,
}

export interface Item {
	rawName: string;
	genericName: string;
	category: ItemCategory;
	quantity: number;
	quantityUnit: string;
	productCode: string;
	price: number;
	totalPrice: number;
}

export enum ItemCategory {
	NOT_DEFINED = 0,
	BAKED_GOODS,
	GROCERIES,
	DAIRY,
	MEAT,
	FISH,
	FRUITS,
	VEGETABLES,
	BEVERAGES,
	ALCOHOLIC_BEVERAGES,
	TOBACCO,
	CLEANING_SUPPLIES,
	PERSONAL_CARE,
	MEDICINE,
	OTHER,
}

export interface InvoiceAnalysisOptions {
	completeAnalysis: boolean;
	invoiceOnly: boolean;
	invoiceItemsOnly: boolean;
}
