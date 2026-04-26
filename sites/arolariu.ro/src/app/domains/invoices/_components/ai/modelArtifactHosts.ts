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
 * **HuggingFace artifact types:**
 * - Model weights (*.bin, *.safetensors)
 * - Tokenizer config (tokenizer.json, tokenizer_config.json)
 * - Model config (config.json, params.json)
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

/**
 * WebLLM prebuilt WASM model library host.
 *
 * @remarks
 * **Security constraint:**
 * - Required for WebLLM 0.2.82 runtime WASM model libraries
 * - Separate from model artifact host (HuggingFace)
 * - Source: `node_modules/@mlc-ai/web-llm/lib/index.js` line ~920
 *   `modelLibURLPrefix = "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/"`
 *
 * **GitHub raw.githubusercontent.com artifact types:**
 * - WebLLM prebuilt WASM model libraries (*.wasm)
 * - Model-specific execution libraries
 * - Compiled by MLC AI team, hosted on GitHub
 *
 * **CSP usage:**
 * - Added to `connect-src` for WebLLM library downloads
 * - Not derived from catalog (runtime dependency, not model metadata)
 */
export const WEBLLM_BINARY_LIBRARY_HOST = "https://raw.githubusercontent.com";

/**
 * Derives unique CSP origins from model catalog artifact hosts.
 *
 * @param artifactHosts - Array of full artifact host URLs from model catalog.
 * @returns Array of unique CSP origins (scheme + host).
 * @throws Error if any artifact host is malformed or uses non-HTTPS protocol.
 *
 * @remarks
 * **Fail-closed security:**
 * - Throws for malformed URLs (prevents silent skipping of invalid entries)
 * - Throws for non-HTTPS protocols (http:, ftp:, etc.)
 * - Production CSP must be HTTPS-only for model artifact downloads
 *
 * Converts full artifact URLs to CSP-compatible origins by extracting
 * origin (scheme + host). Deduplicates in case multiple catalog
 * entries share the same origin.
 *
 * **Example:**
 * - Input: `["https://huggingface.co/mlc-ai", "https://huggingface.co/other"]`
 * - Output: `["https://huggingface.co"]`
 *
 * **CSP usage:**
 * Used by Next.js config to dynamically derive allowed model artifact origins
 * from the selectable catalog, ensuring CSP stays in sync with catalog changes.
 *
 * @example
 * ```typescript
 * const origins = deriveUniqueArtifactOrigins([
 *   "https://huggingface.co/mlc-ai",
 *   "https://huggingface.co/mlc-ai",
 * ]);
 * // Returns: ["https://huggingface.co"]
 * ```
 */
export function deriveUniqueArtifactOrigins(artifactHosts: ReadonlyArray<string>): ReadonlyArray<string> {
  const origins = new Set<string>();

  for (const host of artifactHosts) {
    let url: URL;

    try {
      url = new URL(host);
    } catch (error) {
      throw new Error(`Invalid artifact host URL: "${host}". Artifact hosts must be valid HTTPS URLs.`, {cause: error});
    }

    // Enforce HTTPS-only for production CSP security
    if (url.protocol !== "https:") {
      throw new Error(`Invalid artifact host protocol: "${host}". Only HTTPS is allowed, found: ${url.protocol}`);
    }

    // Use url.origin for CSP (scheme + host + port)
    origins.add(url.origin);
  }

  return Array.from(origins).sort();
}

