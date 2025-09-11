import type {Experience} from "@/types";

type ExperienceKeys = "microsoft3" | "microsoft2" | "microsoft1" | "ubisoft" | "intel";
type Experiences = Readonly<Record<ExperienceKeys, Experience>>;

/**
 * This object contains the professional experience of the individual.
 * Each key corresponds to a specific job or role.
 * The values are objects containing details about the title, company, location, period, description,
 * responsibilities, achievements, and technologies used.
 */
export const experiences: Experiences = {
  microsoft3: {
    title: "E + D M365 AI Fullstack Software Engineer II",
    company: "Microsoft",
    location: "Remote (Norway)",
    period: "11/2024 - Present",
    description: "Alexandru is currently working at Microsoft as a software engineer in the E+D MSAI (M365 AI Experiences) organization.",
    techAndSkills:
      "React # GraphQL # Large-Scale Development # Cloud-Native Applications # Agile Methodologies # Engineering Excellence # Leadership",
    responsibilities: " ",
    achievements: " ",
  },
  microsoft2: {
    title: "E + D Sovereign Clouds Software Engineer II",
    company: "Microsoft",
    location: "EMEA",
    period: "03/2023 – 12/2024",
    description:
      "As governments today look at technology innovation, there is a need to address the rapidly evolving demands of their citizens while protecting the most sensitive data and delivering on promises of trust and security.",
    techAndSkills:
      ".NET # Azure # Microservices # Cloud-Native Applications # Agile Methodologies # DevOps # Domain-Driven Design # Test-Driven Development # Project Management",
    responsibilities:
      "Deliver one E+C Data Platform that is capable of running cross-clouds and cross-tenant in sovereign environments and air-gapped scenarios. # Manage and assure the wellbeing of the Runtime in Sovereign Environments (RISE) Data Platform operations. # Build a novel data mesh enterprise architecture using data engineering concepts, tools like Azure Data Factory and other data warehouse notions.",
    achievements:
      "(Observability-as-a-Service) Fully orchestrated and implemented the three pillars of observability in our microservices architecture using Open Telemetry standards; I've also built automated monitoring and alerting triggers based on p95/p99 statistics for real-time and synthetic traffic. # (Research & Development) Assisted with major contributions to the development of an in-house .NET library that implements the ODataV4 data consumption protocol for NoSQL database engines such as Azure Data Explorer (ADX), using Domain-Driven Design (DDD) practices (e.g. aggregator roots) (patent in progress) # (Development Experience) Took leadership of two key areas for DX: documentation & consumption layers. Built outstanding documentation and leveraged static site generator tools (DocFX) to automatically generate API documentation from code; offered API consumption layers in form of frontend UIs, CLI tooling and OpenAPI spec files. # (Growth) Currently shadowing and attending hiring interviews for SWE II and Senior SWE positions.",
  },
  microsoft1: {
    title: "Azure Technical Engineer",
    company: "Microsoft",
    location: "Romania",
    period: "03/2021 – 03/2023",
    description:
      "With over 12,000 employees worldwide, the Microsoft Customer Experience & Success (CE&S) organization is responsible for the strategy, design, and implementation of the Microsoft end-to-end customer experience.",
    techAndSkills: "Network Traffic Analysis # Azure # Customer-centric Approach # Business Relationships # Incident Manager",
    responsibilities:
      "Provide knowledge sharing, technical coaching and mentoring to fellow colleagues; # Problem solving through deep troubleshooting, debugging, log analysis, A/B testing; # Identify and respond to business critical customer issues specific to Azure services such as Azure Virtual Desktop; # Work exclusively with Fortune 500 customers to understand their technical needs, and define an action plan to meet them, collaborating with peers or other teams regularly.",
    achievements:
      "(Engineering Excellence) Constantly pushed myself to achieve the best customer feedback. (Current score: 4.94 / 5.00) # (Proactive interactions) Provided continuous feedback to the Product Group for the Azure Virtual Desktop (AVD) product, regarding the implementation of specific features and services. # (Customer Experience) Developed the existing documentation about the features of Azure Core services such as Azure Virtual Desktop, Azure Virtual Machines, Azure Networks. # Worked exclusively with TOP 100 & Fortune 500 clients and industry leading professionals.",
  },
  intel: {
    title: "Embedded Engineer",
    company: "Intel",
    location: "Remote (Romania - Timisoara)",
    period: "2021 (6 Months)",
    description:
      "The Timisoara site addresses several focus areas where software for various hardware components, image processing algorithms, and low-level and high-level implementations of component parts of neural networks are actively being developed.",
    techAndSkills: "C # C++ # Intel x8086 Assembly # Color Space Converters # Python # Embedded Compute # Internet of Things",
    responsibilities:
      "Mastering skills in the world of image processing. # Gaining a grasp of the domain of Machine Learning (ML). # Practicing the achieved knowledge by developing different color space converters.",
    achievements:
      "Developed color space converters (CSC) in C and Assembly x8086 (YUV->RGB, Grayscale). # Created 10+ types of image filters such as Fish Eye, Sobel, Edge Detection, Box Blur, etc. # Refactored .ASM code to better perform on IoT & Embedded Systems devices.",
  },
  ubisoft: {
    title: "QA/QC Engineer",
    company: "Ubisoft",
    location: "Hybrid (Bucharest, Romania)",
    period: "2020 - 2021",
    description:
      "I've worked on the Avatar: Frontiers of Pandora™ first person, action-adventure game built using the latest iteration of the Snowdrop engine (C++) by Massive Entertainment - a UBISOFT studio, and tested by UBISOFT Romania.",
    techAndSkills: "Unit Testing # Integration Testing # A/B Testing # Performance Testing # Automatic Testing # E2E Testing",
    responsibilities:
      "# Managed regression, integration and unit testing with software such as XRAY, TestRail, Bugzilla. # Create high quality test suites and test plans using Atlassian (JIRA / Confluence) products. # Assure communications are stable and clear between production and testing teams.",
    achievements:
      "# I've consistently over-exceeded the quota of reported bugs, glitches and artefacts, ranking as the #1 reporter for a solid 5 months out of the 6 worked. #  Found and reported major code defects that ranged from race conditions to memory resource allocation defects. #  Increased the daily report efficiency by leveraging SQL and JQL filtering capabilities.",
  },
};

/**
 * This array is a flattened version of the experiences object.
 * It is useful for iterating over experiences in UI components.
 * Each entry in the array corresponds to an experience defined in the `experiences` object.
 */
export const experiencesAsArray = Object.values(experiences);

/**
 * Parses a string of items into an array.
 * @param listString A string containing items separated by " # ".
 * @returns An array of individual items.
 */
export function parseList(listString: string): string[] {
  return listString.split(" # ").filter((item: string) => item.trim());
}
