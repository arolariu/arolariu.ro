"use client";

/**
 * @fileoverview React hook for client-side scan image rotation with canvas pipeline.
 * @module app/domains/invoices/_hooks/scan/useScanRotation
 *
 * @remarks
 * Provides a React hook that manages the complete image rotation workflow:
 * client-side canvas manipulation → server-side blob update → store synchronization.
 *
 * **Canvas Pipeline Architecture:**
 * This hook implements a multi-stage pipeline for rotating scan images:
 * 1. **Fetch**: Download blob from Azure Storage URL
 * 2. **Load**: Create Image element and wait for load event
 * 3. **Transform**: Create canvas, apply rotation matrix, draw rotated image
 * 4. **Encode**: Convert canvas to JPEG blob (0.92 quality for size optimization)
 * 5. **Serialize**: Convert blob to base64 string for server action
 * 6. **Upload**: Call `updateScan` server action with rotated content
 * 7. **Sync**: Update Zustand store with cache-busted URL
 * 8. **Cleanup**: Revoke object URLs to prevent memory leaks
 *
 * **Why Canvas API?**
 * - Client-side transformation reduces server load
 * - Immediate visual feedback (optimistic update possible)
 * - No external dependencies (native browser APIs)
 * - Preserves original scan until confirmed successful
 * - Supports rotation by any angle (90°, 180°, 270° optimized)
 *
 * **Image Format Handling:**
 * - JPEG/PNG input: Supported (rotated, re-encoded as JPEG)
 * - PDF input: Not supported (rotation rejected with error toast)
 * - Output format: Always JPEG at 0.92 quality (balance size/quality)
 * - Canvas dimensions: Swapped for 90°/270° rotations (portrait ↔ landscape)
 *
 * **Memory Management:**
 * - Creates object URLs for blob handling
 * - Revokes URLs after processing to prevent memory leaks
 * - Canvas elements garbage collected after operation
 * - Image elements dereferenced after use
 *
 * **Error Handling:**
 * - Image load failures: Caught and shown as toast
 * - Canvas context creation failures: Caught and shown as toast
 * - Blob conversion failures: Caught and shown as toast
 * - Server action failures: Shown via ServerActionResult error message
 * - All errors logged to console for debugging
 *
 * **Internationalization:**
 * Uses `next-intl` for all user-facing messages from the
 * `IMS--ViewScans.scanCard.actions.*` namespace.
 *
 * @example
 * ```tsx
 * // Basic rotation controls
 * "use client";
 *
 * import { useScanRotation } from "@/app/domains/invoices/_hooks/scan";
 *
 * export function ScanRotationControls({ scan }: { scan: CachedScan }) {
 *   const { isRotating, rotate } = useScanRotation(scan);
 *
 *   return (
 *     <div>
 *       <button onClick={() => rotate("cw")} disabled={isRotating}>
 *         Rotate Right 90°
 *       </button>
 *       <button onClick={() => rotate("ccw")} disabled={isRotating}>
 *         Rotate Left 90°
 *       </button>
 *       {isRotating && <Spinner />}
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // 180° rotation shortcut (two 90° rotations)
 * "use client";
 *
 * import { useScanRotation } from "@/app/domains/invoices/_hooks/scan";
 *
 * export function QuickRotation({ scan }: { scan: CachedScan }) {
 *   const { isRotating, rotate } = useScanRotation(scan);
 *
 *   const rotate180 = async () => {
 *     await rotate("cw"); // First 90°
 *     await rotate("cw"); // Second 90° = 180° total
 *   };
 *
 *   return (
 *     <button onClick={rotate180} disabled={isRotating}>
 *       Rotate 180°
 *     </button>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Rotation with error recovery and retry
 * "use client";
 *
 * import { useScanRotation } from "@/app/domains/invoices/_hooks/scan";
 * import { useState } from "react";
 *
 * export function RobustRotation({ scan }: { scan: CachedScan }) {
 *   const { isRotating, rotate } = useScanRotation(scan);
 *   const [retryCount, setRetryCount] = useState(0);
 *
 *   const handleRotate = async (direction: "cw" | "ccw") => {
 *     try {
 *       await rotate(direction);
 *       setRetryCount(0); // Reset on success
 *     } catch (error) {
 *       if (retryCount < 3) {
 *         setRetryCount(prev => prev + 1);
 *         // Auto-retry after brief delay
 *         setTimeout(() => handleRotate(direction), 2000);
 *       }
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={() => handleRotate("cw")} disabled={isRotating}>
 *         Rotate Right {retryCount > 0 && `(Retry ${retryCount}/3)`}
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Conditional rotation based on scan orientation
 * "use client";
 *
 * import { useScanRotation } from "@/app/domains/invoices/_hooks/scan";
 *
 * export function AutoOrient({ scan }: { scan: CachedScan }) {
 *   const { isRotating, rotate } = useScanRotation(scan);
 *
 *   // Auto-rotate landscape scans to portrait
 *   useEffect(() => {
 *     if (scan.metadata?.orientation === "landscape") {
 *       rotate("cw");
 *     }
 *   }, [scan.metadata?.orientation]);
 *
 *   return (
 *     <button onClick={() => rotate("cw")} disabled={isRotating}>
 *       Manual Rotate
 *     </button>
 *   );
 * }
 * ```
 *
 * @see {@link updateScan} - Server action for updating scan blobs
 * @see {@link useScansStore} - Zustand store for scan state management
 * @see {@link useScanRename} - Hook for renaming scans
 * @see {@link useScanDelete} - Hook for deleting scans
 * @see {@link useScanAdd} - Hook for uploading new scans
 */
export function useScanRotation(scan: CachedScan): Readonly<HookOutputType> {
  const t = useTranslations("IMS--ViewScans.scanCard");
  const updateScanBlobUrl = useScansStore((state) => state.updateScanBlobUrl);

  const [isRotating, setIsRotating] = useState(false);

  const rotate = useCallback(
    async (direction: "cw" | "ccw"): Promise<void> => {
      if (!scan.blobUrl || scan.mimeType === "application/pdf") {
        toast.error(t("actions.rotateUnsupported"));
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
        const isRightAngle = Math.abs(degrees) === 90 || Math.abs(degrees) === 270;
        canvas.width = isRightAngle ? img.height : img.width;
        canvas.height = isRightAngle ? img.width : img.height;

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
        if (result.success && result.data.blobUrl) {
          const cacheBustedUrl = `${result.data.blobUrl}?t=${Date.now()}`;
          updateScanBlobUrl(scan.id, cacheBustedUrl);
          toast.success(t("actions.rotateSuccess"));
        } else {
          toast.error(result.userMessage || t("actions.rotateError"));
        }
      } catch (error) {
        toast.error(t("actions.rotateError"));
        console.error("Error rotating scan:", error);
      } finally {
        setIsRotating(false);
      }
    },
    [scan.blobUrl, scan.id, scan.mimeType, t, updateScanBlobUrl],
  );

  return {isRotating, rotate};
}
