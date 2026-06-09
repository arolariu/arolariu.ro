/**
 * @fileoverview Storybook-safe merchant server action mocks.
 * @module app/domains/invoices/_storybook/mocks/actions/merchants
 *
 * @remarks
 * Exports all merchant server action symbols with Storybook-safe implementations.
 * These mocks return realistic success results without backend dependencies.
 */

import type {Merchant} from "@/types/invoices";
import {logStoryAction, successfulStoryAction, type StoryActionResult} from "../../utils/storyActions";
import {storyMerchant, storyMerchants} from "../../fixtures/merchantFixtures";

/** Fetches a single merchant (mock). */
export async function fetchMerchant(): Promise<StoryActionResult<Merchant>> {
	logStoryAction("fetchMerchant");
	await new Promise((resolve) => globalThis.setTimeout(resolve, 200));
	return successfulStoryAction(storyMerchant);
}

/** Fetches all merchants (mock). */
export async function fetchMerchants(): Promise<StoryActionResult<Merchant[]>> {
	logStoryAction("fetchMerchants");
	await new Promise((resolve) => globalThis.setTimeout(resolve, 300));
	return successfulStoryAction(storyMerchants as Merchant[]);
}
