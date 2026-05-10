/**
 * @fileoverview Barrel re-export of every data source used by components
 * and views. Importing from `@/data` (rather than the individual file)
 * keeps consumer imports stable when files move or rename.
 *
 * Roughly grouped: identity → narrative → professional → JSON Resume
 * static sections → composed JSON export → UI strings → chrome.
 */

// Author / personal information
export {author} from "./author";

// Biography
export {biography} from "./biography";

// Professional experience (typed source for /human + /json work[])
export {experiences, experiencesAsArray} from "./experiences";

// Education (typed source for /human + /json education[])
export {education, educationAsArray} from "./education";

// Certifications (typed source for /human + /json certificates[])
export {certifications, certificationsAsArray} from "./certifications";

// Competencies (/human only)
export {competencies} from "./competencies";

// Skills bento mosaic (/human view)
export {skills} from "./skills";

// Testimonials — feeds /human Testimonials section + /json references[]
export {testimonials, testimonialsAsArray} from "./testimonials";

// JSON Resume static sections
export {awards} from "./awards";
export {basics} from "./basics";
export {interests} from "./interests";
export {jsonResumeSkills} from "./jsonResumeSkills";
export {jsonResumeTechnical} from "./jsonResumeTechnical";
export {languages} from "./languages";
export {projects} from "./projects";
export {volunteer} from "./volunteer";

// Composed JSON Resume export
export {jsonCVData} from "./json";

// Landing page strings + help dialog content
export {help, landing} from "./landing";

// UI string catalog
export {ui} from "./viewdata";

// UI chrome metadata (footer, techInfo)
export {footer, techInfo} from "./technical";
