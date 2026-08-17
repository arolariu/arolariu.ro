"use server";

/**
 * @fileoverview Server action for bounded canonical taxonomy search.
 * @module app/domains/invoices/_actions/analysis/searchClassifications
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import {TaxonomySearchValidationError, searchTaxonomyCatalog} from "@/lib/taxonomies/taxonomyCatalog.server";
import {createErrorResult, type ServerActionResult} from "@/lib/utils.server";
import type {ClassificationSearchResult, SearchClassificationsInput} from "@/types/invoices";

/**
 * Result returned from a taxonomy-search action invocation.
 */
type ServerActionOutputType = ServerActionResult<readonly ClassificationSearchResult[]>;

/**
 * Searches one generated taxonomy catalog without exposing artifact internals.
 *
 * @remarks
 * The server-only catalog validates its static artifact envelopes at module
 * initialization, validates this action input at runtime, and caps every result
 * set at fifty entries. Search text itself is not logged.
 *
 * @param input - System, non-empty query, and optional bounded result limit.
 * @returns Ranked bounded classification projections, or a standardized error result.
 */
export async function searchClassifications(input: Readonly<SearchClassificationsInput>): ServerActionOutputType {
  return withSpan("api.actions.invoices.searchClassifications", async () => {
    try {
      addSpanEvent("bff.taxonomies.search.start");
      const data = searchTaxonomyCatalog(input);
      addSpanEvent("bff.taxonomies.search.complete", {"taxonomy.result_count": data.length});
      return {success: true, data} as const;
    } catch (error) {
      addSpanEvent("bff.taxonomies.search.error");

      if (error instanceof TaxonomySearchValidationError) {
        return {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: error.message,
          },
        } as const;
      }

      logWithTrace("error", "Taxonomy search failed.", undefined, "server");
      return createErrorResult(error, "Unable to search classification taxonomies.");
    }
  }) satisfies ServerActionOutputType;
}
