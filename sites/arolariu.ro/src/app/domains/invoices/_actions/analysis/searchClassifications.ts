"use server";

/**
 * @fileoverview Server Action for bounded canonical taxonomy search.
 * @module app/domains/invoices/_actions/analysis/searchClassifications
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import {
  searchTaxonomyCatalog,
  TaxonomySearchValidationError,
} from "@/lib/taxonomies/taxonomyCatalog.server";
import {createErrorResult, type ServerActionResult} from "@/lib/utils.server";
import {
  isSearchClassificationsInput,
  type ClassificationSearchResult,
} from "@/types/invoices";

type SearchClassificationsResult = ServerActionResult<readonly ClassificationSearchResult[]>;

/** Searches one generated taxonomy catalog without exposing raw artifact internals. */
export async function searchClassifications(input: unknown): Promise<SearchClassificationsResult> {
  return withSpan("api.actions.invoices.searchClassifications", async () => {
    try {
      addSpanEvent("bff.taxonomies.search.start");
      if (!isSearchClassificationsInput(input)) {
        addSpanEvent("bff.taxonomies.search.error");
        return {
          success: false,
          error: {code: "VALIDATION_ERROR", message: "Taxonomy search request is invalid."},
        };
      }

      const data = searchTaxonomyCatalog(input);
      addSpanEvent("bff.taxonomies.search.complete", {"taxonomy.result_count": data.length});
      return {success: true, data};
    } catch (error: unknown) {
      addSpanEvent("bff.taxonomies.search.error");
      if (error instanceof TaxonomySearchValidationError)
        return {success: false, error: {code: "VALIDATION_ERROR", message: error.message}};

      logWithTrace("error", "Taxonomy search failed.", undefined, "server");
      return createErrorResult(error, "Unable to search classification taxonomies.");
    }
  });
}
