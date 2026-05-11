/**
 * @fileoverview Type for the author's identity / contact card.
 *
 * Single source consumed by both the human view (Hero, Contact, Footer)
 * and the JSON Resume export (`basics.ts` composes from this).
 */

/**
 * Author identity, contact, and external-profile URLs.
 *
 * `age` is computed dynamically at module load in {@link author} so the
 * value never goes stale.
 */
export type PersonalInformation = Readonly<{
  /** Full display name. */
  name: string;
  /** Age in years; computed from birth year at module load. */
  age: number;
  /** Display location (city, country). */
  location: string;
  /** Role tagline (pipe-separated multi-role string). */
  title: string;
  /** Contact email. */
  email: string;
  /** Personal website URL (canonical). */
  website: string;
  /** LinkedIn profile URL. */
  linkedin: string;
  /** GitHub profile URL. */
  github: string;
  /** Geographic region label (e.g. `"Romania / European Union"`). */
  region: string;
  /** 1-sentence elevator-pitch summary. */
  summary: string;
}>;
