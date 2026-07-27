/**
 * @fileoverview Tunable constants for the scan upload workflow.
 * @module app/domains/invoices/upload-scans/_model/constants
 */

/** Maximum number of scan uploads that may run in parallel. */
export const UPLOAD_CONCURRENCY_LIMIT = 5;

/** Maximum number of attempts for a single scan upload before it is marked failed. */
export const MAX_UPLOAD_ATTEMPTS = 3;

/** Delay before removing a completed upload card from the route queue. */
export const COMPLETED_UPLOAD_REMOVAL_DELAY_MS = 1000;

/** Delay before showing the post-upload prompt after a batch completes. */
export const POST_UPLOAD_PROMPT_DELAY_MS = 500;
