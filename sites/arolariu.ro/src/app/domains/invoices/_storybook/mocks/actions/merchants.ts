/**
 * @fileoverview Storybook-safe merchant server action mocks.
 * @module app/domains/invoices/_storybook/mocks/actions/merchants
 *
 * @remarks
 * Exports all merchant server action symbols with Storybook-safe implementations.
 * These mocks return realistic success results without backend dependencies.
 */

import type {Merchant} from "@/types/invoices";
import {
	logStoryAction,
	STORYBOOK_LATENCY,
	successfulStoryAction,
	type StoryActionResult,
	waitForStorybookLatency,
} from "../../utils/storyActions";
import {storyMerchant, storyMerchants} from "../../fixtures/merchantFixtures";

/** Fetches a single merchant (mock). */
export async function fetchMerchant(): Promise<StoryActionResult<Merchant>> {
	logStoryAction("fetchMerchant");
	await waitForStorybookLatency(STORYBOOK_LATENCY.short);
	return successfulStoryAction(storyMerchant);
}

/** Fetches all merchants (mock). */
export async function fetchMerchants(): Promise<StoryActionResult<Merchant[]>> {
	logStoryAction("fetchMerchants");
	await waitForStorybookLatency(STORYBOOK_LATENCY.medium);
	return successfulStoryAction(storyMerchants as Merchant[]);
}
