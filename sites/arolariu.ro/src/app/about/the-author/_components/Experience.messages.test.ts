import en from "../../../../../messages/en.json";
import fr from "../../../../../messages/fr.json";
import ro from "../../../../../messages/ro.json";
import {describe, expect, it} from "vitest";

describe("author experience translations", () => {
  it.each([
    {locale: "en", experiences: en.sections.about.author.experiences, opening: "I was part of the M365 AI Experiences organization"},
    {locale: "ro", experiences: ro.sections.about.author.experiences, opening: "Am făcut parte din organizația M365 AI Experiences"},
    {locale: "fr", experiences: fr.sections.about.author.experiences, opening: "J'ai fait partie de l'organisation M365 AI Experiences"},
  ])("describes the ended M365 AI role in the past tense ($locale)", ({experiences, opening}) => {
    const {description, period} = experiences.microsoft3;

    expect(period).toMatch(/^\d{2}\/\d{4} – \d{2}\/\d{4}$/);
    expect(description.slice(0, opening.length)).toBe(opening);
  });
});
