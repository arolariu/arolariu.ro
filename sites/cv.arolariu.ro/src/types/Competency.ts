/**
 * @fileoverview Type for a single core-competency card on `/human`.
 *
 * The Competencies section renders a fixed set of these as iconed cards.
 * Title + description is the only data needed; the icon glyph is chosen
 * by the component based on the competency key.
 */

/**
 * A single core competency rendered as a card on `/human`.
 */
export type Competency = Readonly<{
  /** Card heading (1-3 words). */
  title: string;
  /** Card body paragraph (1-2 sentences). */
  description: string;
}>;
