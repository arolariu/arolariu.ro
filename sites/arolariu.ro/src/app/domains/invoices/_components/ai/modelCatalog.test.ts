import {readFileSync} from "node:fs";
import {describe, expect, it} from "vitest";
import type {HardwareEligibilityResult} from "./hardwareEligibility";
import {
  DEFAULT_LOCAL_INVOICE_ASSISTANT_MODEL,
  LOCAL_INVOICE_ASSISTANT_MODELS,
  UPGRADE_GATED_MODEL_CANDIDATES,
  recommendLocalInvoiceAssistantModel,
} from "./modelCatalog";

/**
 * WebLLM 0.2.82 verified model metadata from installed package registry.
 *
 * @remarks
 * These values are from the installed @mlc-ai/web-llm@0.2.82 prebuiltAppConfig.
 * Any deviation in the catalog is a metadata correctness bug.
 */
const WEBLLM_0_2_82_REGISTRY_METADATA = {
  "Llama-3.2-1B-Instruct-q4f16_1-MLC": {contextWindow: 4096, requiredFeatures: [], vramMB: 879.04},
  "Llama-3.2-3B-Instruct-q4f16_1-MLC": {contextWindow: 4096, requiredFeatures: [], vramMB: 2263.69},
  "Phi-3.5-mini-instruct-q4f16_1-MLC": {contextWindow: 4096, requiredFeatures: [], vramMB: 3672.07},
  "Phi-3.5-mini-instruct-q4f16_1-MLC-1k": {contextWindow: 1024, requiredFeatures: [], vramMB: 2520.07},
  "Qwen3-0.6B-q4f16_1-MLC": {contextWindow: 4096, requiredFeatures: [], vramMB: 1403.34},
  "SmolLM2-360M-Instruct-q4f16_1-MLC": {contextWindow: 4096, requiredFeatures: ["shader-f16"], vramMB: 376.06},
  "gemma-2-2b-it-q4f16_1-MLC": {contextWindow: 4096, requiredFeatures: ["shader-f16"], vramMB: 1895.3},
  "gemma-2b-it-q4f16_1-MLC": {contextWindow: 4096, requiredFeatures: ["shader-f16"], vramMB: 1476.52},
} as const;

/**
 * WebLLM 0.2.82 verified model ID allowlist.
 *
 * @remarks
 * Only these IDs are confirmed to exist in the pinned @mlc-ai/web-llm@0.2.82.
 * Any model ID not in this list must be upgrade-gated or removed.
 */
const WEBLLM_0_2_82_VERIFIED_IDS = Object.keys(WEBLLM_0_2_82_REGISTRY_METADATA) as ReadonlyArray<
  keyof typeof WEBLLM_0_2_82_REGISTRY_METADATA
>;

/**
 * Helper to read installed @mlc-ai/web-llm package bundle text.
 *
 * @remarks
 * Direct prebuiltAppConfig import may fail under Node due to browser globals.
 * Instead, we resolve the package path and read the bundle as text to verify
 * model IDs are present. This catches dependency drift when WebLLM is upgraded.
 */
function getInstalledWebLlmBundleText(): string {
  try {
    // Resolve the installed package entry point
    const webLlmPath = require.resolve("@mlc-ai/web-llm");
    // Read the bundle text
    return readFileSync(webLlmPath, "utf-8");
  } catch (error) {
    throw new Error(`Failed to read installed @mlc-ai/web-llm package: ${error}`);
  }
}

