import {jsonCVData as resume} from "@/data/json";
import {json, type RequestHandler} from "@sveltejs/kit";

// Type-safe section keys
type SectionKey = "basics" | "work" | "education" | "skills" | "certificates" | "awards" | "volunteer" | "projects" | "languages" | "interests" | "references" | "technical" | "meta";

const AVAILABLE_SECTIONS: SectionKey[] = ["basics", "work", "education", "skills", "certificates", "awards", "volunteer", "projects", "languages", "interests", "references", "technical"];

/**
 * Creates a deterministic ETag from the resume data.
 */
function generateETag(data: unknown): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `"cv-${Math.abs(hash).toString(36)}"`;
}

/**
 * Extracts a specific section from the resume.
 */
function getSection(sectionName: string): unknown | undefined {
  const resumeObj = resume as Record<string, unknown>;
  if (AVAILABLE_SECTIONS.includes(sectionName as SectionKey)) {
    return resumeObj[sectionName];
  }
  return undefined;
}

/**
 * CV JSON API endpoint.
 *
 * Query Parameters:
 *  - section: Return only a specific section (basics, work, education, skills, etc.)
 *  - format: "full" (default), "minimal" (basics + work only), "resume" (raw resume)
 *  - pretty: "true" for pretty-printed output
 */
export const GET: RequestHandler = ({request, url}) => {
  const section = url.searchParams.get("section");
  const format = url.searchParams.get("format") ?? "full";
  const pretty = url.searchParams.get("pretty") === "true";

  let responseData: unknown;

  // Handle section-specific requests
  if (section) {
    const sectionData = getSection(section);
    if (sectionData === undefined) {
      return json(
        {
          error: `Section '${section}' not found`,
          availableSections: AVAILABLE_SECTIONS,
        },
        {status: 404}
      );
    }
    responseData = {
      section,
      data: sectionData,
      meta: {
        source: "cv.arolariu.ro",
        generatedAt: new Date().toISOString(),
      },
    };
  }
  // Handle format=resume (raw JSON Resume)
  else if (format === "resume") {
    responseData = resume;
  }
  // Handle format=minimal
  else if (format === "minimal") {
    responseData = {
      basics: resume.basics,
      work: resume.work,
      meta: {
        format: "cv.minimal",
        version: "1.0.0",
        source: "cv.arolariu.ro",
        generatedAt: new Date().toISOString(),
      },
    };
  }
  // Default: full format
  else {
    responseData = {
      resume,
      meta: {
        format: "cv.bundle",
        version: "1.0.0",
        resumeSchema: resume?.$schema ?? "unknown",
        generatedAt: new Date().toISOString(),
        source: "cv.arolariu.ro",
        endpoints: {
          full: "/rest/json",
          resume: "/rest/json?format=resume",
          minimal: "/rest/json?format=minimal",
          sections: "/rest/json?section={name}",
        },
        availableSections: AVAILABLE_SECTIONS,
      },
    };
  }

  const etag = generateETag(responseData);
  const ifNoneMatch = request.headers.get("If-None-Match");

  if (ifNoneMatch === etag) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: etag,
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      },
    });
  }

  const body = pretty ? JSON.stringify(responseData, null, 2) : JSON.stringify(responseData);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, If-None-Match",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      ETag: etag,
      Vary: "Accept-Encoding",
    },
  });
};

export const OPTIONS: RequestHandler = () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, If-None-Match",
      "Access-Control-Max-Age": "86400",
    },
  });
};
