import type {Competency} from "@/types";

type CompetencyKeys =
  | "engineeringExcellence"
  | "testDrivenDevelopment"
  | "domainDrivenDesign"
  | "customerCentric"
  | "agileMethodologies"
  | "algorithmicSkills";

type CompetenciesMap = Readonly<Record<CompetencyKeys, Competency>>;

export const competencies: Readonly<CompetenciesMap> = {
  engineeringExcellence: {
    title: "Engineering Excellence",
    description:
      "Alexandru is passionate about delivering the best solutions for the problem and for the customer. He is always striving to deliver the best software and to follow understood engineering excellence practices.",
  },
  testDrivenDevelopment: {
    title: "Test-Driven Development (TDD)",
    description:
      "Alexandru is a firm believer of test-driven development. He constantly applies this approach to his projects and he is always trying to improve his testing skills.",
  },
  domainDrivenDesign: {
    title: "Domain-Driven Design (DDD)",
    description:
      "Alexandru follows domain-driven design principles strongly. He is able to combine DDD with TDD to create complex solutions that are easy to maintain and extend.",
  },
  customerCentric: {
    title: "Customer Centric",
    description:
      "Alexandru has been working with customers for many years, in his tenure at Microsoft. He has gained a lot of knowledge and is able to put himself in the shoes of the customer.",
  },
  agileMethodologies: {
    title: "Agile Methodologies",
    description:
      "Alexandru has learned about agile working and agile methodologies since he was a student in his BSc degree. He follows the agile manifesto and is a big fan of the Kanban technique.",
  },
  algorithmicSkills: {
    title: "Algorithmic Skills",
    description:
      "Alexandru has completed many Hacker Rank, Hacker Earth and Leet Code challenges published from 2019 until 2021. He has a strong algorithmic thinking and is able to construct complex algorithms with ease.",
  },
} as const;
