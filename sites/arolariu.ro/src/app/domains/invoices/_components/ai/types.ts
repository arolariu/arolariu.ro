/**
 * @fileoverview Type definitions for local invoice AI assistant state and messages.
 *
 * Defines lifecycle states, message structures, and model metadata for the
 * client-only invoice AI assistant powered by WebLLM.
 *
 * @module app/domains/invoices/_components/ai/types
 */

import type {HardwareEligibilityResult} from "./hardwareEligibility";

/**
 * Role identifier for local invoice assistant messages.
 *
 * @remarks
 * - `system`: System prompt with sanitized invoice context
 * - `user`: User questions about invoices
 * - `assistant`: LLM responses
 */
export type LocalInvoiceAssistantRole = "assistant" | "system" | "user";

/**
 * Local invoice assistant lifecycle state.
 *
 * @remarks
 * **Flow:**
 * 1. `checking-hardware` → Hardware capability analysis
 * 2. `hardware-ineligible` → Hard requirements failed (WebGPU, storage, workers)
 * 3. `compatibility-unknown` → Some hints unavailable (memory/CPU), user can proceed with warning
 * 4. `not-downloaded` → Eligible, model not cached, ready for download
 * 5. `downloading` → Model download in progress
 * 6. `ready` → Model loaded, chat available
 * 7. `generating` → LLM actively generating response
 * 8. `cancelled` → Generation interrupted by user
 * 9. `error` → Recoverable error (hardware check, download, or generation failure)
 */
export type LocalInvoiceAssistantLifecycle =
  | "cancelled"
  | "checking-hardware"
  | "compatibility-unknown"
  | "downloading"
  | "error"
  | "generating"
  | "hardware-ineligible"
  | "not-downloaded"
  | "ready";

/**
 * Chat message in local invoice assistant conversation.
 *
 * @remarks
 * System messages not persisted in UI (injected per-request in prompt).
 * Only user and assistant messages stored in session state.
 */
export type LocalInvoiceAssistantMessage = Readonly<{
  /** Message text content. */
  content: string;
  /** Unique message identifier (UUID or fallback). */
  id: string;
  /** Message role (excludes 'system'). */
  role: Exclude<LocalInvoiceAssistantRole, "system">;
  /** ISO 8601 timestamp when message created. */
  timestamp: string;
}>;

/**
 * Model family classification for local invoice assistant models.
 *
 * @remarks
 * Groups models by architecture lineage for UI filtering and analytics.
 */
export type LocalInvoiceAssistantModelFamily = "gemma" | "llama" | "phi" | "qwen" | "smollm";

/**
 * Model tier for recommendation and UI grouping.
 *
 * @remarks
 * - `fallback`: Smallest models for constrained devices
 * - `balanced`: Default tier balancing performance and resource usage
 * - `quality`: Larger models for capable devices
 * - `experimental`: Bleeding-edge models requiring validation
 */
export type LocalInvoiceAssistantModelTier = "balanced" | "experimental" | "fallback" | "quality";

/**
 * Local LLM model metadata.
 *
 * @remarks
 * Extended from single hardcoded model to catalog-based selection.
 * Model ID must match WebLLM prebuilt model registry.
 */
export type LocalInvoiceAssistantModelMetadata = Readonly<{
  /** Artifact host URL (e.g., HuggingFace). */
  artifactHost: string;
  /** Model context window size in tokens. */
  contextWindowTokens: number;
  /** Human-readable model name for UI. */
  displayName: string;
  /** Model family (llama, gemma, phi, qwen, smollm). */
  family: LocalInvoiceAssistantModelFamily;
  /** WebLLM model identifier. */
  id: string;
  /** Required GPU features (e.g., shader-f16). */
  requiredFeatures: ReadonlyArray<string>;
  /** Model tier for recommendation logic. */
  tier: LocalInvoiceAssistantModelTier;
  /** Estimated VRAM requirement in megabytes. */
  vramRequiredMB: number;
}>;

/**
 * Complete local invoice assistant state.
 *
 * @remarks
 * Managed by `useLocalInvoiceAssistant` hook.
 * Session-only (no persistence across page refreshes).
 */
export type LocalInvoiceAssistantState = Readonly<{
  /** Active LLM model metadata. */
  activeModel: LocalInvoiceAssistantModelMetadata;
  /** Current error message (null if no error). */
  error: string | null;
  /** Hardware eligibility result (null during initial check). */
  hardware: HardwareEligibilityResult | null;
  /** Current lifecycle state. */
  lifecycle: LocalInvoiceAssistantLifecycle;
  /** Session chat history (user + assistant messages). */
  messages: ReadonlyArray<LocalInvoiceAssistantMessage>;
  /** Model download progress (0-1 range). */
  progress: number;
}>;

/**
 * Prompt message for WebLLM inference (includes system role).
 */
export type LocalInvoiceAssistantPromptMessage = Readonly<{
  /** Message content. */
  content: string;
  /** Message role (system, user, or assistant). */
  role: LocalInvoiceAssistantRole;
}>;
