/**
 * @fileoverview JSON Resume v1.0.0 export consumed by the `/json` route and
 * the `/rest/json` REST endpoint.
 *
 * The shape is composed from three places:
 *  - **Mappers** (`./json.mappers`) transform typed source entries
 *    (`Experience`, `Education`, `Certificate`, `Testimonial`) into JSON
 *    Resume shapes. Sections built this way *cannot* drift from `/human`.
 *  - **Static sections** (`./json.static`) carry JSON-Resume-only content
 *    that has no typed source elsewhere (volunteer, awards, the
 *    proficiency-shaped skills list, languages, interests, projects,
 *    technical inventory).
 *  - **`testimonials`** are mapped to `references[]` directly here.
 *
 * @see {@link ./json.test.ts} for the regression-guard sync tests.
 */

import {certificationsAsArray} from "./certifications";
import {educationAsArray} from "./education";
import {experiencesAsArray} from "./experiences";
import {
  certificateToJsonResume,
  educationToJsonResume,
  experienceToJsonResume,
  testimonialToReference,
} from "./json.mappers";
import {AWARDS, BASICS, INTERESTS, JSON_RESUME_SKILLS, LANGUAGES, META, PROJECTS, TECHNICAL, VOLUNTEER} from "./json.static";
import {testimonials} from "./testimonials";

const JSON_RESUME_SCHEMA = "https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json";

/** Composed JSON Resume export. Sections marked DERIVED are mapped from
 *  typed source arrays; sections marked STATIC come from `json.static.ts`. */
export const jsonCVData = {
  $schema: JSON_RESUME_SCHEMA,
  meta: META, // STATIC
  basics: BASICS, // STATIC
  work: experiencesAsArray.map(experienceToJsonResume), // DERIVED
  volunteer: VOLUNTEER, // STATIC
  education: educationAsArray.map(educationToJsonResume), // DERIVED
  awards: AWARDS, // STATIC
  certificates: certificationsAsArray.map(certificateToJsonResume), // DERIVED
  skills: JSON_RESUME_SKILLS, // STATIC (different shape from /human bento)
  languages: LANGUAGES, // STATIC
  interests: INTERESTS, // STATIC
  references: Object.values(testimonials).map(testimonialToReference), // DERIVED
  projects: PROJECTS, // STATIC
  technical: TECHNICAL, // STATIC
};