describe("LOCAL_INVOICE_ASSISTANT_MODELS", () => {
  it("exports a non-empty catalog of models", () => {
    expect(LOCAL_INVOICE_ASSISTANT_MODELS).toBeDefined();
    expect(LOCAL_INVOICE_ASSISTANT_MODELS.length).toBeGreaterThan(0);
  });

  it("includes Llama 3.2 1B as the default model", () => {
    const llama32 = LOCAL_INVOICE_ASSISTANT_MODELS.find((model) => model.id === "Llama-3.2-1B-Instruct-q4f16_1-MLC");
    expect(llama32).toBeDefined();
    expect(llama32?.displayName).toBe("Llama 3.2 1B Instruct");
    expect(llama32?.family).toBe("llama");
  });

  it("includes multiple model families in the catalog", () => {
    const families = new Set(LOCAL_INVOICE_ASSISTANT_MODELS.map((model) => model.family));
    expect(families.size).toBeGreaterThan(1);
    expect(families).toContain("llama");
    expect(families).toContain("gemma");
  });

  it("includes tier metadata for all models", () => {
    for (const model of LOCAL_INVOICE_ASSISTANT_MODELS) {
      expect(model.tier).toBeDefined();
      expect(["fallback", "balanced", "quality", "experimental"]).toContain(model.tier);
    }
  });

  it("includes vramRequiredMB for all models", () => {
    for (const model of LOCAL_INVOICE_ASSISTANT_MODELS) {
      expect(typeof model.vramRequiredMB).toBe("number");
      expect(model.vramRequiredMB).toBeGreaterThan(0);
    }
  });

  it("does not include Qwen 3.5 models in the selectable catalog", () => {
    const qwen35Models = LOCAL_INVOICE_ASSISTANT_MODELS.filter((model) => model.id.includes("Qwen3.5"));
    expect(qwen35Models).toHaveLength(0);
  });

  it("does not include Phi 4 Mini in the selectable catalog", () => {
    const phi4Models = LOCAL_INVOICE_ASSISTANT_MODELS.filter((model) => model.id.includes("Phi-4"));
    expect(phi4Models).toHaveLength(0);
  });

  it("does not include Gemma 4 models in the selectable catalog", () => {
    const gemma4Models = LOCAL_INVOICE_ASSISTANT_MODELS.filter((model) => model.id.includes("gemma-4") || model.id.includes("gemma4"));
    expect(gemma4Models).toHaveLength(0);
  });

  it("includes models with shader-f16 feature requirements", () => {
    const shader16Models = LOCAL_INVOICE_ASSISTANT_MODELS.filter((model) => model.requiredFeatures.includes("shader-f16"));
    // At least SmolLM2 360M and Gemma 2 2B should require shader-f16
    expect(shader16Models.length).toBeGreaterThan(0);
    const smolLm2 = shader16Models.find((model) => model.id === "SmolLM2-360M-Instruct-q4f16_1-MLC");
    expect(smolLm2).toBeDefined();
    const gemma2 = shader16Models.find((model) => model.id === "gemma-2-2b-it-q4f16_1-MLC");
    expect(gemma2).toBeDefined();
  });

  it("contains only WebLLM 0.2.82 verified model IDs", () => {
    const allowedIds = new Set(WEBLLM_0_2_82_VERIFIED_IDS);
    for (const model of LOCAL_INVOICE_ASSISTANT_MODELS) {
      expect(allowedIds.has(model.id as (typeof WEBLLM_0_2_82_VERIFIED_IDS)[number])).toBe(true);
    }
  });

  it("matches WebLLM 0.2.82 registry metadata exactly", () => {
    for (const model of LOCAL_INVOICE_ASSISTANT_MODELS) {
      const registryMetadata = WEBLLM_0_2_82_REGISTRY_METADATA[model.id as keyof typeof WEBLLM_0_2_82_REGISTRY_METADATA];
      expect(registryMetadata).toBeDefined();
      expect(model.vramRequiredMB).toBe(registryMetadata.vramMB);
      expect(model.contextWindowTokens).toBe(registryMetadata.contextWindow);
      expect(model.requiredFeatures).toEqual(registryMetadata.requiredFeatures);
    }
  });

  it("does not include Gemma 3 1B in the selectable catalog", () => {
    const gemma3Models = LOCAL_INVOICE_ASSISTANT_MODELS.filter((model) => model.id === "gemma3-1b-it-q4f16_1-MLC");
    expect(gemma3Models).toHaveLength(0);
  });

  it("only references models present in installed @mlc-ai/web-llm package bundle", () => {
    const bundleText = getInstalledWebLlmBundleText();

    // All selectable models MUST appear in the installed package
    LOCAL_INVOICE_ASSISTANT_MODELS.forEach((model) => {
      expect(bundleText, `Selectable model ${model.id} not found in @mlc-ai/web-llm bundle`).toContain(model.id);
    });

    // Upgrade-gated models expected to be absent SHOULD NOT appear
    // (this catches accidental downgrade where upgrade-gated models become available)
    const upgradeGatedIdsNotInRegistry = UPGRADE_GATED_MODEL_CANDIDATES.filter(
      (candidate) => !WEBLLM_0_2_82_VERIFIED_IDS.includes(candidate.id as never),
    ).map((candidate) => candidate.id);

    upgradeGatedIdsNotInRegistry.forEach((modelId) => {
      expect(bundleText, `Upgrade-gated model ${modelId} unexpectedly found in bundle`).not.toContain(modelId);
    });
  });
});

