/**
 * @fileoverview Web Worker entry point for WebLLM model execution.
 *
 * Delegates message handling to WebLLM's built-in worker handler.
 * Runs LLM inference off the main thread to prevent UI blocking.
 *
 * @module app/domains/invoices/_components/ai/webLlmWorker
 */

import {WebWorkerMLCEngineHandler} from "@mlc-ai/web-llm";

/**
 * WebLLM engine handler for worker message processing.
 *
 * @internal
 */
const handler = new WebWorkerMLCEngineHandler();

/**
 * Worker message listener with origin validation.
 *
 * @remarks
 * Filters messages to same-origin requests to prevent
 * cross-origin message injection attacks.
 */
globalThis.addEventListener("message", (event: MessageEvent): void => {
  if (event.origin && event.origin !== globalThis.location.origin) {
    return;
  }

  handler.onmessage(event);
});
