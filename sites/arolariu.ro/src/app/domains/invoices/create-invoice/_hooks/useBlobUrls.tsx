/** @format */

"use client";

import {useCallback, useEffect, useRef} from "react";

/**
 * Custom React hook that manages blob URLs to prevent memory leaks.
 *
 * This hook creates and caches URLs for Blob objects, and automatically
 * cleans up the URLs when the component unmounts by calling `URL.revokeObjectURL`.
 * @returns An object with a `getUrl` function that converts a Blob to a URL string.
 * The `getUrl` function is memoized and will return the same URL for the same Blob.
 * @example
 * ```tsx
 * function ImagePreview({ imageBlob }) {
 *   const { getUrl } = useBlobUrls();
 *   const imageUrl = getUrl(imageBlob);
 *
 *   return imageUrl ? <img src={imageUrl} alt="Preview" /> : null;
 * }
 * ```
 */
export default function useBlobUrls() {
  // Use a ref to ensure the Map persists across renders
  const urlCache = useRef<Map<Blob, string>>(new Map());

  // Effect to clean up URLs on unmount
  useEffect(() => {
    // Capture the ref's current value for the cleanup function
    // This fixes the ESLint warning
    const currentCache = urlCache.current;

    return () => {
      for (const url of currentCache.values()) {
        URL.revokeObjectURL(url);
      }
      currentCache.clear();
    };
  }, []);

  // Get a URL for a blob, creating it if needed
  const getUrl = useCallback((blob: Blob | null): string => {
    if (!blob) return "";

    // Return cached URL if we have one
    const cachedUrl = urlCache.current.get(blob);
    if (cachedUrl) return cachedUrl;

    // Create and cache new URL
    const url = URL.createObjectURL(blob);
    urlCache.current.set(blob, url);
    return url;
  }, []);

  // Revoke a URL for a blob, if it exists
  const revokeUrl = useCallback((blob: Blob): void => {
    const url = urlCache.current.get(blob);
    if (url) {
      URL.revokeObjectURL(url);

      urlCache.current.delete(blob);
    }
  }, []);

  return {getUrl, revokeUrl} as const;
}
