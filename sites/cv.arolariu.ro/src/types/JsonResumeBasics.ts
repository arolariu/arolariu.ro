/**
 * @fileoverview Types for the `basics` block in the JSON Resume export
 * (identity, contact, structured location, profiles).
 */

/**
 * JSON Resume `basics` block — identity, contact, profiles, location.
 *
 * Mirrors the JSON Resume v1.0.0 spec for the basics section. Distinct
 * from {@link PersonalInformation} (which feeds the human view); the
 * `basics.ts` data file composes from `author` and adds JSON-Resume-only
 * fields (profiles[], structured location, summary).
 */
export type JsonResumeProfile = Readonly<{
  network: string;
  username: string;
  url: string;
}>;

export type JsonResumeLocation = Readonly<{
  address: string;
  postalCode: string;
  city: string;
  countryCode: string;
  region: string;
}>;

export type JsonResumeBasics = Readonly<{
  name: string;
  label: string;
  image: string;
  email: string;
  url: string;
  summary: string;
  location: JsonResumeLocation;
  profiles: ReadonlyArray<JsonResumeProfile>;
}>;
