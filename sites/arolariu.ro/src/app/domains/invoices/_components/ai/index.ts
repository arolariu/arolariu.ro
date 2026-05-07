/**
 * @fileoverview Public barrel for the local invoice AI assistant module.
 * @module app/domains/invoices/_components/ai
 *
 * @remarks
 * Consumers import from this barrel only. Internal directories
 * (intents/, aggregators/, renderer/, workers/, hosts/) are
 * implementation details.
 *
 * The full design lives in:
 * docs/superpowers/specs/2026-05-06-local-invoice-ai-assistant-design.md
 */

export {AssistantPanel} from "./AssistantPanel";
export type {AssistantPanelProps} from "./AssistantPanel";