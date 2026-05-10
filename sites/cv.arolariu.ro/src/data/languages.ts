/**
 * @fileoverview JSON Resume `languages` block — spoken languages with fluency.
 * Consumed by the `/json` route; no human-view counterpart.
 */

import type {Language} from "@/types";

export const languages: ReadonlyArray<Language> = Object.freeze([
  {
    language: "Romanian",
    fluency: "Native speaker",
    certifications: [],
  },
  {
    language: "English",
    fluency: "Fluent",
    certifications: ["Cambridge English: Advanced (CAE)"],
  },
]);
