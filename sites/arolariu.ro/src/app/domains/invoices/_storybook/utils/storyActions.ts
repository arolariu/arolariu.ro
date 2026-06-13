/**
 * @fileoverview Storybook action helpers for consistent logging and result handling.
 * @module app/domains/invoices/_storybook/utils/storyActions
 */

/**
 * Standard result shape for Storybook action handlers.
 *
 * @template TValue - The type of the value returned by the action.
 */
export type StoryActionResult<TValue> = Readonly<{
	/** Whether the action succeeded */
	success: boolean;
	/** The action result value (present when success is true) */
	data?: TValue;
	/** Error message (present when success is false) */
	error?: string;
}>;

/**
 * Logs a Storybook action with optional detail.
 *
 * @param action - The action name to log.
 * @param detail - Optional detail value to log.
 */
export function logStoryAction(action: string, detail?: unknown): void {
	const timestamp = new Date().toISOString();
	if (detail !== undefined) {
		console.log(`[Storybook Action @ ${timestamp}] ${action}:`, detail);
	} else {
		console.log(`[Storybook Action @ ${timestamp}] ${action}`);
	}
}

/**
 * Creates a successful action result.
 *
 * @template TValue - The type of the value returned by the action.
 * @param value - The action result value.
 * @returns A successful action result.
 */
export function successfulStoryAction<TValue>(value: TValue): StoryActionResult<TValue> {
	return {
		success: true,
		data: value,
	} as const;
}

/**
 * Named latency values for Storybook mocks.
 */
export const STORYBOOK_LATENCY = {
	short: 200,
	medium: 300,
	long: 500,
	bulk: 800,
} as const;

/**
 * Waits for a configured Storybook mock latency.
 *
 * @param milliseconds - Latency duration in milliseconds.
 * @returns A promise that resolves after the configured delay.
 */
export async function waitForStorybookLatency(milliseconds: number): Promise<void> {
	if (globalThis.sessionStorage?.getItem("storybook-zero-latency") === "true") {
		return;
	}

	await new Promise<void>((resolve) => {
		globalThis.setTimeout(resolve, milliseconds);
	});
}
