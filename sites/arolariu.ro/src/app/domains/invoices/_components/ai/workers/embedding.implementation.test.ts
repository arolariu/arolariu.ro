import {describe, expect, it, vi} from "vitest";

const {mockedExtractor} = vi.hoisted(() => ({
  mockedExtractor: vi.fn(async (text: string, _opts?: unknown) => {
    if (text.includes("how much")) return {data: new Float32Array([0.99, 0.01, 0])};
    if (text.includes("which stores")) return {data: new Float32Array([0.01, 0.99, 0])};
    return {data: new Float32Array([0.33, 0.33, 0.33])};
  }),
}));

vi.mock("./seedEmbeddings.json", () => ({
  default: [
    {locale: "en", intent: "totalSpend", phrase: "how much", embedding: [1, 0, 0]},
    {locale: "en", intent: "topMerchantsByCount", phrase: "which stores", embedding: [0, 1, 0]},
  ],
}));

vi.mock("@xenova/transformers", () => ({
  pipeline: vi.fn(async () => mockedExtractor),
}));

const {createEmbeddingImpl} = await import("./embedding.implementation");

describe("createEmbeddingImpl", () => {
  it("requires ensureLoaded before classify", async () => {
    const impl = createEmbeddingImpl();
    // Reset the module-level extractor for this test by re-importing isn't trivial;
    // instead this test relies on a fresh module state OR previous tests not having
    // succeeded. Since ensureLoaded is idempotent and module state persists, we
    // verify that a fresh impl that hasn't loaded yet rejects.
    // To guarantee a clean state, this test runs first AND nothing else has loaded.
    await expect(impl.classify({question: "x", locale: "en"})).rejects.toThrow("not loaded");
  });

  it("classifies 'how much' to totalSpend", async () => {
    const impl = createEmbeddingImpl();
    await impl.ensureLoaded();
    const out = await impl.classify({question: "how much did I spend", locale: "en"});
    expect(out.topIntent).toBe("totalSpend");
    expect(out.topScore).toBeGreaterThan(0.9);
  });

  it("classifies 'which stores' to topMerchantsByCount", async () => {
    const impl = createEmbeddingImpl();
    await impl.ensureLoaded();
    const out = await impl.classify({question: "which stores I shop at", locale: "en"});
    expect(out.topIntent).toBe("topMerchantsByCount");
  });
});