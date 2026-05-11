/**
 * @fileoverview JSON Resume `awards` block — competitions and recognitions.
 * Consumed by the `/json` route; no human-view counterpart.
 */

import type {Award} from "@/types";

export const awards: ReadonlyArray<Award> = Object.freeze([
  {
    title: "Microsoft Student TECHathon",
    date: "2020",
    awarder: "Microsoft",
    summary: "1st place in Microsoft Student TECHathon competition",
    url: "https://example.com/techathon2020",
    highlights: [
      "Developed an AI-powered solution for accessibility",
      "Competed against 50+ teams from across Europe",
      "Presented solution to Microsoft leadership team",
    ],
  },
  {
    title: "2NHACK ML & AI Hackathon",
    date: "2020",
    awarder: "2NHACK",
    summary: "6th place in Machine Learning & AI Hackathon",
    url: "https://example.com/2nhack2020",
    highlights: [
      "Created a computer vision solution for retail analytics",
      "Implemented real-time object detection and tracking",
      "Optimized for edge computing environments",
    ],
  },
  {
    title: "Top Talents Romania",
    date: "2020",
    awarder: "Hipo.ro",
    summary: "70th place in Top Talents Romania ranking",
    url: "https://example.com/toptalents2020",
    highlights: [
      "Selected from over 5,000 applicants",
      "Recognized for technical skills and leadership potential",
      "Participated in exclusive networking and development events",
    ],
  },
]);
