/**
 * @fileoverview JSON Resume v1.0.0 export consumed by the `/json` route and
 * the `/rest/json` REST endpoint.
 *
 * Sections are either DERIVED (mapped inline from a typed source array) or
 * STATIC (imported from a sibling file in this directory):
 *
 *  - DERIVED: `work`, `education`, `certificates`, `references` —
 *    cannot drift from `/human` because they read the same source.
 *  - STATIC: `basics`, `volunteer`, `awards`, `skills`, `languages`,
 *    `interests`, `projects`, `technical` — JSON-Resume-only content
 *    in their own files.
 *
 * @see {@link ./json.test.ts} for the regression-guard sync tests.
 */

import {awards} from "./awards";
import {basics} from "./basics";
import {certificationsAsArray} from "./certifications";
import {educationAsArray} from "./education";
import {experiencesAsArray, parseList} from "./experiences";
import {interests} from "./interests";
import {jsonResumeSkills} from "./jsonResumeSkills";
import {jsonResumeTechnical} from "./jsonResumeTechnical";
import {languages} from "./languages";
import {projects} from "./projects";
import {testimonials} from "./testimonials";
import {volunteer} from "./volunteer";

const JSON_RESUME_SCHEMA = "https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json";

const meta = Object.freeze({
  version: "v2.1.0",
  canonical: "https://cv.arolariu.ro",
  /** Computed once at module load; rebuilds set this to deploy time. */
  lastModified: new Date().toISOString(),
  theme: "professional",
  format: "JSONResume",
  schemaVersion: "1.0.0",
  validationStatus: "valid",
});

export const jsonCVData = Object.freeze({
  $schema: JSON_RESUME_SCHEMA,
  meta,
  basics,

  /** Derived from `experiencesAsArray`. */
  work: Object.freeze(
    experiencesAsArray.map((experience) => ({
      name: experience.company,
      position: experience.title,
      url: experience.url,
      startDate: experience.startDate,
      endDate: experience.endDate,
      summary: experience.summary ?? experience.description,
      highlights: parseList(experience.responsibilities),
      location: experience.location,
      keywords: parseList(experience.techAndSkills),
      achievements: parseList(experience.achievements),
    })),
  ),

  volunteer,

  /** Derived from `educationAsArray`. */
  education: Object.freeze(
    educationAsArray.map((ed) => ({
      institution: ed.institution,
      url: ed.url,
      area: ed.area,
      studyType: ed.studyType,
      startDate: ed.startDate,
      endDate: ed.endDate,
      score: ed.score,
      courses: ed.courses,
      location: ed.location,
      status: ed.status,
      highlights: ed.highlights,
    })),
  ),

  awards,

  /** Derived from `certificationsAsArray`. Microsoft certs gain the canonical
   *  "Microsoft Certified:" prefix to match how they appear on the badge. */
  certificates: Object.freeze(
    certificationsAsArray.map((certification) => ({
      name: certification.issuer === "Microsoft" ? `Microsoft Certified: ${certification.name}` : certification.name,
      date: certification.issueDate,
      issuer: certification.issuer,
      url: certification.issuerUrl,
      code: certification.code,
      validUntil: certification.expirationDate ?? "No expiration",
      verificationUrl: certification.issuerUrl,
    })),
  ),

  skills: jsonResumeSkills,
  languages,
  interests,

  /** Derived from `testimonials`. */
  references: Object.freeze(
    Object.values(testimonials).map((testimonial) => ({
      name: testimonial.author,
      reference: testimonial.quote,
      position: testimonial.position,
      company: testimonial.company,
    })),
  ),

  projects,
  technical: jsonResumeTechnical,
});
