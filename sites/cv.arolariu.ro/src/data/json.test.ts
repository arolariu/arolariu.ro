import {describe, expect, it} from "vitest";

import {certificationsAsArray} from "./certifications";
import {experiencesAsArray} from "./experiences";
import {jsonCVData} from "./json";

describe("json.ts data integrity", () => {
  it("work[] length matches experiencesAsArray (no drift between /json and /human)", () => {
    expect(jsonCVData.work?.length).toBe(experiencesAsArray.length);
  });

  it("certificates[] length matches certificationsAsArray (no drift between /json and /human)", () => {
    expect(jsonCVData.certificates?.length).toBe(certificationsAsArray.length);
  });

  it("references[] is derived from testimonials and is non-empty", () => {
    expect(jsonCVData.references).toBeDefined();
    expect((jsonCVData.references ?? []).length).toBeGreaterThan(0);
  });

  it("every work entry has required JSON Resume fields", () => {
    for (const w of jsonCVData.work ?? []) {
      expect(w.name).toBeTypeOf("string");
      expect(w.position).toBeTypeOf("string");
      expect(w.startDate).toBeTypeOf("string");
      expect(w.summary).toBeTypeOf("string");
    }
  });
});
