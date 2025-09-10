import {jsonCVData as resume} from "@/data/json";
import {json, type RequestHandler} from "@sveltejs/kit";

/**
 * Unified CV endpoint.
 * Returns:
 *  - pdf: structured (two-column) representation used by the PDF view
 *  - resume: JSON Resume schema representation
 *  - meta: small envelope with versioning & timestamps
 *
 * NOTE:
 *  - Keep payload stable; additive changes only to avoid breaking external consumers.
 *  - Consider ETag / cache headers later if needed (small payload now).
 */
export const GET: RequestHandler = () => {
  return json(
    {
      resume,
      meta: {
        format: "cv.bundle",
        version: "1.0.0",
        resumeSchema: resume?.$schema ?? "unknown",
        generatedAt: new Date().toISOString(),
        source: "cv.arolariu.ro",
      },
    },
    {
      headers: {
        // Allow embedding / external consumption
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=300",
      },
    },
  );
};
