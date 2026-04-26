/**
 * @fileoverview Model catalog and hardware-aware recommendation for local invoice AI assistant.
 *
 * Provides a curated catalog of WebLLM models with metadata for hardware requirements,
 * context windows, and display names. Recommends models based on device capabilities,
 * GPU features, and storage availability.
 *
 * @module app/domains/invoices/_components/ai/modelCatalog
 */

import type {HardwareEligibilityResult} from "./hardwareEligibility";
import type {LocalInvoiceAssistantModelMetadata} from "./types";

/**
 * Curated catalog of local invoice assistant models.
 *
 * @remarks
 * Models are ordered by preference within tiers:
 * 1. Fallback: Smallest models for constrained devices
 * 2. Balanced: Default tier (Llama 3.2 1B, Gemma 2 2B)
 * 3. Quality: Larger models for capable hardware
 * 4. Experimental: Bleeding-edge models requiring validation
 *
 * **Upgrade-gated models:**
 * See `UPGRADE_GATED_MODEL_CANDIDATES` for models excluded until WebLLM upgrade.
 *
 * All models use q4f16_1 quantization for browser feasibility.
 * Model IDs must match WebLLM prebuilt model registry.
 */
export const LOCAL_INVOICE_ASSISTANT_MODELS = [
  // Fallback tier: Smallest models for constrained devices
  {
    artifactHost: "https://huggingface.co/mlc-ai",
    contextWindowTokens: 4096,
    displayName: "SmolLM2 360M Instruct",
    family: "smollm",
    id: "SmolLM2-360M-Instruct-q4f16_1-MLC",
    requiredFeatures: ["shader-f16"],
    tier: "fallback",
    vramRequiredMB: 376.06,
  },
  {
    artifactHost: "https://huggingface.co/mlc-ai",
    contextWindowTokens: 4096,
    displayName: "Qwen 3 0.6B",
    family: "qwen",
    id: "Qwen3-0.6B-q4f16_1-MLC",
    requiredFeatures: [],
    tier: "fallback",
    vramRequiredMB: 1403.34,
  },

  // Balanced tier: Default models balancing performance and resources
  {
    artifactHost: "https://huggingface.co/mlc-ai",
    contextWindowTokens: 4096,
    displayName: "Llama 3.2 1B Instruct",
    family: "llama",
    id: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
    requiredFeatures: [],
    tier: "balanced",
    vramRequiredMB: 879.04,
  },
  {
    artifactHost: "https://huggingface.co/mlc-ai",
    contextWindowTokens: 4096,
    displayName: "Gemma 2B Instruct",
    family: "gemma",
    id: "gemma-2b-it-q4f16_1-MLC",
    requiredFeatures: ["shader-f16"],
    tier: "balanced",
    vramRequiredMB: 1476.52,
  },

  // Quality tier: Larger models for capable devices
  {
    artifactHost: "https://huggingface.co/mlc-ai",
    contextWindowTokens: 4096,
    displayName: "Gemma 2 2B Instruct",
    family: "gemma",
    id: "gemma-2-2b-it-q4f16_1-MLC",
    requiredFeatures: ["shader-f16"],
    tier: "quality",
    vramRequiredMB: 1895.3,
  },
  {
    artifactHost: "https://huggingface.co/mlc-ai",
    contextWindowTokens: 4096,
    displayName: "Llama 3.2 3B Instruct",
    family: "llama",
    id: "Llama-3.2-3B-Instruct-q4f16_1-MLC",
    requiredFeatures: [],
    tier: "quality",
    vramRequiredMB: 2263.69,
  },
  {
    artifactHost: "https://huggingface.co/mlc-ai",
    contextWindowTokens: 4096,
    displayName: "Phi 3.5 Mini Instruct",
    family: "phi",
    id: "Phi-3.5-mini-instruct-q4f16_1-MLC",
    requiredFeatures: [],
    tier: "quality",
    vramRequiredMB: 3672.07,
  },

  // Experimental tier: Context-optimized variant
  {
    artifactHost: "https://huggingface.co/mlc-ai",
    contextWindowTokens: 1024,
    displayName: "Phi 3.5 Mini Instruct (1k context)",
    family: "phi",
    id: "Phi-3.5-mini-instruct-q4f16_1-MLC-1k",
    requiredFeatures: [],
    tier: "experimental",
    vramRequiredMB: 2520.07,
  },
] as const satisfies ReadonlyArray<LocalInvoiceAssistantModelMetadata>;

