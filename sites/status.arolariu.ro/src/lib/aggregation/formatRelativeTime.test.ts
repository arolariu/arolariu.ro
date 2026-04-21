import {describe, it, expect} from "vitest";
import {formatRelativeTime} from "./formatRelativeTime";

// Deterministic fixed clock: 2026-04-19T14:00:00Z
const NOW = Date.parse("2026-04-19T14:00:00Z");

describe("formatRelativeTime", () => {
  it("returns empty string for undefined input", () => {
    expect(formatRelativeTime(undefined, NOW)).toBe("");
  });

  it("returns empty string for unparseable ISO", () => {
    expect(formatRelativeTime("not-a-date", NOW)).toBe("");
  });

  it("returns 'upcoming' for future timestamps", () => {
    const future = new Date(NOW + 5 * 60_000).toISOString();
    expect(formatRelativeTime(future, NOW)).toBe("upcoming");
  });

  it("returns 'just now' for < 1 min ago", () => {
    const recent = new Date(NOW - 30_000).toISOString();
    expect(formatRelativeTime(recent, NOW)).toBe("just now");
  });

  it("returns 'X min ago' for minutes", () => {
    const five = new Date(NOW - 5 * 60_000).toISOString();
    expect(formatRelativeTime(five, NOW)).toBe("5 min ago");
  });

  it("returns 'X h ago' at the hour boundary and above", () => {
    const ninety = new Date(NOW - 90 * 60_000).toISOString();
    expect(formatRelativeTime(ninety, NOW)).toBe("1 h ago");
  });

  it("returns 'X d ago' after 24 hours", () => {
    const twoDays = new Date(NOW - 48 * 60 * 60_000).toISOString();
    expect(formatRelativeTime(twoDays, NOW)).toBe("2 d ago");
  });

  it("floors fractional units rather than rounding", () => {
    // 59.9 min ago → still 59 min, not "1 h ago"
    const almostHour = new Date(NOW - (59 * 60_000 + 50_000)).toISOString();
    expect(formatRelativeTime(almostHour, NOW)).toBe("59 min ago");
  });
});
