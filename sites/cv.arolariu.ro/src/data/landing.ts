/**
 * @fileoverview Landing-page strings + help dialog content.
 */

import type {Help, Landing} from "@/types";

export const landing: Landing = Object.freeze({
  title: "Alexandru-Razvan Olariu",
  subtitle: "Choose how you'd like to view my professional profile.",
  footer: "Built with Svelte 5 • Deployed on Azure • Open Source",
  panels: {
    help: {
      title: "Help",
      description: "Information about this website, version, and source code",
    },
  },
});

export const help: Help = Object.freeze({
  title: "Technical Information",
  description: "Information about this website, version, and source code",
});
