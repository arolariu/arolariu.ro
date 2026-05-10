/**
 * @fileoverview JSON Resume `skills` block — proficiency-level skill groups.
 *
 * Deliberately separate from {@link ./skills} (the human-view bento mosaic):
 * the two have intentionally different shapes (proficiency-shaped groups
 * here vs. tile-importance hierarchy there) and audiences. Cannot be
 * derived from one another.
 */

import type {JsonResumeSkill} from "@/types";

export const jsonResumeSkills: ReadonlyArray<JsonResumeSkill> = Object.freeze([
  {
    name: "Programming Languages",
    level: "Expert",
    keywords: ["Rust", "TypeScript", "C#", "Python", "JavaScript", "F#"],
    yearsOfExperience: 5,
    projects: [
      "Developed microservices in C# and .NET",
      "Created web applications with TypeScript and React",
      "Built data processing pipelines with Python",
    ],
  },
  {
    name: "Frameworks & Libraries",
    level: "Expert",
    keywords: ["React 18/19", ".NET 6/8", "Django", "Svelte", "Next.js", "ASP.NET Core"],
    yearsOfExperience: 4,
    projects: [
      "Built enterprise applications with ASP.NET Core",
      "Developed SPAs with React and Next.js",
      "Created personal projects with Svelte",
    ],
  },
  {
    name: "Cloud & Infrastructure",
    level: "Expert",
    keywords: ["Microsoft Azure", "Docker", "Containers", "Azure DevOps", "Bicep", "ARM", "CI/CD"],
    yearsOfExperience: 3,
    projects: [
      "Designed and implemented cloud-native architectures",
      "Created CI/CD pipelines with Azure DevOps",
      "Deployed containerized applications to AKS",
    ],
  },
  {
    name: "Data & Analytics",
    level: "Advanced",
    keywords: ["SQL", "KQL", "Azure Data Factory", "Apache Spark", "Machine Learning", "AI"],
    yearsOfExperience: 2,
    projects: [
      "Built data processing pipelines with Azure Data Factory",
      "Analyzed telemetry data with KQL",
      "Implemented ML models for predictive analytics",
    ],
  },
  {
    name: "Architecture & Design",
    level: "Expert",
    keywords: ["Microservices", "Domain-Driven Design", "Test-Driven Development", "Clean Architecture", "Modular Monoliths"],
    yearsOfExperience: 4,
    projects: [
      "Designed microservices architectures for enterprise applications",
      "Implemented DDD principles in complex domains",
      "Applied TDD practices for high-quality software",
    ],
  },
  {
    name: "Project Management",
    level: "Advanced",
    keywords: ["Agile", "Scrum", "Kanban", "Waterfall", "DevOps"],
    yearsOfExperience: 3,
    projects: [
      "Led Agile teams using Scrum methodology",
      "Implemented Kanban for continuous delivery",
      "Applied DevOps practices for improved collaboration",
    ],
  },
]);
