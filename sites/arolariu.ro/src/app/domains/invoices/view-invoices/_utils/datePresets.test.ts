/**
 * @fileoverview Unit tests for the date-preset helpers.
 * @module sites/arolariu.ro/src/app/domains/invoices/view-invoices/_utils/datePresets.test
 */

import {describe, expect, it} from "vitest";
import {computePresetRange, deriveActivePreset} from "./datePresets";

const NOW = new Date("2026-05-21T12:00:00.000Z");

describe("computePresetRange", () => {
  it("'30d' returns today minus 30 days through today", () => {
    const range = computePresetRange("30d", NOW);
    expect(range.to).toBe("2026-05-21");
    expect(range.from).toBe("2026-04-21");
  });

  it("'90d' returns today minus 90 days through today", () => {
    const range = computePresetRange("90d", NOW);
    expect(range.to).toBe("2026-05-21");
    expect(range.from).toBe("2026-02-20");
  });

  it("'ytd' returns Jan 1 of this year through today", () => {
    const range = computePresetRange("ytd", NOW);
    expect(range.from).toBe("2026-01-01");
    expect(range.to).toBe("2026-05-21");
  });

  it("'ytd' on Jan 1 returns from === to", () => {
    const jan1 = new Date("2026-01-01T12:00:00.000Z");
    const range = computePresetRange("ytd", jan1);
    expect(range.from).toBe("2026-01-01");
    expect(range.to).toBe("2026-01-01");
  });

  it("'all' clears both from and to", () => {
    expect(computePresetRange("all", NOW)).toEqual({from: null, to: null});
  });
});

describe("deriveActivePreset", () => {
  it("returns null when both from and to are null", () => {
    expect(deriveActivePreset(null, null, NOW)).toBeNull();
  });

  it("returns '30d' when from/to exactly match the 30d range", () => {
    expect(deriveActivePreset("2026-04-21", "2026-05-21", NOW)).toBe("30d");
  });

  it("returns '90d' when from/to exactly match the 90d range", () => {
    expect(deriveActivePreset("2026-02-20", "2026-05-21", NOW)).toBe("90d");
  });

  it("returns 'ytd' when from/to exactly match the YTD range", () => {
    expect(deriveActivePreset("2026-01-01", "2026-05-21", NOW)).toBe("ytd");
  });

  it("returns 'custom' when from/to are set but match no preset", () => {
    expect(deriveActivePreset("2025-12-01", "2026-05-21", NOW)).toBe("custom");
  });

  it("returns 'custom' when only from is set", () => {
    expect(deriveActivePreset("2025-12-01", null, NOW)).toBe("custom");
  });

  it("returns 'custom' when only to is set", () => {
    expect(deriveActivePreset(null, "2026-05-21", NOW)).toBe("custom");
  });
});
