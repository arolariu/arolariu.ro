import type {Certificate, Education, Experience} from "@/types";

import {author} from "./author";
import {certificationsAsArray} from "./certifications";
import {educationAsArray} from "./education";
import {experiencesAsArray, parseList} from "./experiences";
import {testimonials} from "./testimonials";

/**
 * Maps an Experience entry to a JSON Resume `work[]` shape.
 * Pulls highlights/keywords/achievements from the `#`-separated source strings.
 * Falls back to `description` when `summary` is unset so existing entries
 * stay valid even before they're enriched with JSON-Resume metadata.
 */
function experienceToJsonResume(e: Experience): {
  name: string;
  position: string;
  url: string | undefined;
  startDate: string | undefined;
  endDate: string | null | undefined;
  summary: string;
  highlights: ReadonlyArray<string>;
  location: string;
  keywords: ReadonlyArray<string>;
  achievements: ReadonlyArray<string>;
} {
  return {
    name: e.company,
    position: e.title,
    url: e.url,
    startDate: e.startDate,
    endDate: e.endDate,
    summary: e.summary ?? e.description,
    highlights: parseList(e.responsibilities),
    location: e.location,
    keywords: parseList(e.techAndSkills),
    achievements: parseList(e.achievements),
  };
}

/**
 * Maps an Education entry to a JSON Resume `education[]` shape.
 */
function educationToJsonResume(ed: Education): {
  institution: string;
  url: string | undefined;
  area: string | undefined;
  studyType: string | undefined;
  startDate: string | undefined;
  endDate: string | undefined;
  score: string | undefined;
  courses: ReadonlyArray<string> | undefined;
  location: string;
  status: string;
  highlights: ReadonlyArray<string> | undefined;
} {
  return {
    institution: ed.institution,
    url: ed.url,
    area: ed.area,
    studyType: ed.studyType,
    startDate: ed.startDate,
    endDate: ed.endDate,
    score: ed.score,
    courses: ed.courses,
    location: ed.location,
    status: ed.status,
    highlights: ed.highlights,
  };
}

/**
 * Maps a Certificate entry to a JSON Resume `certificates[]` shape.
 * Microsoft-issued certs gain the canonical `Microsoft Certified:` prefix.
 */
function certificateToJsonResume(c: Certificate): {
  name: string;
  date: string;
  issuer: string;
  url: string | undefined;
  code: string;
  validUntil: string;
  verificationUrl: string | undefined;
} {
  const displayName = c.issuer === "Microsoft" ? `Microsoft Certified: ${c.name}` : c.name;
  return {
    name: displayName,
    date: c.issueDate,
    issuer: c.issuer,
    url: c.issuerUrl,
    code: c.code,
    validUntil: c.expirationDate ?? "No expiration",
    verificationUrl: c.issuerUrl,
  };
}

