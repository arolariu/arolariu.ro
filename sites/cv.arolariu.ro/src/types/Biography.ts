/**
 * @fileoverview Type for the author's biography on `/human`.
 *
 * Five fixed narrative points rendered as paragraph blocks in the About
 * section. The fixed shape keeps copy easy to translate and re-order
 * without restructuring components.
 */

/**
 * Five-paragraph biography shown on the `/human` About section.
 *
 * Each `xPoint` is a single self-contained paragraph. The fixed shape is
 * intentional: rather than an array of arbitrary points, the named slots
 * make it easy to reorder paragraphs in markup without changing data.
 */
export type Biography = Readonly<{
  firstPoint: string;
  secondPoint: string;
  thirdPoint: string;
  fourthPoint: string;
  fifthPoint: string;
}>;
