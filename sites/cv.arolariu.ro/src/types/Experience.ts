export type Experience = Readonly<{
  title: string;
  company: string;
  location: string;
  description: string;
  period: string;

  /* This string is separated via the special # character. */
  responsibilities: string;

  /* This string is separated via the special # character. */
  achievements: string;

  /* This string is separated via the special # character. */
  techAndSkills: string;
}>;