/**
 * Upgrade-gated model candidates.
 *
 * @remarks
 * These models are excluded from the selectable catalog until:
 * 1. WebLLM dependency is upgraded to a version exposing these model IDs
 * 2. Models are verified to load successfully in the target environment
 * 3. Model catalog tests are updated to confirm availability
 *
 * **Do not add these to `LOCAL_INVOICE_ASSISTANT_MODELS` until upgrade verification.**
 */
export const UPGRADE_GATED_MODEL_CANDIDATES = [
  {
    artifactHost: "https://huggingface.co/mlc-ai",
    contextWindowTokens: 8192,
    displayName: "Gemma 3 1B Instruct",
    family: "gemma",
    id: "gemma3-1b-it-q4f16_1-MLC",
    requiredFeatures: [],
    tier: "balanced",
    vramRequiredMB: 1536,
  },
  {
    artifactHost: "https://huggingface.co/mlc-ai",
    contextWindowTokens: 4096,
    displayName: "Qwen 3.5 0.8B",
    family: "qwen",
    id: "Qwen3.5-0.8B-q4f16_1-MLC",
    requiredFeatures: [],
    tier: "fallback",
    vramRequiredMB: 896,
  },
  {
    artifactHost: "https://huggingface.co/mlc-ai",
    contextWindowTokens: 4096,
    displayName: "Qwen 3.5 2B",
    family: "qwen",
    id: "Qwen3.5-2B-q4f16_1-MLC",
    requiredFeatures: [],
    tier: "balanced",
    vramRequiredMB: 2048,
  },
  {
    artifactHost: "https://huggingface.co/mlc-ai",
    contextWindowTokens: 16384,
    displayName: "Phi 4 Mini Instruct",
    family: "phi",
    id: "Phi-4-mini-instruct-q4f16_1-MLC",
    requiredFeatures: [],
    tier: "quality",
    vramRequiredMB: 4096,
  },
] as const satisfies ReadonlyArray<LocalInvoiceAssistantModelMetadata>;

/**
 * Default local invoice assistant model.
 *
 * @remarks
 * Llama 3.2 1B Instruct quantized to 4-bit (q4f16_1) for client-side inference.
 * ~1.5 GB download, targets WebGPU-capable browsers with 4+ GB device memory.
 * Balanced tier: good performance-to-resource ratio for most devices.
 *
 * @throws Error if Llama 3.2 1B is not found in catalog (catalog integrity violation)
 */
export const DEFAULT_LOCAL_INVOICE_ASSISTANT_MODEL = (() => {
  const defaultModel = LOCAL_INVOICE_ASSISTANT_MODELS.find((model) => model.id === "Llama-3.2-1B-Instruct-q4f16_1-MLC");
  if (!defaultModel) {
    throw new Error("Catalog integrity violation: Llama-3.2-1B-Instruct-q4f16_1-MLC must exist in LOCAL_INVOICE_ASSISTANT_MODELS");
  }
  return defaultModel;
})();

/**
 * GPU feature flags for model compatibility filtering.
 */
export type GpuFeatures = ReadonlyArray<string>;

/**
 * GPU resource limits for model selection.
 */
export type GpuLimits = Readonly<{
  /** Maximum VRAM available in megabytes. */
  maxVramMB: number;
}>;

/**
 * Input for hardware-aware model recommendation.
 */
