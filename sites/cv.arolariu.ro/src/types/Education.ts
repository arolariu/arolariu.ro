/**
 * @fileoverview Type for an academic-history entry.
 *
 * Drives both the `/human` Education card list and the JSON Resume
 * `education[]` export. The first six fields feed the human view; the
 * optional fields below feed `/json` so the two views never drift.
 */

/**
 * A single education entry (degree program, certification course, etc.).
 *
 * The split between required (human-view) and optional (JSON-Resume-only)
 * fields is deliberate: the human view renders period + status + degree +
 * institution + description; everything else is JSON-Resume metadata for
 * the `/json` and `/rest/json` consumers.
 */
export type Education = Readonly<{
  /** Degree title (e.g. `"MSc. Data Science"`). */
  degree: string;
  /** Institution name. */
  institution: string;
  /** Display location (free-form). */
  location: string;
  /** Multi-sentence description for the human-view card. */
  description: string;
  /** Human-readable period (e.g. `"2024 - 2024"`). */
  period: string;
  /** Display status (e.g. `"Completed"`, `"Interrupted"`). */
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
