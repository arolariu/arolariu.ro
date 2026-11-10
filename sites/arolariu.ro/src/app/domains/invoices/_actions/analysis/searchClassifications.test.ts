import {addSpanEvent} from "@/instrumentation.server";
import {TaxonomySearchValidationError} from "@/lib/taxonomies/taxonomyCatalog.server";
import {describe, expect, it, vi} from "vitest";
import {ClassificationSystem} from "@/types/invoices";
import {searchClassifications} from "./searchClassifications";

describe("searchClassifications", () => {
  it("defensive invariant: maps a TaxonomySearchValidationError raised inside the try to a VALIDATION_ERROR", async () => {
    vi.mocked(addSpanEvent).mockImplementationOnce(() => {
      throw new TaxonomySearchValidationError("Safe validation message.");
    });

    const result = await searchClassifications({system: ClassificationSystem.Nace21, query: "47.11"});

    expect(result).toStrictEqual({success: false, error: {code: "VALIDATION_ERROR", message: "Safe validation message."}});
  });

  it("defensive invariant: converts an unexpected error raised inside the try into a server error result", async () => {
    vi.mocked(addSpanEvent).mockImplementationOnce(() => {
      throw new Error("telemetry exploded");
    });

    const result = await searchClassifications({system: ClassificationSystem.Nace21, query: "47.11"});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).not.toBe("VALIDATION_ERROR");
      expect(result.error.message).toContain("telemetry exploded");
    }
  });

  it("returns a validation error for invalid input", async () => {
    await expect(searchClassifications({system: "invalid", query: "food"})).resolves.toMatchObject({
      success: false,
      error: {code: "VALIDATION_ERROR"},
    });
  });

  it("returns bounded canonical results for valid input", async () => {
    const result = await searchClassifications({
      system: ClassificationSystem.Nace21,
      query: "47.11",
      limit: 5,
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data[0]?.code).toBe("47.11");
  });
});