export const jsonCVData = {
  $schema: "https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json",
  meta: {
    version: "v2.1.0",
    canonical: "https://cv.arolariu.ro",
    lastModified: new Date().toISOString(),
    theme: "professional",
    format: "JSONResume",
    schemaVersion: "1.0.0",
    validationStatus: "valid",
  },
  basics: {
    name: author.name,
    label: author.title,
    image: "https://cv.arolariu.ro/avatar.jpg",
    email: author.email,
    url: author.website,
    summary:
      "Ambitious, respectful and hard working software engineer that wants to share his knowledge and help become a business force multiplier. Currently working at Microsoft as a software engineer in the E+D MSAI FAST organization, building solutions that are used by millions of users worldwide.",
    location: {
      address: "",
      postalCode: "",
      city: "Bucharest",
      countryCode: "RO",
      region: "Romania / European Union",
    },
    profiles: [
      {
        network: "LinkedIn",
        username: "olariu-alexandru",
        url: "https://www.linkedin.com/in/olariu-alexandru/",
      },
      {
        network: "GitHub",
        username: "arolariu",
        url: "https://www.github.com/arolariu",
      },
      {
        network: "Website",
        username: "arolariu",
        url: "https://arolariu.ro",
      },
    ],
  },

  /** Derived from `experiencesAsArray` so /json never drifts from /human. */
  work: experiencesAsArray.map(experienceToJsonResume),

  volunteer: [
    {
      organization: "Global Mentorship Initiative (GMI)",
      position: "Mentor Leader",
      url: "https://gmi.org",
      startDate: "2024",
      endDate: null,
      summary: "Leading mentors in EMEA region for global mentorship initiatives.",
      highlights: ["One of the GMI leaders for mentors present in EMEA"],
      location: "Europe",
      impact: "Mentored 25+ computer science students in their career development",
    },
    {
      organization: "Codette Romania",
      position: "Infrastructure Leader",
      url: "https://codette.ro",
      startDate: "2020",
      endDate: null,
      summary: "Coordinating taskforce of students new to IT.",
      highlights: ["Coordinating a taskforce of 15 students new to IT"],
      location: "Bucharest, Romania",
      impact: "Helped 15+ students transition into IT careers through hands-on mentoring",
    },
    {
      organization: "Microsoft Ambassadors",
      position: "Department Leader",
      url: "https://studentambassadors.microsoft.com",
      startDate: "2019",
      endDate: "2021",
      summary: "Led department initiatives for Microsoft Student Ambassador program.",
      highlights: ["Department leadership for Microsoft Student Ambassador program"],
      location: "Bucharest, Romania",
      impact: "Organized 10+ technical workshops and community events",
    },
  ],

  /** Derived from `educationAsArray` so /json never drifts from /human. */
  education: educationAsArray.map(educationToJsonResume),

  awards: [
    {
      title: "Microsoft Student TECHathon",
      date: "2020",
      awarder: "Microsoft",
      summary: "1st place in Microsoft Student TECHathon competition",
      url: "https://example.com/techathon2020",
      highlights: [
        "Developed an AI-powered solution for accessibility",
        "Competed against 50+ teams from across Europe",
        "Presented solution to Microsoft leadership team",
      ],
    },
    {
      title: "2NHACK ML & AI Hackathon",
      date: "2020",
      awarder: "2NHACK",
      summary: "6th place in Machine Learning & AI Hackathon",
      url: "https://example.com/2nhack2020",
      highlights: [
        "Created a computer vision solution for retail analytics",
        "Implemented real-time object detection and tracking",
        "Optimized for edge computing environments",
      ],
    },
    {
      title: "Top Talents Romania",
      date: "2020",
      awarder: "Hipo.ro",
      summary: "70th place in Top Talents Romania ranking",
      url: "https://example.com/toptalents2020",
      highlights: [
        "Selected from over 5,000 applicants",
        "Recognized for technical skills and leadership potential",
        "Participated in exclusive networking and development events",
      ],
    },
  ],

  /** Derived from `certificationsAsArray` so /json never drifts from /human. */
  certificates: certificationsAsArray.map(certificateToJsonResume),

  skills: [
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
  ],
  languages: [
    {
      language: "Romanian",
      fluency: "Native speaker",
      certifications: [],
    },
    {
      language: "English",
      fluency: "Fluent",
      certifications: ["Cambridge English: Advanced (CAE)"],
    },
  ],
  interests: [
    {
      name: "Gaming",
      keywords: ["Strategy Games", "DotA 2", "Age of Empires", "StarCraft", "RTS Games"],
    },
    {
      name: "Technology",
      keywords: ["Open Source", "New Technologies", "Technical Books", "Innovation"],
    },
    {
      name: "Mentoring",
      keywords: ["Student Mentoring", "Career Development", "Knowledge Sharing"],
    },
  ],

  /** Derived from `testimonials` so /json never drifts from human Testimonials section. */
  references: testimonials
    ? Object.values(testimonials).map((testimonial) => ({
        name: testimonial.author,
        reference: testimonial.quote,
        position: testimonial.position,
        company: testimonial.company,
      }))
    : [],
  projects: [
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
  ],
  technical: {
    operatingSystems: ["Windows", "Linux (Ubuntu, Debian)", "macOS"],
    databases: ["SQL Server", "PostgreSQL", "MongoDB", "Azure Cosmos DB", "Redis"],
    tools: ["Visual Studio", "VS Code", "Git", "Docker", "Kubernetes", "Terraform"],
    methodologies: ["Agile", "Scrum", "Kanban", "DevOps", "GitFlow"],
    testing: ["Unit Testing", "Integration Testing", "E2E Testing", "TDD", "BDD"],
    security: ["OWASP", "OAuth 2.0", "OpenID Connect", "Azure AD", "JWT"],
    performance: ["Caching", "Load Balancing", "CDN", "Performance Profiling"],
    softSkills: ["Communication", "Leadership", "Problem Solving", "Teamwork", "Mentoring"],
  },
};
