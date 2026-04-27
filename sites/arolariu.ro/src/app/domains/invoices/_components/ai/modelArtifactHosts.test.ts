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

    it("throws for malformed URLs", () => {
      expect(() => deriveUniqueArtifactOrigins(["not-a-url"])).toThrow("Invalid artifact host URL");
      expect(() => deriveUniqueArtifactOrigins(["://malformed"])).toThrow("Invalid artifact host URL");
    });

    it("throws for http:// protocol", () => {
      expect(() => deriveUniqueArtifactOrigins(["http://example.com/path"])).toThrow("Invalid artifact host protocol");
      expect(() => deriveUniqueArtifactOrigins(["http://example.com/path"])).toThrow("Only HTTPS is allowed");
    });

    it("throws for ftp:// protocol", () => {
      expect(() => deriveUniqueArtifactOrigins(["ftp://example.com/path"])).toThrow("Invalid artifact host protocol");
      expect(() => deriveUniqueArtifactOrigins(["ftp://example.com/path"])).toThrow("Only HTTPS is allowed");
    });

    it("throws for mixed valid and invalid protocols", () => {
      expect(() =>
        deriveUniqueArtifactOrigins([
          "https://valid.com/path",
          "http://invalid.com/path",
        ]),
      ).toThrow("Invalid artifact host protocol");
    });

    it("preserves custom ports in origin", () => {
      const origins = deriveUniqueArtifactOrigins(["https://example.com:8080/path"]);
      expect(origins).toEqual(["https://example.com:8080"]);
    });

    it("uses url.origin for CSP origin extraction", () => {
      const origins = deriveUniqueArtifactOrigins(["https://example.com:443/path?query=1#fragment"]);
      // url.origin includes default port 443 implicitly as https://example.com
      expect(origins).toEqual(["https://example.com"]);
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
