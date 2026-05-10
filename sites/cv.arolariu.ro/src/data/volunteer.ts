/**
 * @fileoverview JSON Resume `volunteer` block — community + ambassador roles.
 * Consumed by the `/json` route. Replaces the dead `volunteering.ts` (UI
 * placeholder data that was never wired to any component).
 */

import type {Volunteer} from "@/types";

export const volunteer: ReadonlyArray<Volunteer> = Object.freeze([
  {
    organization: "Global Mentorship Initiative (GMI)",
    position: "Mentor Leader",
    url: "https://gmi.org",
    startDate: "2024",
    endDate: null,
    summary: "Leading mentors in EMEA region for global mentorship initiatives.",
    highlights: ["One of the GMI leaders for mentors present in EMEA"],
    location: "Europe",
    impact: "Mentored 25+ computer science students in their career development",
  },
  {
    organization: "Codette Romania",
    position: "Infrastructure Leader",
    url: "https://codette.ro",
    startDate: "2020",
    endDate: null,
    summary: "Coordinating taskforce of students new to IT.",
    highlights: ["Coordinating a taskforce of 15 students new to IT"],
    location: "Bucharest, Romania",
    impact: "Helped 15+ students transition into IT careers through hands-on mentoring",
  },
  {
    organization: "Microsoft Ambassadors",
    position: "Department Leader",
    url: "https://studentambassadors.microsoft.com",
    startDate: "2019",
    endDate: "2021",
    summary: "Led department initiatives for Microsoft Student Ambassador program.",
    highlights: ["Department leadership for Microsoft Student Ambassador program"],
    location: "Bucharest, Romania",
    impact: "Organized 10+ technical workshops and community events",
  },
]);
