/**
 * @fileoverview JSON Resume `projects` block — flagship personal projects.
 * Consumed by the `/json` route; no human-view counterpart.
 */

import type {Project} from "@/types";

export const projects: ReadonlyArray<Project> = Object.freeze([
  {
    name: "arolariu.ro Platform",
    description: "Personal platform built as a test-bench for new technologies and learning",
    highlights: [
      "Built using state-of-the-art technologies including Next.js, .NET, and Azure",
      "Implements comprehensive observability with OpenTelemetry",
      "Features multiple domain services and applications",
    ],
    keywords: ["Next.js", ".NET", "Azure", "OpenTelemetry", "Full-Stack"],
    startDate: "2022",
    endDate: null,
    url: "https://arolariu.ro",
    roles: ["Full-Stack Developer", "DevOps Engineer", "Solution Architect"],
    entity: "Personal Project",
    type: "application",
    repository: "https://github.com/arolariu/arolariu.ro",
    technologies: {
      frontend: ["Next.js", "React", "TypeScript", "Tailwind CSS"],
      backend: [".NET 7", "C#", "ASP.NET Core", "Entity Framework Core"],
      devops: ["Azure DevOps", "GitHub Actions", "Docker", "Kubernetes"],
      cloud: ["Azure App Service", "Azure SQL", "Azure Cosmos DB", "Azure Monitor"],
    },
    architecture: "Microservices with API Gateway",
    metrics: {
      codeQuality: "A",
      testCoverage: "85%",
      performance: "95/100 Lighthouse score",
      availability: "99.9% uptime",
    },
  },
]);
