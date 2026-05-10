/**
 * @fileoverview Type for a `skills[]` entry in the JSON Resume export.
 */

/**
 * JSON Resume `skills[]` entry — proficiency-level skill group.
 *
 * Distinct from {@link Skill} (the human-view bento mosaic): this shape
 * carries `level`, `keywords`, `yearsOfExperience`, and `projects` per the
 * JSON Resume v1.0.0 schema.
 */
export type JsonResumeSkill = Readonly<{
  name: string;
  level: string;
  keywords: ReadonlyArray<string>;
  yearsOfExperience?: number;
  projects?: ReadonlyArray<string>;
}>;
