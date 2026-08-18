"use server";

/**
 * @fileoverview Server action for bounded canonical taxonomy search.
 * @module app/domains/invoices/_actions/analysis/searchClassifications
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import {TaxonomySearchValidationError, searchTaxonomyCatalog} from "@/lib/taxonomies/taxonomyCatalog.server";
import {createErrorResult, type ServerActionResult} from "@/lib/utils.server";
import {isSearchClassificationsInput, type ClassificationSearchResult} from "@/types/invoices";

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
 * @param input - Untrusted server-action payload containing the taxonomy system, query, and optional result limit.
 * @returns Ranked bounded classification projections, or a standardized error result.
 */
export async function searchClassifications(input: unknown): ServerActionOutputType {
  return withSpan("api.actions.invoices.searchClassifications", async () => {
    try {
      addSpanEvent("bff.taxonomies.search.start");
      if (!isSearchClassificationsInput(input)) {
        addSpanEvent("bff.taxonomies.search.error");
        return {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Taxonomy search request is invalid.",
          },
        };
      }

      const {system, query, limit} = input;
      const data = searchTaxonomyCatalog({
        system,
        query,
        ...(limit === undefined ? {} : {limit}),
      });
      addSpanEvent("bff.taxonomies.search.complete", {"taxonomy.result_count": data.length});
      return {success: true, data};
    } catch (error) {
      addSpanEvent("bff.taxonomies.search.error");

      if (error instanceof TaxonomySearchValidationError) {
        return {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: error.message,
          },
        };
      }

      logWithTrace("error", "Taxonomy search failed.", undefined, "server");
      return createErrorResult(error, "Unable to search classification taxonomies.");
    }
  }) satisfies ServerActionOutputType;
}
