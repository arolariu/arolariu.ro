import type {Skill} from "@/types";

type SkillAreas = Readonly<"Frontend" | "Backend" | "Tools & Technologies" | "Architecture & Design">;

// eslint-disable-next-line functional/type-declaration-immutability -- broken, fix.
type SkillStructure = Readonly<{
  title: Readonly<SkillAreas>;
  skills: ReadonlyArray<Skill>;
}>;

export const skills: ReadonlyArray<SkillStructure> = [
  {
    title: "Frontend",
    skills: [
      {name: "JavaScript/TypeScript", level: 95},
      {name: "React", level: 95},
      {name: "Svelte", level: 65},
    ],
  },
  {
    title: "Backend",
    skills: [
      {name: "Node.js", level: 80},
      {name: "Python", level: 75},
      {name: "C#/.NET", level: 95},
      {name: "REST APIs", level: 85},
    ],
  },
  {
    title: "Tools & Technologies",
    skills: [
      {name: "Git", level: 85},
      {name: "Docker", level: 85},
      {name: "SQL Databases", level: 90},
      {name: "Microsoft Azure", level: 95},
    ],
  },
  {
    title: "Architecture & Design",
    skills: [
      {name: "Microservices", level: 95},
      {name: "Serverless Architecture", level: 80},
      {name: "Design Patterns", level: 95},
      {name: "API Design", level: 95},
    ],
  },
];

