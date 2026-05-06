import {describe, expect, it, vi} from "vitest";

const {mockReply} = vi.hoisted(() => ({
  mockReply: vi.fn(),
}));

vi.mock("@mlc-ai/web-llm", () => {
  class MockMLCEngine {
    public chat = {
      completions: {
        create: vi.fn(async () => mockReply()),
      },
    };
    public async reload(_id: string): Promise<void> {
      return;
    }
    public async unload(): Promise<void> {
      return;
    }
  }
  return {MLCEngine: MockMLCEngine};
});

const {createSlotExtractorImpl} = await import("./slotExtractor.implementation");

describe("createSlotExtractorImpl", () => {
  it("rejects extract before ensureLoaded", async () => {
    const impl = createSlotExtractorImpl();
    await impl.unload(); // ensure clean state across tests
    await expect(impl.extract({question: "x", locale: "en", candidateIntents: ["totalSpend"]})).rejects.toThrow("not loaded");
  });

  it("returns parsed JSON when model returns valid JSON within candidate set", async () => {
    mockReply.mockResolvedValueOnce({
      choices: [{message: {content: JSON.stringify({intent: "totalSpend", slots: {timeframe: "last-month"}, confidence: 0.9})}}],
    });
    const impl = createSlotExtractorImpl();
    await impl.ensureLoaded();
    const out = await impl.extract({question: "how much last month?", locale: "en", candidateIntents: ["totalSpend"]});
    expect(out.intent).toBe("totalSpend");
    expect(out.slots).toEqual({timeframe: "last-month"});
  });

  it("rejects when model returns intent not in candidate list", async () => {
    mockReply.mockResolvedValueOnce({
      choices: [{message: {content: JSON.stringify({intent: "hallucinatedIntent", slots: {}, confidence: 0.9})}}],
    });
    const impl = createSlotExtractorImpl();
    await impl.ensureLoaded();
    await expect(impl.extract({question: "x", locale: "en", candidateIntents: ["totalSpend"]})).rejects.toThrow("not in candidates");
  });

  it("rejects when model returns invalid JSON", async () => {
    mockReply.mockResolvedValueOnce({
      choices: [{message: {content: "this is not JSON at all {"}}],
    });
    const impl = createSlotExtractorImpl();
    await impl.ensureLoaded();
    await expect(impl.extract({question: "x", locale: "en", candidateIntents: ["totalSpend"]})).rejects.toThrow("invalid JSON");
  });
});