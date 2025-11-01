"use server";

import {API_URL} from "@/lib/utils.server";

type BulkActionInputType = Readonly<{
  scans: ReadonlyArray<{
    file: File;
    name: string;
    type: string;
    uploadedAt: string;
  }>;
  userIdentifier: string;
  userJwt: string;
}>;

type BulkActionOutputType = Readonly<{
  success: boolean;
  results: ReadonlyArray<{
    scanName: string;
    success: boolean;
    error?: string;
    data?: unknown;
  }>;
  totalProcessed: number;
  totalFailed: number;
}>;

/**
 * Server action to create multiple invoices in batches.
 * Processes scans in batches of 10 for optimal performance.
 * @param input The input parameters for bulk invoice creation
 * @returns Promise resolving to the bulk operation results
 */
export async function bulkCreateInvoicesAction({
  scans,
  userIdentifier,
  userJwt,
}: BulkActionInputType): Promise<BulkActionOutputType> {
  const results: Array<{
    scanName: string;
    success: boolean;
    error?: string;
    data?: unknown;
  }> = [];

  const BATCH_SIZE = 10;
  let totalProcessed = 0;
  let totalFailed = 0;

  // Process scans in batches of 10
  for (let i = 0; i < scans.length; i += BATCH_SIZE) {
    const batch = scans.slice(i, i + BATCH_SIZE);
    
    // Process each batch item
    const batchPromises = batch.map(async (scan) => {
      try {
        const formData = new FormData();
        formData.append("file", scan.file);
        formData.append("userIdentifier", userIdentifier);
        formData.append("metadata", JSON.stringify({
          requiresAnalysis: "true",
          fileName: scan.name,
          fileType: scan.type,
          uploadedAt: scan.uploadedAt,
        }));

        const response = await fetch(`${API_URL}/rest/v2/invoices`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${userJwt}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          totalFailed++;
          return {
            scanName: scan.name,
            success: false,
            error: `API request failed: ${response.status} ${response.statusText} - ${errorText}`,
          };
        }

        const data = await response.json();
        totalProcessed++;
        return {
          scanName: scan.name,
          success: true,
          data,
        };
      } catch (error) {
        console.error(`Error processing scan ${scan.name}:`, error);
        totalFailed++;
        return {
          scanName: scan.name,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    });

    // Wait for batch to complete before moving to next batch
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return {
    success: totalFailed === 0,
    results,
    totalProcessed,
    totalFailed,
  };
}
