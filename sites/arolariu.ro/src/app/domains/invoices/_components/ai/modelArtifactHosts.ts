/**
 * @fileoverview Model artifact host constants for local invoice AI assistant.
 *
 * Defines approved external hosts for WebLLM model artifact downloads.
 * Used by both model catalog and Next.js CSP configuration to ensure
 * artifact host allowlist is single-source-of-truth.
 *
 * @module app/domains/invoices/_components/ai/modelArtifactHosts
 */

/**
 * Approved model artifact host for WebLLM models.
 *
 * @remarks
 * **Security constraint:**
 * - Only this host is allowed for model artifact downloads in CSP
 * - All models in `LOCAL_INVOICE_ASSISTANT_MODELS` must use this host
 * - Changing this constant requires CSP review and catalog validation
 *
 * **CSP mapping:**
 * - Full artifact URL: `https://huggingface.co/mlc-ai/...`
 * - CSP origin: `https://huggingface.co` (origin without path)
 *
 * **WebLLM behavior:**
 * - Downloads model weights (*.bin, *.safetensors)
 * - Downloads tokenizer config (tokenizer.json)
 * - Downloads model config (config.json, params.json)
 * - All artifacts stored in browser Cache API
 */
export const WEBLLM_ARTIFACT_HOST_FULL = "https://huggingface.co/mlc-ai";

/**
 * CSP origin for WebLLM artifact host.
 *
 * @remarks
 * CSP `connect-src` requires origin-level granularity (scheme + host + port),
 * not full URLs with paths. This constant is derived from
 * `WEBLLM_ARTIFACT_HOST_FULL` for CSP configuration.
 *
 * **Why origin-level?**
 * WebLLM may fetch from various paths under `/mlc-ai/` org, so CSP must
 * allow the entire origin rather than specific paths.
 */
export const WEBLLM_ARTIFACT_HOST_CSP_ORIGIN = "https://huggingface.co";
