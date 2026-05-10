import type {Skill} from "@/types";

/**
 * Bento mosaic data — tile size encodes editorial importance.
 * Layout (desktop, 6-column grid):
 *   1 hero (3x2) + 2 large (3x1 each) + 3 medium (2x1 each) + 6 small (1x1 each).
 */
export const skills: ReadonlyArray<Skill> = Object.freeze([
  {
    name: "TypeScript \u00B7 C# / .NET",
    size: "hero",
    label: "Primary stack",
    caption: "My production languages. Most of what I ship.",
    accent: "primary",
  },
  {name: "Microsoft Azure", size: "lg", label: "Cloud", accent: "secondary"},
  {name: "Domain-Driven Design", size: "lg", label: "Discipline", accent: "success"},
  {name: "React + Next.js", size: "md", label: "Frontend"},
  {name: ".NET Ecosystem", size: "md", label: "Platform"},
  {name: "Large Scale Development", size: "md", label: "Practice"},
  {name: "SQL", size: "sm", label: "DB"},
  {name: "KQL", size: "sm", label: "DB"},
  {name: "Bicep", size: "sm", label: "IaC"},
  {name: "GH Actions", size: "sm", label: "CI"},
  {name: "Docker", size: "sm", label: "Container"},
  {name: "Git", size: "sm", label: "VCS"},
]);
