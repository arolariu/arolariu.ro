/**
 * @fileoverview Types for professional certifications displayed on `/human`
 * and exported as JSON Resume `certificates[]` on `/json`.
 */

/**
 * Issuing authority for a certification. Constrained to the two issuers we
 * currently carry so the `/human` Education view can group them visually
 * (Microsoft block vs. GitHub block).
 */
export type CertificateCategory = "Microsoft" | "GitHub";

/**
 * A single professional certification.
 *
 * @remarks
 * `name` is the short marketing name (e.g. `"Azure Fundamentals"`). For the
 * JSON Resume export, Microsoft certs get the canonical `"Microsoft
 * Certified: "` prefix added by the json.ts mapper.
 */
export type Certificate = Readonly<{
  /** Short marketing name (without issuer prefix). */
  name: string;
  /** Issuing authority's display name. */
  issuer: string;
  /** Issuer URL (Microsoft Learn page for the cert, GitHub Certifications page, etc.). */
  issuerUrl?: string;
  /** Exam code shown as the visual identifier on `/human` cards (e.g. `"AZ-900"`). */
  code: string;
  /** Year the certification was earned, in `YYYY` format. */
  issueDate: string;
  /** Issuer grouping for the `/human` cert layout. */
  category: CertificateCategory;
  /** Optional expiration date; absent means "No expiration". */
  expirationDate?: string;
  /** Optional one-line marketing description (currently unused in views). */
  description?: string;
  /** Alternative URL (currently unused; reserved for future link variants). */
  url?: string;
  /** Optional difficulty/tier label (currently unused; reserved for future use). */
  level?: string;
}>;