describe("UPGRADE_GATED_MODEL_CANDIDATES", () => {
  it("exports upgrade-gated candidates as typed records", () => {
    expect(UPGRADE_GATED_MODEL_CANDIDATES).toBeDefined();
    expect(Array.isArray(UPGRADE_GATED_MODEL_CANDIDATES)).toBe(true);
  });

  it("includes Qwen 3.5 models as upgrade-gated candidates", () => {
    const qwen35Models = UPGRADE_GATED_MODEL_CANDIDATES.filter((model) => model.id.includes("Qwen3.5"));
    expect(qwen35Models.length).toBeGreaterThan(0);
  });

  it("includes Phi 4 Mini as upgrade-gated candidate", () => {
    const phi4Models = UPGRADE_GATED_MODEL_CANDIDATES.filter((model) => model.id.includes("Phi-4"));
    expect(phi4Models.length).toBeGreaterThan(0);
  });

  it("includes Gemma 3 1B as upgrade-gated candidate", () => {
    const gemma3Models = UPGRADE_GATED_MODEL_CANDIDATES.filter((model) => model.id === "gemma3-1b-it-q4f16_1-MLC");
    expect(gemma3Models.length).toBeGreaterThan(0);
  });

  it("ensures upgrade-gated candidates are not in selectable catalog", () => {
    const selectableIds = new Set(LOCAL_INVOICE_ASSISTANT_MODELS.map((model) => model.id));
    for (const candidate of UPGRADE_GATED_MODEL_CANDIDATES) {
      expect(selectableIds.has(candidate.id)).toBe(false);
    }
  });
});

describe("DEFAULT_LOCAL_INVOICE_ASSISTANT_MODEL", () => {
  it("is Llama 3.2 1B Instruct", () => {
    expect(DEFAULT_LOCAL_INVOICE_ASSISTANT_MODEL.id).toBe("Llama-3.2-1B-Instruct-q4f16_1-MLC");
    expect(DEFAULT_LOCAL_INVOICE_ASSISTANT_MODEL.displayName).toBe("Llama 3.2 1B Instruct");
    expect(DEFAULT_LOCAL_INVOICE_ASSISTANT_MODEL.family).toBe("llama");
    expect(DEFAULT_LOCAL_INVOICE_ASSISTANT_MODEL.tier).toBe("balanced");
  });

  it("has required metadata fields", () => {
    expect(DEFAULT_LOCAL_INVOICE_ASSISTANT_MODEL.artifactHost).toBe("https://huggingface.co/mlc-ai");
    expect(DEFAULT_LOCAL_INVOICE_ASSISTANT_MODEL.contextWindowTokens).toBe(4096);
    expect(DEFAULT_LOCAL_INVOICE_ASSISTANT_MODEL.vramRequiredMB).toBeGreaterThan(0);
    expect(DEFAULT_LOCAL_INVOICE_ASSISTANT_MODEL.requiredFeatures).toBeDefined();
  });
});

