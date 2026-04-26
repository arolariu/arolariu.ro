import {describe, expect, it} from "vitest";
import {deriveUniqueArtifactOrigins, WEBLLM_ARTIFACT_HOST_CSP_ORIGIN, WEBLLM_ARTIFACT_HOST_FULL, WEBLLM_BINARY_LIBRARY_HOST} from "./modelArtifactHosts";

describe("modelArtifactHosts", () => {
  describe("constants", () => {
    it("exports WEBLLM_ARTIFACT_HOST_FULL", () => {
      expect(WEBLLM_ARTIFACT_HOST_FULL).toBe("https://huggingface.co/mlc-ai");
    });

    it("exports WEBLLM_ARTIFACT_HOST_CSP_ORIGIN", () => {
      expect(WEBLLM_ARTIFACT_HOST_CSP_ORIGIN).toBe("https://huggingface.co");
    });

    it("exports WEBLLM_BINARY_LIBRARY_HOST", () => {
      expect(WEBLLM_BINARY_LIBRARY_HOST).toBe("https://raw.githubusercontent.com");
    });

    it("CSP origin is derived from full host", () => {
      const url = new URL(WEBLLM_ARTIFACT_HOST_FULL);
      const expectedOrigin = `${url.protocol}//${url.host}`;
      expect(WEBLLM_ARTIFACT_HOST_CSP_ORIGIN).toBe(expectedOrigin);
    });
  });

  describe("deriveUniqueArtifactOrigins", () => {
    it("extracts origin from single artifact host", () => {
      const origins = deriveUniqueArtifactOrigins(["https://huggingface.co/mlc-ai"]);
      expect(origins).toEqual(["https://huggingface.co"]);
    });

    it("deduplicates multiple hosts with same origin", () => {
      const origins = deriveUniqueArtifactOrigins([
        "https://huggingface.co/mlc-ai",
        "https://huggingface.co/other-org",
        "https://huggingface.co/mlc-ai/model-1",
      ]);
      expect(origins).toEqual(["https://huggingface.co"]);
    });

    it("preserves multiple distinct origins", () => {
      const origins = deriveUniqueArtifactOrigins([
        "https://huggingface.co/mlc-ai",
        "https://raw.githubusercontent.com/mlc-ai",
        "https://example.com/models",
      ]);
      expect(origins).toEqual(["https://example.com", "https://huggingface.co", "https://raw.githubusercontent.com"]);
    });

    it("returns sorted origins", () => {
      const origins = deriveUniqueArtifactOrigins([
        "https://z-domain.com/path",
        "https://a-domain.com/path",
        "https://m-domain.com/path",
      ]);
      expect(origins).toEqual(["https://a-domain.com", "https://m-domain.com", "https://z-domain.com"]);
    });

    it("handles empty input", () => {
      const origins = deriveUniqueArtifactOrigins([]);
      expect(origins).toEqual([]);
    });

    it("skips malformed URLs that throw URL constructor errors", () => {
      const origins = deriveUniqueArtifactOrigins([
        "https://valid.com/path",
        "not-a-url",
        "://malformed",
        "https://another-valid.com",
      ]);
      expect(origins).toEqual(["https://another-valid.com", "https://valid.com"]);
    });

    it("includes non-https schemes if they are valid URLs", () => {
      // Note: URL constructor accepts any valid scheme, including ftp, http, etc.
      // This test documents that behavior - deriveUniqueArtifactOrigins doesn't
      // filter by scheme, only by URL validity
      const origins = deriveUniqueArtifactOrigins([
        "https://example.com/path",
        "ftp://example.com/path",
      ]);
      expect(origins).toEqual(["ftp://example.com", "https://example.com"]);
    });

    it("preserves custom ports in origin", () => {
      const origins = deriveUniqueArtifactOrigins(["https://example.com:8080/path"]);
      expect(origins).toEqual(["https://example.com:8080"]);
    });

    it("handles http and https as distinct origins", () => {
      const origins = deriveUniqueArtifactOrigins([
        "http://example.com/path",
        "https://example.com/path",
      ]);
      expect(origins).toEqual(["http://example.com", "https://example.com"]);
    });

    it("strips path, query, and fragment from URLs", () => {
      const origins = deriveUniqueArtifactOrigins([
        "https://example.com/path/to/resource?query=param#fragment",
      ]);
      expect(origins).toEqual(["https://example.com"]);
    });

    it("derives correct origin from WEBLLM_ARTIFACT_HOST_FULL", () => {
      const origins = deriveUniqueArtifactOrigins([WEBLLM_ARTIFACT_HOST_FULL]);
      expect(origins).toEqual([WEBLLM_ARTIFACT_HOST_CSP_ORIGIN]);
    });
  });
});
