/**
 * @fileoverview Professional certifications source — feeds the `/human`
 * Education view (grouped Microsoft/GitHub blocks) and the JSON Resume
 * `certificates[]` export. Update this single file when a new cert is
 * earned; both views update automatically.
 */

import type {Certificate} from "@/types";

type CertificationKeys = "ab730" | "ab731" | "az900" | "ai900" | "sc900" | "gh900" | "gh100" | "gh200" | "gh300";

type Certifications = Readonly<Record<CertificationKeys, Certificate>>;

/**
 * Professional certifications grouped by issuer.
 * Microsoft block (5): newest first by year (AB-730/731 → AZ/AI/SC-900).
 * GitHub block (4): by exam-code progression (900 → 100 → 200 → 300).
 */
export const certifications: Readonly<Certifications> = Object.freeze({
  ab730: {
    name: "AI Business Professional",
    code: "AB-730",
    issuer: "Microsoft",
    issuerUrl: "https://learn.microsoft.com/en-us/credentials/certifications/ai-business-professional/",
    issueDate: "2026",
    category: "Microsoft",
  },
  ab731: {
    name: "AI Transformation Leader",
    code: "AB-731",
    issuer: "Microsoft",
    issuerUrl: "https://learn.microsoft.com/en-us/credentials/certifications/ai-transformation-leader/",
    issueDate: "2026",
    category: "Microsoft",
  },
  az900: {
    name: "Azure Fundamentals",
    code: "AZ-900",
    issuer: "Microsoft",
    issuerUrl: "https://learn.microsoft.com/en-us/credentials/certifications/azure-fundamentals/",
    issueDate: "2023",
    category: "Microsoft",
  },
  ai900: {
    name: "Azure AI Fundamentals",
    code: "AI-900",
    issuer: "Microsoft",
    issuerUrl: "https://learn.microsoft.com/en-us/credentials/certifications/azure-ai-fundamentals/",
    issueDate: "2023",
    category: "Microsoft",
  },
  sc900: {
    name: "Security, Compliance & Identity Fundamentals",
    code: "SC-900",
    issuer: "Microsoft",
    issuerUrl: "https://learn.microsoft.com/en-us/credentials/certifications/security-compliance-and-identity-fundamentals/",
    issueDate: "2023",
    category: "Microsoft",
  },
  gh900: {
    name: "GitHub Foundations",
    code: "GH-900",
    issuer: "GitHub",
    issuerUrl: "https://learn.microsoft.com/en-us/credentials/certifications/github-foundations/",
    issueDate: "2026",
    category: "GitHub",
  },
  gh100: {
    name: "GitHub Administration",
    code: "GH-100",
    issuer: "GitHub",
    issuerUrl: "https://learn.microsoft.com/en-us/credentials/certifications/github-administration/",
    issueDate: "2026",
    category: "GitHub",
  },
  gh200: {
    name: "GitHub Actions",
    code: "GH-200",
    issuer: "GitHub",
    issuerUrl: "https://learn.microsoft.com/en-us/credentials/certifications/github-actions/",
    issueDate: "2026",
    category: "GitHub",
  },
  gh300: {
    name: "GitHub Copilot",
    code: "GH-300",
    issuer: "GitHub",
    issuerUrl: "https://learn.microsoft.com/en-us/credentials/certifications/github-copilot/",
    issueDate: "2026",
    category: "GitHub",
  },
});

/**
 * Flat array form for iteration in components.
 */
export const certificationsAsArray: ReadonlyArray<Certificate> = Object.freeze(Object.values(certifications));
