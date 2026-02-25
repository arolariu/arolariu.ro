"use server";

/**
 * @fileoverview Server action for preparing direct scan uploads via SAS URLs.
 * @module lib/actions/scans/prepareScanUpload
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import {type Scan, ScanStatus} from "@/types/scans";
import {DefaultAzureCredential} from "@azure/identity";
import {BlobSASPermissions, BlobServiceClient, generateBlobSASQueryParameters, SASProtocol} from "@azure/storage-blob";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";
import {getScansStorageConfiguration, getStorageAccountName} from "./storageConfig";
import {createScanBlobName, generateScanId, mimeTypeToScanType} from "./uploadHelpers";

type PrepareScanUploadInput = Readonly<{
  fileName: string;
  mimeType: string;
  sizeInBytes: number;
}>;

type PrepareScanUploadOutput = Promise<
  Readonly<{
    status: number;
    uploadUrl: string;
    metadata: Record<string, string>;
    scan: Scan;
  }>
>;

/**
 * Prepares a user-scoped direct upload URL and scan metadata.
 */
export async function prepareScanUpload({fileName, mimeType, sizeInBytes}: PrepareScanUploadInput): PrepareScanUploadOutput {
  return withSpan("api.actions.scans.prepareScanUpload", async () => {
    addSpanEvent("bff.user.fetch.start");
    const {userIdentifier} = await fetchBFFUserFromAuthService();
    addSpanEvent("bff.user.fetch.complete");

    if (!userIdentifier) {
      throw new Error("User must be authenticated to prepare scan uploads");
    }

    const scanId = generateScanId();
    const timestamp = Date.now();
    const blobName = createScanBlobName({
      userIdentifier,
      scanId,
      fileName,
      timestampMs: timestamp,
    });

    const {containerName, storageEndpoint} = getScansStorageConfiguration();
    const storageAccountName = getStorageAccountName(storageEndpoint);
    const storageCredentials = new DefaultAzureCredential();

    addSpanEvent("azure.storage.connect.start");
    const storageClient = new BlobServiceClient(storageEndpoint, storageCredentials);
    const containerClient = storageClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    addSpanEvent("azure.storage.connect.complete");

    const startsOn = new Date(Date.now() - 5 * 60 * 1000);
    const expiresOn = new Date(Date.now() + 20 * 60 * 1000);

    addSpanEvent("azure.sas.generate.start");
    const delegationKey = await storageClient.getUserDelegationKey(startsOn, expiresOn);
    const sasToken = generateBlobSASQueryParameters(
      {
        startsOn,
        expiresOn,
        containerName,
        blobName,
        protocol: SASProtocol.Https,
        permissions: BlobSASPermissions.parse("cw"),
      },
      delegationKey,
      storageAccountName,
    ).toString();
    addSpanEvent("azure.sas.generate.complete");

    const uploadedAt = new Date().toISOString();
    const metadata = {
      userIdentifier,
      scanId,
      uploadedAt,
      originalFileName: fileName,
      status: ScanStatus.READY,
    };

    const uploadUrl = `${blockBlobClient.url}?${sasToken}`;
    const scan: Scan = {
      id: scanId,
      userIdentifier,
      name: fileName,
      blobUrl: blockBlobClient.url,
      mimeType,
      sizeInBytes,
      scanType: mimeTypeToScanType(mimeType),
      uploadedAt: new Date(uploadedAt),
      status: ScanStatus.READY,
      metadata: {
        originalFileName: fileName,
      },
    };

    logWithTrace(
      "info",
      "Prepared direct scan upload",
      {
        "scan.id": scanId,
        "scan.blob_name": blobName,
      },
      "server",
    );

    return {
      status: 200,
      uploadUrl,
      metadata,
      scan,
    } as const;
  });
}

