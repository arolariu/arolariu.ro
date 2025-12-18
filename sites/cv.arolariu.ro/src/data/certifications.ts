import type {Certificate} from "@/types";

type CertificationKeys = Readonly<"az900" | "ai900" | "sc900">;
type Certifications = Readonly<Record<CertificationKeys, Certificate>>;

/**
 * This object contains the certifications obtained by the individual.
 * Each key corresponds to a specific certification.
 * The values are objects containing details about the certification name, issuer, code, issue date, and optional description.
 */
export const certifications: Readonly<Certifications> = {
  az900: {
    name: "AZ-900 (Azure Fundamentals)",
    code: "AZ-900",
    issuer: "Microsoft",
    issuerUrl: "https://learn.microsoft.com/en-us/certifications/azure-fundamentals/",
    issueDate: "2023",
    description: "Validates foundational knowledge of cloud services and how those services are provided with Microsoft Azure.",
  },
  ai900: {
    name: "AI-900 (Azure AI Fundamentals)",
    code: "AI-900",
    issuer: "Microsoft",
    issuerUrl: "https://learn.microsoft.com/en-us/certifications/azure-ai-fundamentals/",
    issueDate: "2023",
    description: "Demonstrates knowledge of common AI and machine learning workloads and how to implement them on Azure.",
  },
  sc900: {
    name: "SC-900 (Security, Compliance & Identity Fundamentals)",
    code: "SC-900",
    issuer: "Microsoft",
    issuerUrl: "https://learn.microsoft.com/en-us/certifications/security-compliance-and-identity-fundamentals/",
    issueDate: "2023",
    description:
      "Validates foundational knowledge of security, compliance, and identity concepts and related cloud-based Microsoft solutions.",
  },
} as const;

/**
 * Converts the certifications object to an array format for easier iteration in components.
 * This is useful for rendering lists of certifications in the UI.
 * This array will contain all certification entries defined in the `certifications` object.
 */
export const certificationsAsArray: ReadonlyArray<Certificate> = Object.freeze(Object.values(certifications));
