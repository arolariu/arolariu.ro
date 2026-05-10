/**
 * @fileoverview Pure mapper functions that transform typed source entries
 * (Experience / Education / Certificate / Testimonial) into the JSON Resume
 * v1.0.0 shape consumed by the `/json` route + `/rest/json` endpoint.
 *
 * Keeping these as standalone functions makes json.ts a thin composition
 * layer and ensures `/json` cannot drift from `/human` on entry count —
 * both views read from the same source arrays.
 */

import type {Certificate, Education, Experience, Testimonial} from "@/types";

import {parseList} from "./experiences";

/**
 * Experience → JSON Resume `work[]`.
 * `highlights`, `keywords`, and `achievements` are parsed from the
 * `#`-separated strings the human view also consumes.
 */
export function experienceToJsonResume(e: Experience) {
  return {
    name: e.company,
    position: e.title,
    url: e.url,
    startDate: e.startDate,
    endDate: e.endDate,
    summary: e.summary ?? e.description,
    highlights: parseList(e.responsibilities),
    location: e.location,
    keywords: parseList(e.techAndSkills),
    achievements: parseList(e.achievements),
  };
}

/** Education → JSON Resume `education[]`. */
export function educationToJsonResume(ed: Education) {
  return {
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
  };
}

/**
 * Certificate → JSON Resume `certificates[]`.
 * Microsoft-issued certs gain the canonical "Microsoft Certified:" prefix.
 */
export function certificateToJsonResume(c: Certificate) {
  const displayName = c.issuer === "Microsoft" ? `Microsoft Certified: ${c.name}` : c.name;
  return {
    name: displayName,
    date: c.issueDate,
    issuer: c.issuer,
    url: c.issuerUrl,
    code: c.code,
    validUntil: c.expirationDate ?? "No expiration",
    verificationUrl: c.issuerUrl,
  };
}

/** Testimonial → JSON Resume `references[]`. */
export function testimonialToReference(t: Testimonial) {
  return {
    name: t.author,
    reference: t.quote,
    position: t.position,
    company: t.company,
  };
}
