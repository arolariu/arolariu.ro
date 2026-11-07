/**
 * @fileoverview Native attestations, provenance, storage records, and bundle types.
 * @module github/scripts/helpers/sdk/attest
 *
 * @remarks
 * Preserves upstream signing/provenance options and result types. Importing
 * this surface does not sign or upload evidence. Explicit attestation calls
 * need the supported Actions identity/permissions and separate operational
 * approval; the facade grants neither and does not request a token itself.
 *
 * @example
 * ```typescript
 * // Within an explicitly approved Actions provenance operation:
 * import {buildSLSAProvenancePredicate} from "./attest.ts";
 * const predicate = await buildSLSAProvenancePredicate();
 * ```
 *
 * @see https://github.com/actions/toolkit/blob/main/packages/attest/README.md
 */
export * from "@actions/attest";
