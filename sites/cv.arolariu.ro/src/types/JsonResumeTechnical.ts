/**
 * JSON Resume `technical` block — flat technical-skills inventory.
 *
 * Distinct from {@link TechInfo} / {@link Footer} (UI chrome metadata in
 * `data/technical.ts`).
 */
export type JsonResumeTechnical = Readonly<{
  operatingSystems: ReadonlyArray<string>;
  databases: ReadonlyArray<string>;
  tools: ReadonlyArray<string>;
  methodologies: ReadonlyArray<string>;
  testing: ReadonlyArray<string>;
  security: ReadonlyArray<string>;
  performance: ReadonlyArray<string>;
  softSkills: ReadonlyArray<string>;
}>;
