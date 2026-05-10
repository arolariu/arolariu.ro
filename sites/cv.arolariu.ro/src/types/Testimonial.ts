/**
 * @fileoverview Type for a single testimonial / peer reference.
 *
 * Feeds the `/human` Testimonials carousel and the JSON Resume
 * `references[]` array on `/json`.
 */

/**
 * A single testimonial from a colleague or peer.
 *
 * Most testimonials are deliberately anonymous (`author: "Anonymous"`) —
 * the position + company carry the credibility signal.
 */
export type Testimonial = Readonly<{
  /** Quote author name, or `"Anonymous"` to preserve confidentiality. */
  author: string;
  /** Author's job title at the time of the quote. */
  position: string;
  /** Author's employer at the time of the quote. */
  company: string;
  /** The quote body (single paragraph). */
  quote: string;
}>;
