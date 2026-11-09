import * as dayPickerLocales from "react-day-picker/locale";
import {describe, expect, it} from "vitest";

import * as calendarLocales from "./calendar-locales";
import {enUS, fr, ro} from "./calendar-locales";

describe("calendar-locales", () => {
  it("re-exports every DayPicker locale with its original identity", () => {
    // Arrange / Act
    const exportedNames = Object.keys(calendarLocales).sort();

    // Assert
    expect(exportedNames).toEqual(Object.keys(dayPickerLocales).sort());
    expect(exportedNames.length).toBeGreaterThan(50);
    for (const name of exportedNames) {
      expect(calendarLocales[name as keyof typeof calendarLocales], name).toBe(dayPickerLocales[name as keyof typeof dayPickerLocales]);
    }
  });

  it.each([
    ["enUS", enUS, "Go to the Next Month", "Go to the Previous Month"],
    ["fr", fr, "Aller au mois suivant", "Aller au mois précédent"],
    ["ro", ro, "Mergi la luna următoare", "Mergi la luna anterioară"],
  ] as const)("ships translated DayPicker navigation labels for %s", (_name, locale, next, previous) => {
    // Assert
    expect(locale.labels?.labelNext).toBe(next);
    expect(locale.labels?.labelPrevious).toBe(previous);
  });
});
