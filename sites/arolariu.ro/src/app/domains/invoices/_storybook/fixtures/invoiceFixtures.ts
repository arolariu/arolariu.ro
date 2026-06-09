/**
 * @fileoverview Invoice fixtures for invoice Storybook stories.
 * @module app/domains/invoices/_storybook/fixtures/invoiceFixtures
 */

import type {Allergen} from "@/types/invoices/Allergen";
import type {Invoice, InvoiceCategory} from "@/types/invoices/Invoice";
import type {PaymentDetail, PaymentInformation, PaymentType, TaxDetail} from "@/types/invoices/Payment";
import type {Product, ProductCategory, ProductMetadata} from "@/types/invoices/Product";
import type {Currency} from "@/types/DDD/SharedKernel/Currency";
import {storyInvoiceImageScan, storyInvoicePdfScan} from "./scanFixtures";
import {storyMerchant, storyOnlineMerchant} from "./merchantFixtures";
import {storyRecipeEasy, storyRecipeHard} from "./recipeFixtures";

/**
 * Romanian Leu currency fixture.
 */
export const storyCurrency: Currency = {
	name: "Romanian Leu",
	code: "RON",
	symbol: "lei",
};

/**
 * PaymentInformation fixture for grocery invoice.
 */
export const storyPaymentInformation: PaymentInformation = {
	transactionDate: new Date("2024-03-15T14:30:00.000Z"),
	paymentType: 200 as PaymentType, // Card
	currency: storyCurrency,
	totalCostAmount: 157.5,
	totalTaxAmount: 25.12,
	subtotalAmount: 132.38,
	tipAmount: 0,
};

/**
 * TaxDetail fixture for VAT 19%.
 */
const storyTaxDetail: TaxDetail = {
	amount: 25.12,
	rate: 19,
	netAmount: 132.38,
	description: "VAT 19%",
};

/**
 * PaymentDetail fixture for card payment.
 */
const storyPaymentDetail: PaymentDetail = {
	method: "Credit Card",
	amount: 157.5,
};

/**
 * ProductMetadata fixture with high confidence.
 */
function createProductMetadata(overrides: Partial<ProductMetadata> = {}): ProductMetadata {
	return {
		isEdited: false,
		isComplete: true,
		isSoftDeleted: false,
		confidence: 0.95,
		...overrides,
	};
}

/**
 * Allergen fixture for lactose.
 */
const lactoseAllergen: Allergen = {
	name: "Lactose",
	description: "Milk sugar found in dairy products",
	learnMoreAddress: "https://www.who.int/allergens/lactose",
};

/**
 * Allergen fixture for gluten.
 */
const glutenAllergen: Allergen = {
	name: "Gluten",
	description: "Protein found in wheat, rye, and barley",
	learnMoreAddress: "https://www.who.int/allergens/gluten",
};

/**
 * Product fixture - milk.
 */
const storyProductMilk: Product = {
	name: "Zuzu Milk 2% 1 Liter",
	category: 300 as ProductCategory, // DAIRY
	quantity: 2,
	quantityUnit: "pcs",
	productCode: "5941234567890",
	price: 8.99,
	totalPrice: 17.98,
	detectedAllergens: [lactoseAllergen],
	metadata: createProductMetadata(),
};

/**
 * Product fixture - bread.
 */
const storyProductBread: Product = {
	name: "Whole Wheat Bread 500g",
	category: 100 as ProductCategory, // BAKED_GOODS
	quantity: 1,
	quantityUnit: "pcs",
	productCode: "5941234567891",
	price: 6.5,
	totalPrice: 6.5,
	detectedAllergens: [glutenAllergen],
	metadata: createProductMetadata(),
};

/**
 * Product fixture - eggs.
 */
const storyProductEggs: Product = {
	name: "Free Range Eggs Large 10pcs",
	category: 200 as ProductCategory, // GROCERIES
	quantity: 1,
	quantityUnit: "pack",
	productCode: "5941234567892",
	price: 15.99,
	totalPrice: 15.99,
	detectedAllergens: [],
	metadata: createProductMetadata(),
};

/**
 * Product fixture - apples.
 */
