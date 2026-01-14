/**
 * @fileoverview Static author/profile data for cv.arolariu.ro.
 * @module sites/cv.arolariu.ro/src/data/author
 */

import type {PersonalInformation} from "@/types";

export const author: Readonly<PersonalInformation> = {
  name: "Alexandru-Razvan Olariu",
  age:
    new Date().getFullYear()
    // eslint-disable-next-line no-magic-numbers -- birth year
    - 2000,
  location: "Bucharest, Romania",
  title: "Software Engineer | Solution Architect | Mentor",
  email: "admin@arolariu.ro",
  website: "https://arolariu.ro",
  linkedin: "https://www.linkedin.com/in/olariu-alexandru/",
  github: "https://www.github.com/arolariu",
  region: "Romania / European Union",
  summary: "Passionate software engineer with a focus on building impactful solutions.",
} as const;
