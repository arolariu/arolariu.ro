"use client";

/**
 * @fileoverview Hook for managing scan rotation with canvas pipeline.
 * @module app/domains/invoices/_hooks/scan/useScanRotation
 *
 * @remarks
 * Rotates image scans in the browser using Canvas, persists the new binary
 * content through the standalone scan update server action, and cache-busts the
 * scan URL in the scans Zustand store after a successful upload.
 */

import {useScansStore} from "@/stores";
import type {CachedScan} from "@/types/scans";
import {toast} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {useCallback, useState} from "react";
import {updateScan} from "../../_actions/scans";

/**
 * Hook output type for scan rotation.
 */
type HookOutputType = Readonly<{
  /** Whether a rotation operation is in progress */
  isRotating: boolean;
  /** Rotates the scan in the specified direction */
  rotateScanCallback: (direction: "cw" | "ccw") => Promise<void>;
}>;

/**
 * Manages scan rotation state and canvas-based rotation pipeline.
 *
 * @remarks
 * **Behavior contract:**
 * - `rotateScanCallback(direction)` executes the following pipeline:
 *   1. Sets `isRotating→true`
 *   2. Fetches scan blob from blobUrl
 *   3. Loads image into Image element
 *   4. Creates canvas and rotates by ±90° (cw=90, ccw=-90)
 *   5. Converts canvas to Blob (JPEG, 0.92 quality)
 *   6. Converts Blob to base64 via FileReader
 *   7. Calls `updateScan` server action with rotated blob
 *   8. Updates Zustand store via `updateScanBlobUrl` with cache-busted URL
 *   9. Shows success toast
 *   10. Sets `isRotating→false` in `finally` block
 * - On error at each step: shows error toast, sets `isRotating→false`
 * - PDF scans are rejected with error toast (rotation not supported)
 *
 * **Canvas Pipeline Details:**
 * - Canvas dimensions are swapped for 90°/270° rotations
 * - Image is drawn centered with rotation applied
 * - Original blob URL is revoked after processing to prevent memory leaks
 *
 * @param scan - The image scan to rotate. PDF scans are rejected as unsupported.
 * @returns Hook state with rotation progress and the rotate callback.
 *
 * @example
 * ```tsx
 * const rotation = useScanRotation(scan);
 *
 * return (
 *   <>
 *     <button onClick={() => rotation.rotateScanCallback("cw")} disabled={rotation.isRotating}>
 *       Rotate Right
 *     </button>
 *     <button onClick={() => rotation.rotateScanCallback("ccw")} disabled={rotation.isRotating}>
 *       Rotate Left
 *     </button>
 *     {rotation.isRotating && <Spinner />}
 *   </>
 * );
 * ```
 */
export function useScanRotation(scan: CachedScan): Readonly<HookOutputType> {
  const t = useTranslations();
  const updateScanBlobUrl = useScansStore((state) => state.updateScanBlobUrl);

  const [isRotating, setIsRotating] = useState(false);

  const rotateScanCallback = useCallback(
    async (direction: "cw" | "ccw"): Promise<void> => {
      if (!scan.blobUrl || scan.mimeType === "application/pdf") {
        toast.error(t((m) => m.pages.invoices.viewScans.scanCard.actions.rotateUnsupported));
        return;
      }

      const degrees = direction === "cw" ? 90 : -90;
      setIsRotating(true);

      try {
        // 1. Fetch image data directly (avoids CORS)
        const response = await fetch(scan.blobUrl);
        const imageBlob = await response.blob();
        const objectUrl = URL.createObjectURL(imageBlob);

        const img = new globalThis.Image();
        await new Promise<void>((resolve, reject) => {
          img.addEventListener("load", () => resolve(), {once: true});
          img.addEventListener("error", () => reject(new Error("Failed to load image")), {once: true});
          img.src = objectUrl;
        });

        // 2. Create rotated canvas
        const canvas = document.createElement("canvas");
        canvas.width = img.height;
        canvas.height = img.width;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          throw new Error("Failed to get canvas context");
        }

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((degrees * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        // 3. Convert to blob
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => {
              if (b) resolve(b);
              else reject(new Error("Failed to create blob"));
            },
            "image/jpeg",
            0.92,
          );
        });

        // 4. Convert to base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.addEventListener(
            "loadend",
            () => {
              const result = reader.result as string;
              resolve(result.split(",")[1]!);
            },
            {once: true},
          );
          reader.addEventListener("error", () => reject(new Error("Failed to read blob")), {once: true});
          reader.readAsDataURL(blob);
        });

        // 5. Extract blob name from URL (include scans/ prefix)
        const blobName = scan.blobUrl.split("/").slice(-3).join("/");

        // 6. Upload rotated image
        const result = await updateScan({
          base64Data: base64,
          blobName,
          mimeType: "image/jpeg",
          metadata: {rotated: "true"},
        });

        // 7. Clean up object URL
        URL.revokeObjectURL(objectUrl);

        // 8. Update scan in store (append cache-buster to force browser to re-fetch rotated image)
        if (result.success) {
          const {blobUrl} = result.data;
          const cacheBustedUrl = `${blobUrl}?t=${Date.now()}`;
          updateScanBlobUrl(scan.id, cacheBustedUrl);
          toast.success(t((m) => m.pages.invoices.viewScans.scanCard.actions.rotateSuccess));
        } else {
          toast.error(t((m) => m.pages.invoices.viewScans.scanCard.actions.rotateError));
        }
      } catch (error) {
        toast.error(t((m) => m.pages.invoices.viewScans.scanCard.actions.rotateError));
        console.error("Error rotating scan:", error);
      } finally {
        setIsRotating(false);
      }
    },
    [scan.blobUrl, scan.id, scan.mimeType, t, updateScanBlobUrl],
  );

  return {isRotating, rotateScanCallback};
}
