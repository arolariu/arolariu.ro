/**
 * @fileoverview Merchant fixtures for invoice Storybook stories.
 * @module app/domains/invoices/_storybook/fixtures/merchantFixtures
 */

import type {ContactInformation, Merchant, MerchantCategory} from "@/types/invoices/Merchant";

/**
 * Creates a ContactInformation fixture with realistic data.
 *
 * @param overrides - Partial ContactInformation to override defaults
 * @returns Complete ContactInformation fixture
 */
function createContactInformation(overrides: Partial<ContactInformation> = {}): ContactInformation {
	return {
		fullName: "",
		address: "",
		phoneNumber: "",
		emailAddress: "",
		website: "",
		...overrides,
	};
}

/**
 * Local shop merchant fixture.
 */
export const storyMerchant: Merchant = {
	id: "merchant-story-local-001",
	name: "Corner Shop ABC",
	description: "Small local convenience store in neighborhood",
	category: 100 as MerchantCategory, // LOCAL_SHOP
	address: createContactInformation({
		fullName: "Corner Shop ABC SRL",
		address: "Str. Mihai Viteazu 42, Sector 3, București 030124, România",
		phoneNumber: "+40 21 345 6789",
		emailAddress: "contact@cornershopabc.ro",
		website: "https://www.cornershopabc.ro",
	}),
	parentCompanyId: "",
	createdAt: new Date("2024-01-15T10:00:00.000Z"),
	createdBy: "storybook-user",
	lastUpdatedAt: new Date("2024-01-15T10:00:00.000Z"),
	lastUpdatedBy: "storybook-user",
	numberOfUpdates: 0,
	isImportant: false,
	isSoftDeleted: false,
};

/**
 * Online shop merchant fixture.
 */
export const storyOnlineMerchant: Merchant = {
	id: "merchant-story-online-001",
	name: "FastDelivery.ro",
	description: "Leading e-commerce platform for electronics and gadgets",
	category: 400 as MerchantCategory, // ONLINE_SHOP
	address: createContactInformation({
		fullName: "FastDelivery Romania SRL",
		address: "Bd. Unirii 20, Sector 4, București 040107, România",
		phoneNumber: "+40 31 234 5678",
		emailAddress: "support@fastdelivery.ro",
		website: "https://www.fastdelivery.ro",
	}),
	parentCompanyId: "merchant-fastdelivery-group-parent",
	createdAt: new Date("2024-02-01T12:30:00.000Z"),
	createdBy: "storybook-user",
	lastUpdatedAt: new Date("2024-02-10T15:45:00.000Z"),
	lastUpdatedBy: "admin-user",
	numberOfUpdates: 3,
	isImportant: true,
	isSoftDeleted: false,
};

/**
 * Supermarket merchant fixture.
 */
const storySupermarket: Merchant = {
	id: "merchant-story-supermarket-001",
	name: "Mega Image Militari",
	description: "Supermarket chain located in Militari Shopping Center",
	category: 200 as MerchantCategory, // SUPERMARKET
	address: createContactInformation({
		fullName: "Mega Image Romania SRL",
		address: "Str. Iuliu Maniu 220, Sector 6, București 061126, România",
		phoneNumber: "+40 21 555 1234",
		emailAddress: "militari@megaimage.ro",
		website: "https://www.megaimage.ro",
	}),
	parentCompanyId: "merchant-megaimage-romania-parent",
	createdAt: new Date("2024-01-20T09:00:00.000Z"),
	createdBy: "storybook-user",
	lastUpdatedAt: new Date("2024-01-20T09:00:00.000Z"),
	lastUpdatedBy: "storybook-user",
	numberOfUpdates: 0,
	isImportant: false,
	isSoftDeleted: false,
};

/**
 * Hypermarket merchant fixture.
 */
const storyHypermarket: Merchant = {
	id: "merchant-story-hypermarket-001",
	name: "Carrefour Orhideea",
	description: "Large hypermarket in AFI Cotroceni mall",
	category: 300 as MerchantCategory, // HYPERMARKET
	address: createContactInformation({
		fullName: "Carrefour Romania SA",
		address: "Bd. Vasile Milea 4, Sector 6, București 061344, România",
		phoneNumber: "+40 21 400 1234",
		emailAddress: "orhideea@carrefour.ro",
		website: "https://www.carrefour.ro",
	}),
	parentCompanyId: "merchant-carrefour-romania-parent",
	createdAt: new Date("2024-01-10T08:00:00.000Z"),
	createdBy: "system",
	lastUpdatedAt: new Date("2024-03-05T14:20:00.000Z"),
	lastUpdatedBy: "admin-user",
	numberOfUpdates: 12,
	isImportant: true,
	isSoftDeleted: false,
};

/**
 * Array of multiple merchant fixtures for list/grid stories.
 */
export const storyMerchants: Merchant[] = [
	storyMerchant,
	storyOnlineMerchant,
	storySupermarket,
	storyHypermarket,
];
