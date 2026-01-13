import type {Education} from "@/types";

type EducationKeys = Readonly<"aseBucharest" | "malmoSweden" | "portsmouthUK">;
type Educations = Readonly<Record<EducationKeys, Education>>;

/**
 * This object contains the education history of the individual.
 * Each key corresponds to a specific educational institution or program.
 * The values are objects containing details about the degree, institution, location, period, status, and description.
 */
export const education: Readonly<Educations> = {
  portsmouthUK: {
    degree: "MSc. Data Science",
    institution: "University of Portsmouth",
    location: "Online (United Kingdom)",
    period: "2024 - 2024",
    status: "Interrupted",
    eduUrl: "https://www.port.ac.uk",
    description:
      "Enrolled in the online MSc. Data Science program at the University of Portsmouth, UK. Interrupted due to professional commitments and career priorities in 2024.",
  },
  malmoSweden: {
    degree: "MSc. Internet of Things & Network Engineering",
    institution: "Malmö University",
    location: "Malmö, Sweden",
    period: "2023 - 2024",
    status: "Interrupted",
    eduUrl: "https://mau.se",
    description:
      "Previously enrolled in the MSc. Internet of Things program at Malmö University, Sweden. Interrupted due to personal and unforeseen circumstances in 2024.",
  },
  aseBucharest: {
    degree: "BSc. Computer Science & Economics",
    institution: "Academia de Studii Economice",
    location: "Bucharest, Romania",
    period: "2019 - 2022",
    status: "Completed",
    eduUrl: "https://ase.ro",
    description:
      "Bachelor's degree in Computer Science and Economy from the Bucharest University of Economic Studies in Bucharest, Romania. Finished in top 1% according to thesis rating statistics.",
  },
} as const;

/**
 * Converts the education object to an array format for easier iteration in components.
 * This is useful for rendering lists of education items in the UI.
 * This array will contain all education entries defined in the `education` object.
 */
export const educationAsArray: ReadonlyArray<Education> = Object.freeze(Object.values(education));
