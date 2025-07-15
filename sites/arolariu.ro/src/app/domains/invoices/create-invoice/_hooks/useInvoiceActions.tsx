/** @format */

"use client";

import {useUserInformation} from "@/hooks";
import uploadInvoice from "@/lib/actions/invoices/uploadInvoice";
import {extractBase64FromBlob} from "@/lib/utils.client";
import {toast} from "@arolariu/components";
import {useCallback} from "react";
import {useInvoiceCreator} from "../_context/InvoiceCreatorContext";
import type {InvoiceScan} from "../_types/InvoiceScan";
import {createInvoiceScan, revokeScanUrl, rotateImageScan, validateFile} from "../_utils/invoiceScanUtils";

/**
 * This hook provides actions for managing invoice scans.
 * It includes functions to handle client-side uploads, server-side uploads,
 * rotating scans, deleting scans, and resetting the state.
 * @returns An object containing functions to manage invoice scans:
 * - `resetState`: Resets the state of scans and upload status.
 * - `handleImageClientSideUpload`: Handles client-side file uploads.
 * - `handleImageServerSideUpload`: Handles server-side uploads of scans.
 * - `handleRotateScan`: Rotates an image scan 90 degrees clockwise.
 * - `handleDeleteScan`: Deletes a scan and provides an undo option.
 * @throws Error if an unexpected error occurs during upload or rotation.
 */
export function useInvoiceActions() {
  const {userInformation} = useUserInformation();
  const {scans, setScans, setUploadStatus} = useInvoiceCreator();

  const resetState = useCallback(() => {
    // Use functional approach with side effects
    for (const scan of scans) revokeScanUrl(scan);
    setScans([]);
    setUploadStatus("UNKNOWN");
  }, [scans, setScans, setUploadStatus]);

  const handleImageClientSideUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const processFiles = (files: FileList) => {
        const fileArray = [...files];

        // Process files using functional approach
        const validScans: InvoiceScan[] = [];
        const errors: string[] = [];

        for (const file of fileArray) {
          const validationError = validateFile(file);
          if (validationError) {
            errors.push(validationError.message);
          } else {
            const scan = createInvoiceScan(file);
            validScans.push(scan);
          }
        }

        return {validScans, errors};
      };

      const showSuccessToast = (count: number) => {
        toast("Upload successful", {
          description: `${count} file(s) uploaded successfully.`,
          duration: 5000,
          style: {
            backgroundColor: "green",
            color: "white",
          },
          icon: <span className='text-white'>✔️</span>,
        });
      };

      const showErrorToasts = (errors: string[]) => {
        for (const error of errors) {
          toast("Upload error", {
            description: error,
            duration: 5000,
            style: {
              backgroundColor: "red",
              color: "white",
            },
            icon: <span className='text-white'>❌</span>,
          });
        }
      };

      try {
        event.preventDefault();
        setUploadStatus("PENDING__CLIENTSIDE");
        const {files} = event.target;

        if (files && files.length > 0) {
          const {validScans, errors} = processFiles(files);

          // Update state with new scans
          if (validScans.length > 0) {
            setScans((prevScans) => [...prevScans, ...validScans]);
            setUploadStatus("SUCCESS__CLIENTSIDE");
            showSuccessToast(validScans.length);
          }

          // Show errors if any
          if (errors.length > 0) {
            showErrorToasts(errors);
            if (validScans.length === 0) {
              setUploadStatus("FAILURE__CLIENTSIDE");
            }
          }
        }
      } catch (error: unknown) {
        console.error(">>> Error in handleImageClientSideUpload:", error as Error);
        setUploadStatus("FAILURE__CLIENTSIDE");
        toast("Upload failed", {
          description: "An unexpected error occurred during upload.",
          duration: 5000,
          style: {
            backgroundColor: "red",
            color: "white",
          },
          icon: <span className='text-white'>❌</span>,
        });
      }
    },
    [setScans, setUploadStatus],
  );

  const handleImageServerSideUpload = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>) => {
      try {
        event.preventDefault();
        setUploadStatus("PENDING__SERVERSIDE");
        const scansCopy = [...scans];

        // Process scans sequentially using Promise.all with map
        await Promise.all(
          scansCopy.map(async (scan) => {
            const blobInformation = await extractBase64FromBlob(scan.blob);
            const {status} = await uploadInvoice({blobInformation, userInformation});

            if (status === "SUCCESS") {
              setScans((currentScans) => {
                const updatedScans = currentScans.filter((currentScan) => currentScan.id !== scan.id);
                // Clean up the blob URL for the uploaded scan
                revokeScanUrl(scan);
                return updatedScans;
              });
            }
          }),
        );

        setUploadStatus("SUCCESS__SERVERSIDE");
      } catch (error: unknown) {
        console.error(">>> Error in handleImageServerSideUpload:", error as Error);
        setUploadStatus("FAILURE__SERVERSIDE");
      }
    },
    [scans, userInformation, setScans, setUploadStatus],
  );

  const handleRotateScan = useCallback(
    async (scanId: string) => {
      try {
        const scanToRotate = scans.find((scan) => scan.id === scanId);
        if (!scanToRotate) {
          console.error("Scan not found for rotation:", scanId);
          return;
        }

        if (scanToRotate.type !== "image") {
          toast("PDF files cannot be rotated.", {
            duration: 4000,
          });
          return;
        }

        const rotatedScan = await rotateImageScan(scanToRotate);

        setScans((currentScans) => currentScans.map((scan) => (scan.id === scanId ? rotatedScan : scan)));
      } catch (error) {
        console.error("Error rotating scan:", error);
        toast("Failed to rotate image", {
          description: "An error occurred while rotating the image.",
          duration: 4000,
          style: {
            backgroundColor: "red",
            color: "white",
          },
        });
      }
    },
    [scans, setScans],
  );

  const handleDeleteScan = useCallback(
    (scanId: string) => {
      const scanToDelete = scans.find((scan) => scan.id === scanId);
      if (!scanToDelete) {
        console.error("Scan not found for deletion:", scanId);
        return;
      }

      // Create a copy for potential undo
      const scanCopy = {...scanToDelete};

      // Remove scan from state
      setScans((currentScans) => currentScans.filter((scan) => scan.id !== scanId));

      // Clean up the blob URL
      revokeScanUrl(scanToDelete);

      toast("File deleted!", {
        duration: 4000,
        action: {
          label: "Undo",
          onClick: () => {
            setScans((currentScans) => {
              // Find appropriate insertion position (try to maintain original order)
              const insertIndex = currentScans.findIndex((scan) => scan.createdAt > scanCopy.createdAt);

              if (insertIndex === -1) {
                // Add to end if no later scan found
                return [...currentScans, scanCopy];
              }

              // Insert at the found position using functional approach
              return [...currentScans.slice(0, insertIndex), scanCopy, ...currentScans.slice(insertIndex)];
            });
          },
        },
      });
    },
    [scans, setScans],
  );

  return {
    resetState,
    handleImageClientSideUpload,
    handleImageServerSideUpload,
    handleRotateScan,
    handleDeleteScan,
  };
}
