/**
 * @fileoverview UI chrome metadata — `techInfo` for the Help dialog and
 * `footer` for the page footer. Distinct from `jsonResumeTechnical.ts`,
 * which holds the JSON Resume `technical` block.
 */

import type {Footer, TechInfo} from "@/types";

import {author} from "./author";

export const techInfo: TechInfo = Object.freeze({
  version: "v1.0.0",
  deployDate: new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }),
  commitSha: "a7b3c9d2f1e",
  sourceCodeUrl: "https://github.com/arolariu/cv.arolariu.ro",
  cloudProvider: "Microsoft Azure",
  region: "West Europe",
  framework: "Svelte 5",
  buildTime: "2 minutes 34 seconds",
  lastUpdated: new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }),
  dependencies: [
    {name: "Svelte", version: "5"},
    {name: "Sass", version: "SCSS Modules"},
    {name: "Vite", version: "7"},
    {name: "TypeScript", version: "5.9.2"},
  ],
});

export const footer: Footer = Object.freeze({
  copyright: `© 2024 - ${new Date().getFullYear()} Alexandru-Razvan Olariu. All rights reserved.`,
  links: {
    github: {
      url: author.github,
      label: "GitHub Profile",
    },
    linkedin: {
      url: author.linkedin,
      label: "LinkedIn Profile",
    },
    website: {
      url: author.website,
      label: "Personal Website",
    },
  },
});
