import {enUS, fr, ro} from "@arolariu/components/calendar-locales";
import {describe, expect, it} from "vitest";
import {getCalendarLocale} from "./calendarLocale";

describe("getCalendarLocale", () => {
  it.each([
    ["en", enUS],
    ["ro", ro],
    ["fr", fr],
  ])("maps %s to its Calendar locale", (code, expected) => {
    // Arrange / Act
    const result = getCalendarLocale(code);

    // Assert
    expect(result).toBe(expected);
  });

  it.each([
    ["ro", "Mergi la luna următoare"],
    ["fr", "Aller au mois suivant"],
  ])("carries translated DayPicker navigation labels for %s", (code, expectedLabel) => {
    // Arrange / Act
    const result = getCalendarLocale(code);

    // Assert
    expect(result.labels?.labelNext).toBe(expectedLabel);
  });

  it("falls back to enUS for an unsupported locale", () => {
    // Arrange / Act
    const result = getCalendarLocale("de");

    // Assert
    expect(result).toBe(enUS);
  });
});
