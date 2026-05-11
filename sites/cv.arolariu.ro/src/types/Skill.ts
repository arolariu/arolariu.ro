/**
 * @fileoverview Types for the bento-mosaic Skills section on `/human`.
 *
 * Distinct from {@link JsonResumeSkill}: this shape carries tile-importance
 * hierarchy (hero / lg / md / sm) while the JSON Resume variant carries
 * proficiency-level groups. Cannot be derived from one another.
 */

/**
 * Tile size in the bento mosaic. Drives both the grid-item span class
 * (`spanHero` / `spanLg` / `spanMd` / `spanSm`) and the inner tile
 * styling (padding + typography variants).
 */
export type SkillTileSize = "hero" | "lg" | "md" | "sm";

/**
 * Optional accent tint on hero + large tiles. Maps to the semantic accent
 * aliases declared in `_tokens.scss` (`--cv-accent-primary/secondary/success`).
 */
export type SkillAccent = "primary" | "secondary" | "success";

/**
 * A single tile in the bento mosaic.
 *
 * @remarks
 * `label` and `caption` are optional editorial flourishes — the hero tile
 * uses both; small tiles use neither.
 */
export type Skill = Readonly<{
  /** Primary tile content (displayed in Caudex on hero/lg/md, body font on sm). */
  name: string;
  /** Importance tier — drives layout span and typography variant. */
  size: SkillTileSize;
  /** Small-caps eyebrow label (e.g. `"Cloud"`, `"Discipline"`). */
  label?: string;
  /** Hero-tile-only descriptor sentence. */
  caption?: string;
  /** Optional radial-gradient accent tint (hero + large tiles only). */
  accent?: SkillAccent;
}>;
