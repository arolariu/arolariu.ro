/**
 * @fileoverview Types and runtime guards for single-key exp config responses.
 * @module sites/arolariu.ro/src/lib/config/configCatalog.types
 */

/**
 * Typed payload returned by `/api/v1/config?name=<config-key>`.
 */
export type ConfigValueResponse = Readonly<{
  name: string;
  value: string;
  availableForTargets: ReadonlyArray<string>;
  availableInDocuments: ReadonlyArray<string>;
  requiredInDocuments: ReadonlyArray<string>;
  description: string;
  usage: string;
  refreshIntervalSeconds: number;
  fetchedAt: string;
}>;

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

/**
 * Runtime type guard for single-key config payloads.
 * @param value - Unknown payload to validate.
 * @returns True when payload matches the exp config-value response shape.
 */
export function isConfigValueResponse(value: unknown): value is ConfigValueResponse {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<ConfigValueResponse>;

  return (
    typeof candidate.name === "string"
    && typeof candidate.value === "string"
    && isStringArray(candidate.availableForTargets)
    && isStringArray(candidate.availableInDocuments)
    && isStringArray(candidate.requiredInDocuments)
    && typeof candidate.description === "string"
    && typeof candidate.usage === "string"
    && typeof candidate.refreshIntervalSeconds === "number"
    && typeof candidate.fetchedAt === "string"
  );
}
