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

  /**
   * Optional metadata used by the JSON Resume export (`/json` route).
   * The human view does not render these fields directly.
   */

  /** Company URL — feeds JSON Resume `work[].url`. */
  url?: string;

  /** Start of role in ISO format (`YYYY` or `YYYY-MM`). */
  startDate?: string;

  /** End of role; `null` for current. ISO format when set. */
  endDate?: string | null;

  /**
   * Personal contribution summary (1 sentence) for JSON Resume `work[].summary`.
   * If absent, the JSON export falls back to `description`.
   */
  summary?: string;
}>;
