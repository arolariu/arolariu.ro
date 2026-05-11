/**
 * @fileoverview JSON Resume `interests` block.
 * Consumed by the `/json` route; no human-view counterpart.
 */

import type {Interest} from "@/types";

export const interests: ReadonlyArray<Interest> = Object.freeze([
  {
    name: "Gaming",
    keywords: ["Strategy Games", "DotA 2", "Age of Empires", "StarCraft", "RTS Games"],
  },
  {
    name: "Technology",
    keywords: ["Open Source", "New Technologies", "Technical Books", "Innovation"],
  },
  {
    name: "Mentoring",
    keywords: ["Student Mentoring", "Career Development", "Knowledge Sharing"],
  },
]);
