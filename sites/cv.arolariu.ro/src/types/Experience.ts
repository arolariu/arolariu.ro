/**
 * @fileoverview Type for a professional-experience entry.
 *
 * Drives both the `/human` Experience timeline and the JSON Resume
 * `work[]` export. The `responsibilities`, `achievements`, and
 * `techAndSkills` fields use a custom `#`-separated string format
 * (parsed at consumption time via `parseList()` in `experiences.ts`)
 * so authoring stays in the source file without inline array syntax.
 */

/**
 * A single professional role / position.
 *
 * @remarks
 * The `#`-separated fields are a deliberate authoring convenience: each
 * row in the source is a single string literal, easier to edit than nested
 * arrays. They're parsed into `string[]` at consumption time.
 */
export type Experience = Readonly<{
  /** Role title (e.g. `"Software Engineer II"`). */
  title: string;
  /** Employer name. */
  company: string;
  /** Display location (free-form, may include "Remote", "Hybrid", etc.). */
  location: string;
  /** Multi-sentence description of the team / org context. */
  description: string;
  /** Human-readable period string (e.g. `"03/2023 – 12/2024"`). */
  period: string;

  /** Role responsibilities — items separated by ` # `. Parsed via `parseList()`. */
  responsibilities: string;

  /** Notable achievements during the role — items separated by ` # `. */
  achievements: string;

  /** Technologies and skill keywords — items separated by ` # `. */
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