const storyProductApples: Product = {
	name: "Organic Apples 1kg",
	category: 600 as ProductCategory, // FRUITS
	quantity: 1.5,
	quantityUnit: "kg",
	productCode: "5941234567893",
	price: 12.99,
	totalPrice: 19.49,
	detectedAllergens: [],
	metadata: createProductMetadata(),
};

/**
 * Array of products for invoice fixtures.
 */
export const storyProducts: Product[] = [
	storyProductMilk,
	storyProductBread,
	storyProductEggs,
	storyProductApples,
];

/**
 * Standard grocery invoice fixture.
 */
export const storyInvoice: Invoice = {
	id: "invoice-story-001",
	name: "Grocery Shopping - March 2024",
	description: "Weekly grocery shopping at local supermarket",
	userIdentifier: "user-storybook",
	sharedWith: [],
	category: 100 as InvoiceCategory, // GROCERY
	scans: [storyInvoiceImageScan],
	paymentInformation: storyPaymentInformation,
	merchantReference: storyMerchant.id,
	items: storyProducts,
	possibleRecipes: [storyRecipeEasy, storyRecipeHard],
	additionalMetadata: {
		source: "mobile-app",
		analysisVersion: "v2.1.0",
	},
	receiptType: "Itemized",
	countryRegion: "RO",
	taxDetails: [storyTaxDetail],
	payments: [storyPaymentDetail],
	createdAt: new Date("2024-03-15T14:45:00.000Z"),
	createdBy: "user-storybook",
	lastUpdatedAt: new Date("2024-03-15T14:45:00.000Z"),
	lastUpdatedBy: "user-storybook",
	numberOfUpdates: 0,
	isImportant: false,
	isSoftDeleted: false,
};

/**
 * Public invoice fixture - shared with everyone.
 */
export const storyPublicInvoice: Invoice = {
	...storyInvoice,
	id: "invoice-story-public-001",
	name: "Public Grocery Invoice",
	description: "Example invoice shared publicly for demonstration",
	sharedWith: ["public-guid-sentinel-00000000-0000-0000-0000-000000000000"],
	isImportant: true,
};

/**
 * Online shop invoice fixture.
 */
export const storyOnlineInvoice: Invoice = {
	id: "invoice-story-online-001",
	name: "Electronics Order - FastDelivery.ro",
	description: "Online purchase of wireless headphones",
	userIdentifier: "user-storybook",
	sharedWith: [],
	category: 9999 as InvoiceCategory, // OTHER
	scans: [storyInvoicePdfScan],
	paymentInformation: {
		transactionDate: new Date("2024-03-10T16:20:00.000Z"),
		paymentType: 200 as PaymentType, // Card
		currency: storyCurrency,
		totalCostAmount: 299.99,
		totalTaxAmount: 57.0,
		subtotalAmount: 242.99,
		tipAmount: 0,
	},
	merchantReference: storyOnlineMerchant.id,
	items: [
		{
			name: "Wireless Noise-Cancelling Headphones",
			category: 9999 as ProductCategory, // OTHER
			quantity: 1,
			quantityUnit: "pcs",
			productCode: "5941234567899",
			price: 299.99,
			totalPrice: 299.99,
			detectedAllergens: [],
			metadata: createProductMetadata({confidence: 1.0}),
		},
	],
	possibleRecipes: [],
	additionalMetadata: {
		source: "web-app",
		orderNumber: "FD-2024-0310-1234",
	},
	receiptType: "CreditCard",
	countryRegion: "RO",
	taxDetails: [
		{
			amount: 57.0,
			rate: 19,
			netAmount: 242.99,
			description: "VAT 19%",
		},
	],
	payments: [
		{
			method: "Debit Card",
			amount: 299.99,
		},
	],
	createdAt: new Date("2024-03-10T16:25:00.000Z"),
	createdBy: "user-storybook",
	lastUpdatedAt: new Date("2024-03-10T16:25:00.000Z"),
	lastUpdatedBy: "user-storybook",
	numberOfUpdates: 0,
	isImportant: true,
	isSoftDeleted: false,
};

/**
 * Array of multiple invoice fixtures for list/grid stories.
 */
export const storyInvoices: Invoice[] = [storyInvoice, storyPublicInvoice, storyOnlineInvoice];
