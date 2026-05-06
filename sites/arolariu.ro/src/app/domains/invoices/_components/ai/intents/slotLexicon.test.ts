import {describe, expect, it} from "vitest";
import {parseTimeframe, parseTopK} from "./slotLexicon";

describe("parseTimeframe", () => {
  describe("English", () => {
    it.each([
      ["last month", "last-month"],
      ["the last month", "last-month"],
      ["this month", "this-month"],
      ["last week", "last-week"],
      ["this week", "this-week"],
      ["last 3 months", "last-3-months"],
      ["last three months", "last-3-months"],
      ["past 3 months", "last-3-months"],
      ["last 6 months", "last-6-months"],
      ["past six months", "last-6-months"],
      ["this year", "this-year"],
      ["last year", "last-year"],
      ["this quarter", "this-quarter"],
      ["last quarter", "last-quarter"],
      ["all time", "all-time"],
      ["of all time", "all-time"],
    ])("maps %s -> %s", (input, expected) => {
      expect(parseTimeframe(input, "en")).toBe(expected);
    });
  });

  describe("Romanian", () => {
    it.each([
      ["luna trecută", "last-month"],
      ["luna aceasta", "this-month"],
      ["săptămâna trecută", "last-week"],
      ["ultimele 3 luni", "last-3-months"],
      ["ultimele 6 luni", "last-6-months"],
      ["anul trecut", "last-year"],
      ["anul acesta", "this-year"],
      ["trimestrul trecut", "last-quarter"],
      ["trimestrul acesta", "this-quarter"],
      ["din totdeauna", "all-time"],
    ])("maps %s -> %s", (input, expected) => {
      expect(parseTimeframe(input, "ro")).toBe(expected);
    });
  });

  describe("French", () => {
    it.each([
      ["le mois dernier", "last-month"],
      ["ce mois", "this-month"],
      ["la semaine dernière", "last-week"],
      ["les 3 derniers mois", "last-3-months"],
      ["les six derniers mois", "last-6-months"],
      ["l'année dernière", "last-year"],
      ["cette année", "this-year"],
      ["le trimestre dernier", "last-quarter"],
      ["depuis toujours", "all-time"],
    ])("maps %s -> %s", (input, expected) => {
      expect(parseTimeframe(input, "fr")).toBe(expected);
    });
  });

  it("returns null for unknown phrases", () => {
    expect(parseTimeframe("yesterday afternoon", "en")).toBeNull();
    expect(parseTimeframe("", "en")).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(parseTimeframe("LAST MONTH", "en")).toBe("last-month");
    expect(parseTimeframe("Luna Trecută", "ro")).toBe("last-month");
  });

  it("strips Romanian diacritics for matching", () => {
    expect(parseTimeframe("saptamana trecuta", "ro")).toBe("last-week");
  });
});

describe("parseTopK", () => {
  it.each([
    ["top 5 merchants", "en", 5],
    ["top three merchants", "en", 3],
    ["primele 10 categorii", "ro", 10],
    ["primele cinci magazine", "ro", 5],
    ["les 7 meilleurs", "fr", 7],
    ["les trois meilleurs", "fr", 3],
  ])("extracts %s -> %d", (input, locale, expected) => {
    expect(parseTopK(input as string, locale as "en" | "ro" | "fr")).toBe(expected);
  });

  it("returns default 5 when no quantifier present", () => {
    expect(parseTopK("merchants this month", "en")).toBe(5);
  });

  it("clamps to [1, 20]", () => {
    expect(parseTopK("top 100 merchants", "en")).toBe(20);
    expect(parseTopK("top 0 merchants", "en")).toBe(1);
  });
});