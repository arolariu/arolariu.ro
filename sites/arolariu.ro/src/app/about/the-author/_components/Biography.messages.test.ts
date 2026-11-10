import en from "../../../../../messages/en.json";
import fr from "../../../../../messages/fr.json";
import ro from "../../../../../messages/ro.json";
import {describe, expect, it} from "vitest";

describe("author biography translations", () => {
  it("describes the current Copilot Platform role in every locale", () => {
    const firstPoints = [
      en.sections.about.author.biography.firstPoint,
      ro.sections.about.author.biography.firstPoint,
      fr.sections.about.author.biography.firstPoint,
    ];

    for (const firstPoint of firstPoints) {
      expect(firstPoint).toContain("Copilot Platform");
      expect(firstPoint).not.toContain("E+D MSAI FAST");
      expect(firstPoint).toContain("{age}");
    }
  });
});