export type RecommendLocalInvoiceAssistantModelInput = Readonly<{
  /** Optional GPU feature flags (e.g., shader-f16). */
  gpuFeatures?: GpuFeatures;
  /** Optional GPU resource limits. */
  gpuLimits?: GpuLimits;
  /** Hardware eligibility result from analyzeLocalAiHardwareEligibility. */
  hardwareResult: HardwareEligibilityResult;
}>;

/**
 * Recommends a local invoice assistant model based on hardware capabilities.
 *
 * @param input - Hardware eligibility result and optional GPU constraints.
 * @returns Recommended model metadata, or null if device is ineligible or no model fits.
 *
 * @remarks
 * **Recommendation logic:**
 * 1. Returns `null` if hardware status is `ineligible`
 * 2. Filters models by required GPU features (conservative: omitted `gpuFeatures` treated as empty set)
 * 3. Filters models by VRAM limits if provided
 * 4. Filters models by available storage (model size estimate: ~1.5× VRAM)
 * 5. Prefers balanced tier models for eligible/unknown hardware
 * 6. Falls back to smallest compatible model for constrained devices
 *
 * **GPU feature handling (conservative):**
 * Omitted `gpuFeatures` behaves like an empty feature set, filtering out all models
 * requiring any GPU features (e.g., shader-f16). Explicit `gpuFeatures: ["shader-f16"]`
 * must be provided to enable shader-f16 models.
 *
 * **Storage estimation:**
 * Model download size ≈ 1.5× VRAM requirement to account for weights + KV cache.
 *
 * **Future enhancement:**
 * - Accept benchmark history to prefer models with proven good performance
 * - Consider device thermal state for mobile devices
 *
 * @example
 * ```typescript
 * const hardwareResult = await analyzeLocalAiHardwareEligibility();
 * const model = recommendLocalInvoiceAssistantModel({hardwareResult});
 * if (model) {
 *   console.log(`Recommended: ${model.displayName}`);
 * }
 * ```
 */
export function recommendLocalInvoiceAssistantModel(
  input: RecommendLocalInvoiceAssistantModelInput,
): LocalInvoiceAssistantModelMetadata | null {
  const {hardwareResult, gpuFeatures, gpuLimits} = input;

  // Ineligible devices get no recommendation
  if (hardwareResult.status === "ineligible") {
    return null;
  }

  // Start with full catalog
  let candidates = [...LOCAL_INVOICE_ASSISTANT_MODELS];

  // Filter by GPU features (conservative: omitted features treated as empty set)
  const featureSet = new Set(gpuFeatures ?? []);
  candidates = candidates.filter((model) => model.requiredFeatures.every((feature) => featureSet.has(feature)));

  // Filter by VRAM limits if provided
  if (gpuLimits) {
    candidates = candidates.filter((model) => model.vramRequiredMB <= gpuLimits.maxVramMB);
  }

  // Filter by available storage (model size ≈ 1.5× VRAM)
  if (typeof hardwareResult.availableStorageBytes === "number") {
    const availableStorageMB = hardwareResult.availableStorageBytes / (1024 * 1024);
    candidates = candidates.filter((model) => {
      const estimatedDownloadSizeMB = model.vramRequiredMB * 1.5;
      return estimatedDownloadSizeMB <= availableStorageMB;
    });
  }

  // No compatible models found
  if (candidates.length === 0) {
    return null;
  }

  // For eligible or unknown hardware, prefer balanced tier
  const balancedModels = candidates.filter((model) => model.tier === "balanced");
  if (balancedModels.length > 0) {
    // Sort by VRAM (ascending) and return smallest balanced model
    // Llama 3.2 1B is the smallest balanced model (879 MB), so it's naturally preferred
    balancedModels.sort((a, b) => a.vramRequiredMB - b.vramRequiredMB);
    return balancedModels[0]!;
  }

  // Fall back to smallest compatible model
  candidates.sort((a, b) => a.vramRequiredMB - b.vramRequiredMB);
  return candidates[0]!;
}
