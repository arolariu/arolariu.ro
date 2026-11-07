import {describe, expect, it} from "vitest";
import {payloadSchemaFor} from "./payloads.ts";

describe("provider payload decoders", () => {
  it("validates format lists/counts and numeric lint counters", () => {
    expect(payloadSchemaFor("format").parse({unformattedCount: 1, unformattedFiles: ["a.ts"], extra: true})).toEqual({
      unformattedCount: 1,
      unformattedFiles: ["a.ts"],
    });
    expect(() => payloadSchemaFor("format").parse({unformattedCount: 0, unformattedFiles: ["a.ts"]})).toThrow();
    expect(() => payloadSchemaFor("lint").parse({errorCount: Number.NaN, warningCount: 0, filesChecked: 1})).toThrow();
  });
  it("validates statistics arrays/measurements rather than trusting own-emitted JSON", () => {
    const valid = {
      filesChanged: 1,
      linesAdded: 2,
      linesDeleted: 3,
      topExtensions: [{extension: "ts", count: 1}],
      topDirectories: [{directory: "src", count: 1}],
      bundleSizes: [{folder: "src", mainTotal: 4, headTotal: 5}],
    };
    expect(payloadSchemaFor("stats").parse(valid)).toEqual(valid);
    expect(() => payloadSchemaFor("stats").parse({...valid, bundleSizes: [{folder: "src", mainTotal: -1, headTotal: 0}]})).toThrow();
    expect(() => payloadSchemaFor("test-typescript").parse({totalTests: 0, passed: 0, failed: 0, skipped: 0, suites: [{}]})).toThrow();
  });
});
