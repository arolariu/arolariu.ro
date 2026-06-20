import type {Invoice, Merchant, Recipe} from "@/types/invoices";
import type {CachedScan} from "@/types/scans";

import {storyInvoice, storyPublicInvoice} from "../fixtures/invoiceFixtures";
import {storyMerchant, storyOnlineMerchant} from "../fixtures/merchantFixtures";
import {storyRecipeEasy, storyRecipeHard} from "../fixtures/recipeFixtures";
import {storyCachedImageScan, storyCachedPdfScan} from "../fixtures/scanFixtures";

/** Named recipe fixtures for the recipe preset select. */
export const recipePresets: Readonly<Record<string, Recipe>> = {easy: storyRecipeEasy, hard: storyRecipeHard};
/** Named merchant fixtures for the merchant preset select. */
export const merchantPresets: Readonly<Record<string, Merchant>> = {physical: storyMerchant, online: storyOnlineMerchant};
/** Named scan fixtures for the scan preset select. */
export const scanPresets: Readonly<Record<string, CachedScan>> = {image: storyCachedImageScan, pdf: storyCachedPdfScan};
/** Named invoice fixtures for the invoice preset select. */
export const invoicePresets: Readonly<Record<string, Invoice>> = {standard: storyInvoice, public: storyPublicInvoice};