describe("recommendLocalInvoiceAssistantModel", () => {
  const createEligibleHardwareResult = (): HardwareEligibilityResult => ({
    availableStorageBytes: 10 * 1024 ** 3, // 10 GiB
    reasons: [],
    requirements: {
      minimumAvailableStorageBytes: 6 * 1024 ** 3,
      minimumDeviceMemoryGB: 4,
      minimumLogicalCores: 4,
    },
    status: "eligible",
  });

  it("returns Llama 3.2 1B for an eligible device with no benchmark history", () => {
    const hardwareResult = createEligibleHardwareResult();
    const recommendation = recommendLocalInvoiceAssistantModel({hardwareResult});

    expect(recommendation).toBeDefined();
    expect(recommendation?.id).toBe("Llama-3.2-1B-Instruct-q4f16_1-MLC");
  });

  it("does not recommend shader-f16 models when GPU features exclude shader-f16", () => {
    const hardwareResult = createEligibleHardwareResult();
    const recommendation = recommendLocalInvoiceAssistantModel({
      gpuFeatures: [],
      hardwareResult,
    });

    expect(recommendation).toBeDefined();
    // Verify that if the recommendation exists, it doesn't require shader-f16
    if (recommendation) {
      expect(recommendation.requiredFeatures).not.toContain("shader-f16");
    }
  });

  it("recommends shader-f16 models when GPU features include shader-f16", () => {
    const hardwareResult = createEligibleHardwareResult();
    const recommendation = recommendLocalInvoiceAssistantModel({
      gpuFeatures: ["shader-f16"],
      hardwareResult,
    });

    expect(recommendation).toBeDefined();
  });

  it("returns smallest fallback for low-storage devices", () => {
    const hardwareResult: HardwareEligibilityResult = {
      availableStorageBytes: 2 * 1024 ** 3, // 2 GiB only
      reasons: [],
      requirements: {
        minimumAvailableStorageBytes: 1 * 1024 ** 3,
        minimumDeviceMemoryGB: 4,
        minimumLogicalCores: 4,
      },
      status: "eligible",
    };

    const recommendation = recommendLocalInvoiceAssistantModel({hardwareResult});

    // Conservative (no shader-f16): Llama 3.2 1B (879 MB * 1.5 = 1318.5 MB, fits in 2 GiB)
    expect(recommendation).not.toBeNull();
    expect(recommendation?.id).toBe("Llama-3.2-1B-Instruct-q4f16_1-MLC");
    expect(recommendation?.requiredFeatures).not.toContain("shader-f16");
  });

  it("returns null for ineligible devices", () => {
    const hardwareResult: HardwareEligibilityResult = {
      reasons: ["webgpu-unavailable"],
      requirements: {
        minimumAvailableStorageBytes: 6 * 1024 ** 3,
        minimumDeviceMemoryGB: 4,
        minimumLogicalCores: 4,
      },
      status: "ineligible",
    };

    const recommendation = recommendLocalInvoiceAssistantModel({hardwareResult});
    expect(recommendation).toBeNull();
  });

  it("returns a recommendation for unknown hardware with storage available", () => {
    const hardwareResult: HardwareEligibilityResult = {
      availableStorageBytes: 8 * 1024 ** 3,
      reasons: ["memory-unknown", "cpu-unknown"],
      requirements: {
        minimumAvailableStorageBytes: 6 * 1024 ** 3,
        minimumDeviceMemoryGB: 4,
        minimumLogicalCores: 4,
      },
      status: "unknown",
    };

    const recommendation = recommendLocalInvoiceAssistantModel({hardwareResult});
    expect(recommendation).toBeDefined();
    // Conservative: no shader-f16 when features omitted
    expect(recommendation?.requiredFeatures).not.toContain("shader-f16");
    expect(recommendation?.id).toBe("Llama-3.2-1B-Instruct-q4f16_1-MLC");
  });

  it("respects VRAM limits when provided", () => {
    const hardwareResult = createEligibleHardwareResult();
    const recommendation = recommendLocalInvoiceAssistantModel({
      gpuLimits: {maxVramMB: 1000}, // Llama 3.2 1B (879 MB) fits, Qwen 3 0.6B (1403 MB) does not
      hardwareResult,
    });

    // Should recommend Llama 3.2 1B as largest that fits under 1000 MB VRAM
    expect(recommendation).not.toBeNull();
    expect(recommendation?.vramRequiredMB).toBeLessThanOrEqual(1000);
    expect(recommendation?.id).toBe("Llama-3.2-1B-Instruct-q4f16_1-MLC");
  });

  it("returns null when hardware is eligible but no model satisfies all constraints", () => {
    const hardwareResult = createEligibleHardwareResult();
    const recommendation = recommendLocalInvoiceAssistantModel({
      gpuFeatures: [], // No GPU features, so shader-f16 models excluded
      gpuLimits: {maxVramMB: 100}, // Impossibly low VRAM
      hardwareResult: {
        ...hardwareResult,
        availableStorageBytes: 100 * 1024 * 1024, // Only 100 MB storage
      },
    });

    expect(recommendation).toBeNull();
  });

  it("filters out shader-f16 models when GPU features do not include shader-f16", () => {
    const hardwareResult = createEligibleHardwareResult();
    const recommendation = recommendLocalInvoiceAssistantModel({
      gpuFeatures: [], // No shader-f16
      hardwareResult,
    });

    // Should not recommend a model that requires shader-f16
    expect(recommendation).not.toBeNull();
    expect(recommendation?.requiredFeatures).not.toContain("shader-f16");
  });

  it("treats omitted gpuFeatures as conservative (no shader-f16)", () => {
    const hardwareResult = createEligibleHardwareResult();
    const recommendation = recommendLocalInvoiceAssistantModel({
      // Omitted gpuFeatures
      hardwareResult,
    });

    // Conservative: no shader-f16
    expect(recommendation).not.toBeNull();
    expect(recommendation?.requiredFeatures).not.toContain("shader-f16");
  });

  it("handles omitted gpuLimits parameter (no VRAM filtering)", () => {
    const hardwareResult = createEligibleHardwareResult();
    const recommendation = recommendLocalInvoiceAssistantModel({
      gpuFeatures: [], // No shader-f16
      // Omitted gpuLimits - no VRAM filtering
      hardwareResult,
    });

    // Should recommend balanced model without VRAM constraints
    expect(recommendation).not.toBeNull();
    expect(recommendation?.tier).toBe("balanced");
  });

  it("handles omitted availableStorageBytes gracefully", () => {
    const hardwareResult: HardwareEligibilityResult = {
      // No availableStorageBytes
      reasons: [],
      requirements: {
        minimumAvailableStorageBytes: 6 * 1024 ** 3,
        minimumDeviceMemoryGB: 4,
        minimumLogicalCores: 4,
      },
      status: "eligible",
    };

    const recommendation = recommendLocalInvoiceAssistantModel({hardwareResult});
    expect(recommendation).not.toBeNull();
  });

  it("recommends SmolLM2 when balanced models filtered by VRAM with shader-f16", () => {
    const hardwareResult = createEligibleHardwareResult();
    const recommendation = recommendLocalInvoiceAssistantModel({
      gpuFeatures: ["shader-f16"],
      gpuLimits: {maxVramMB: 850}, // Filters out Llama 3.2 1B (879 MB), Gemma (1476 MB), keeps SmolLM2 (376 MB)
      hardwareResult,
    });

    // No balanced models fit, fallback to SmolLM2
    expect(recommendation).not.toBeNull();
    expect(recommendation?.id).toBe("SmolLM2-360M-Instruct-q4f16_1-MLC");
    expect(recommendation?.tier).toBe("fallback");
  });
});
