import {describe, expect, it} from "vitest";
import {ClassificationSystem} from "@/types/invoices";
import {searchClassifications} from "./searchClassifications";

describe("searchClassifications", () => {
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
