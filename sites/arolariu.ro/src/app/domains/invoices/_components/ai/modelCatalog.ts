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
 * 2. Balanced: Default tier (Llama 3.2 1B, Gemma 3 1B)
 * 3. Quality: Larger models for capable hardware
 * 4. Experimental: Bleeding-edge models requiring validation
 *
 * **Upgrade-gated models (not included until WebLLM upgrade):**
 * - `Qwen3.5-0.8B-q4f16_1-MLC`
 * - `Qwen3.5-2B-q4f16_1-MLC`
 * - `Phi-4-mini-instruct-q4f16_1-MLC`
 *
 * All models use q4f16_1 quantization for browser feasibility.
 * Model IDs must match WebLLM prebuilt model registry.
 */
export const LOCAL_INVOICE_ASSISTANT_MODELS = [
  // Fallback tier: Smallest models for constrained devices
  {
    artifactHost: "https://huggingface.co/mlc-ai",
    contextWindowTokens: 2048,
    displayName: "SmolLM2 360M Instruct",
    family: "smollm",
    id: "SmolLM2-360M-Instruct-q4f16_1-MLC",
    requiredFeatures: [],
    tier: "fallback",
    vramRequiredMB: 512,
  },
  {
    artifactHost: "https://huggingface.co/mlc-ai",
    contextWindowTokens: 4096,
    displayName: "Qwen 3 0.6B",
    family: "qwen",
    id: "Qwen3-0.6B-q4f16_1-MLC",
    requiredFeatures: [],
    tier: "fallback",
    vramRequiredMB: 768,
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
    vramRequiredMB: 1536,
  },
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

  // Quality tier: Larger models for capable devices
  {
    artifactHost: "https://huggingface.co/mlc-ai",
    contextWindowTokens: 8192,
    displayName: "Gemma 2 2B Instruct",
    family: "gemma",
    id: "gemma-2-2b-it-q4f16_1-MLC",
    requiredFeatures: [],
    tier: "quality",
    vramRequiredMB: 2048,
  },
  {
    artifactHost: "https://huggingface.co/mlc-ai",
    contextWindowTokens: 4096,
    displayName: "Llama 3.2 3B Instruct",
    family: "llama",
    id: "Llama-3.2-3B-Instruct-q4f16_1-MLC",
    requiredFeatures: [],
    tier: "quality",
    vramRequiredMB: 3072,
  },
  {
    artifactHost: "https://huggingface.co/mlc-ai",
    contextWindowTokens: 128000,
    displayName: "Phi 3.5 Mini Instruct",
    family: "phi",
    id: "Phi-3.5-mini-instruct-q4f16_1-MLC",
    requiredFeatures: [],
    tier: "quality",
    vramRequiredMB: 4096,
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
 */
export const DEFAULT_LOCAL_INVOICE_ASSISTANT_MODEL = LOCAL_INVOICE_ASSISTANT_MODELS.find(
  (model) => model.id === "Llama-3.2-1B-Instruct-q4f16_1-MLC",
)!;

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
 * 2. Filters models by required GPU features (e.g., shader-f16)
 * 3. Filters models by VRAM limits if provided
 * 4. Filters models by available storage (model size estimate: ~1.5× VRAM)
 * 5. Prefers balanced tier models for eligible/unknown hardware
 * 6. Falls back to smallest compatible model for constrained devices
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

  // Filter by GPU features if provided
  if (gpuFeatures) {
    const featureSet = new Set(gpuFeatures);
    candidates = candidates.filter((model) => model.requiredFeatures.every((feature) => featureSet.has(feature)));
  }

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
    // Return Llama 3.2 1B if available, otherwise first balanced model
    return balancedModels.find((model) => model.id === "Llama-3.2-1B-Instruct-q4f16_1-MLC") ?? balancedModels[0]!;
  }

  // Fall back to smallest compatible model
  candidates.sort((a, b) => a.vramRequiredMB - b.vramRequiredMB);
  return candidates[0]!;
}
