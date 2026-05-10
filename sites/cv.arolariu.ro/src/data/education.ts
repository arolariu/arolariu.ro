import type {Education} from "@/types";

type EducationKeys = Readonly<"aseBucharest" | "malmoSweden" | "portsmouthUK">;
type Educations = Readonly<Record<EducationKeys, Education>>;

/**
 * Education history.
 *
 * The `degree` / `institution` / `period` / `status` / `description` fields
 * drive the human view (`/human`). The optional `area`, `studyType`, ISO
 * date pair, `score`, `courses`, and `highlights` fields drive the JSON
 * Resume export (`/json` route) so the two views never drift on entry count.
 */
export const education: Readonly<Educations> = {
  portsmouthUK: {
    degree: "MSc. Data Science",
    institution: "University of Portsmouth",
    location: "Online (United Kingdom)",
    period: "2024 - 2024",
    status: "Interrupted",
    url: "https://www.port.ac.uk",
    description:
      "Enrolled in the online MSc. Data Science program at the University of Portsmouth, UK. Interrupted due to professional commitments and career priorities in 2024.",
    area: "Data Science",
    studyType: "Master of Science",
    startDate: "2024",
    endDate: "2024",
    courses: [
      "Data Science Fundamentals",
      "Machine Learning",
      "Statistical Analysis",
      "Big Data Technologies",
      "Data Visualization",
      "Python for Data Science",
    ],
    highlights: [
      "Online distance learning program",
      "Focus on applied data science methodologies",
      "Interrupted to prioritize career growth at Microsoft",
    ],
  },
  malmoSweden: {
    degree: "MSc. Internet of Things & Network Engineering",
    institution: "Malmö University",
    location: "Malmö, Sweden",
    period: "2023 - 2024",
    status: "Interrupted",
    url: "https://mau.se",
    description:
      "Previously enrolled in the MSc. Internet of Things program at Malmö University, Sweden. Interrupted due to personal and unforeseen circumstances in 2024.",
    area: "Internet of Things & Network Engineering",
    studyType: "Master of Science",
    startDate: "2023",
    endDate: "2024",
    courses: [
      "Internet of Things",
      "Cloud Computing",
      "Data Science",
      "Machine Learning",
      "Artificial Intelligence",
      "Computer Vision",
      "Robotics",
    ],
    highlights: [
      "Focus on IoT architecture and implementation",
      "Research in cloud-based IoT solutions",
      "Advanced networking protocols for constrained devices",
    ],
  },
  aseBucharest: {
    degree: "BSc. Computer Science & Economics",
    institution: "Academia de Studii Economice",
    location: "Bucharest, Romania",
    period: "2019 - 2022",
    status: "Completed",
    url: "https://ase.ro",
    description:
      "Bachelor's degree in Computer Science and Economy from the Bucharest University of Economic Studies in Bucharest, Romania. Finished in top 1% according to thesis rating statistics.",
    area: "Computer Science & Economics",
    studyType: "Bachelor of Science",
    startDate: "2019",
    endDate: "2022",
    score: "Top 1% according to thesis rating statistics",
    courses: [
      "Software Engineering",
      "Computer Networks",
      "Operating Systems",
      "Algorithms & Data Structures",
      "Database Management Systems",
      "Web Development",
      "Mobile Development",
    ],
    highlights: [
      "Thesis: 'Implementation of a Microservices Architecture for E-Commerce Platforms'",
      "GPA: 9.8/10",
      "Active member of the Computer Science Student Association",
    ],
  },
} as const;

/**
 * Converts the education object to an array format for easier iteration in components.
 * This is useful for rendering lists of education items in the UI.
 * This array will contain all education entries defined in the `education` object.
 */
export const educationAsArray: ReadonlyArray<Education> = Object.freeze(Object.values(education));
