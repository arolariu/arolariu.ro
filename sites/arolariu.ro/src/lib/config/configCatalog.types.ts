/**
 * @fileoverview Types and runtime guards for exp catalog responses.
 * @module sites/arolariu.ro/src/lib/config/configCatalog.types
 */

/**
 * Supported caller targets returned by exp catalog endpoint.
 */
export type ConfigCatalogTarget = "api" | "website";

/**
 * Typed catalog response returned by `/api/v2/catalog?for=<target>`.
 */
export type ConfigCatalogResponse = Readonly<{
  target: ConfigCatalogTarget;
  version: string;
  requiredKeys: ReadonlyArray<string>;
  optionalKeys: ReadonlyArray<string>;
  allowedPrefixes: ReadonlyArray<string>;
  refreshIntervalSeconds: number;
  fetchedAt?: string;
}>;

function isStringArray(entries: unknown): entries is string[] {
  return Array.isArray(entries) && entries.every((entry) => typeof entry === "string");
}

/**
 * Runtime type guard for catalog payloads.
 * @param value - Unknown payload to validate.
 * @returns True when payload matches catalog response shape.
 */
export function isConfigCatalogResponse(value: unknown): value is ConfigCatalogResponse {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<ConfigCatalogResponse>;

  return (
    (candidate.target === "api" || candidate.target === "website")
    && typeof candidate.version === "string"
    && isStringArray(candidate.requiredKeys)
    && isStringArray(candidate.optionalKeys)
    && isStringArray(candidate.allowedPrefixes)
    && typeof candidate.refreshIntervalSeconds === "number"
  );
}
