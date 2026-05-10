/**
 * @fileoverview JSON Resume `technical` block — flat technical-skills inventory.
 *
 * Deliberately separate from {@link ./technical} (which holds UI chrome data
 * for the help dialog and footer — `techInfo` and `footer`).
 */

import type {JsonResumeTechnical} from "@/types";

export const jsonResumeTechnical: JsonResumeTechnical = Object.freeze({
  operatingSystems: ["Windows", "Linux (Ubuntu, Debian)", "macOS"],
  databases: ["SQL Server", "PostgreSQL", "MongoDB", "Azure Cosmos DB", "Redis"],
  tools: ["Visual Studio", "VS Code", "Git", "Docker", "Kubernetes", "Terraform"],
  methodologies: ["Agile", "Scrum", "Kanban", "DevOps", "GitFlow"],
  testing: ["Unit Testing", "Integration Testing", "E2E Testing", "TDD", "BDD"],
  security: ["OWASP", "OAuth 2.0", "OpenID Connect", "Azure AD", "JWT"],
  performance: ["Caching", "Load Balancing", "CDN", "Performance Profiling"],
  softSkills: ["Communication", "Leadership", "Problem Solving", "Teamwork", "Mentoring"],
});
