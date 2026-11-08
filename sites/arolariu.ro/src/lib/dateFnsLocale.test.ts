import {enUS, fr, ro} from "date-fns/locale";
import {describe, expect, it} from "vitest";
import {getDateFnsLocale} from "./dateFnsLocale";

describe("getDateFnsLocale", () => {
  it.each([
    ["en", enUS],
    ["ro", ro],
    ["fr", fr],
  ])("maps %s to its date-fns locale", (code, expected) => {
    // Arrange / Act
    const result = getDateFnsLocale(code);

    // Assert
    expect(result).toBe(expected);
  });

  it("falls back to enUS for an unsupported locale", () => {
    // Arrange / Act
    const result = getDateFnsLocale("de");

    // Assert
    expect(result).toBe(enUS);
  });
});
