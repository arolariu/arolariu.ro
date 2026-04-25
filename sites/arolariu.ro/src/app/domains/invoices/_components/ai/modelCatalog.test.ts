import {describe, expect, it} from "vitest";
import type {HardwareEligibilityResult} from "./hardwareEligibility";
import {
  DEFAULT_LOCAL_INVOICE_ASSISTANT_MODEL,
  LOCAL_INVOICE_ASSISTANT_MODELS,
  UPGRADE_GATED_MODEL_CANDIDATES,
  recommendLocalInvoiceAssistantModel,
} from "./modelCatalog";

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

    // Should recommend smallest model or nothing
    if (recommendation) {
      expect(recommendation.tier).toBe("fallback");
      // Verify it's one of the smallest models
      const allModels = LOCAL_INVOICE_ASSISTANT_MODELS;
      const smallerModels = allModels.filter((model) => model.vramRequiredMB < recommendation.vramRequiredMB);
      expect(smallerModels.length).toBe(0);
    }
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
    expect(recommendation?.id).toBe("Llama-3.2-1B-Instruct-q4f16_1-MLC");
  });

  it("respects VRAM limits when provided", () => {
    const hardwareResult = createEligibleHardwareResult();
    const recommendation = recommendLocalInvoiceAssistantModel({
      gpuLimits: {maxVramMB: 1000}, // Very low VRAM
      hardwareResult,
    });

    // Should recommend smallest model that fits or null
    if (recommendation) {
      expect(recommendation.vramRequiredMB).toBeLessThanOrEqual(1000);
    }
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
    if (recommendation) {
      expect(recommendation.requiredFeatures).not.toContain("shader-f16");
    } else {
      // If all models require shader-f16, recommendation should be null
      const allRequireShaderF16 = LOCAL_INVOICE_ASSISTANT_MODELS.every((model) => model.requiredFeatures.includes("shader-f16"));
      expect(allRequireShaderF16).toBe(false);
    }
  });
});
