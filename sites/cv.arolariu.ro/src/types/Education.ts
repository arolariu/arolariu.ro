export type Education = Readonly<{
  degree: string;
  institution: string;
  location: string;
  description: string;
  period: string;
  status: string;

  /** Institution URL — used by both human view (optional) and JSON Resume export. */
  url?: string;

  /**
   * Optional metadata used by the JSON Resume export (`/json` route).
   * The human view does not render these fields directly.
   */

  /** Field of study, e.g. "Data Science". Feeds JSON Resume `education[].area`. */
  area?: string;

  /** Type of degree, e.g. "Master of Science". Feeds JSON Resume `education[].studyType`. */
  studyType?: string;

  /** Start year/date in ISO format (`YYYY` or `YYYY-MM`). */
  startDate?: string;

  /** End year/date in ISO format. */
  endDate?: string;

  /** Optional GPA / score note. */
  score?: string;

  /** Notable courses for JSON Resume `education[].courses[]`. */
  courses?: ReadonlyArray<string>;

  /** Optional highlights for the JSON export. */
  highlights?: ReadonlyArray<string>;
}>;
