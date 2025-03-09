/** @format */

"use client";

import {useCallback, useEffect, useRef} from "react";

export function useBlobUrls() {
  // Use a ref to ensure the Map persists across renders
  const urlCache = useRef<Map<Blob, string>>(new Map());

  // Effect to clean up URLs on unmount
  useEffect(() => {
    return () => {
      urlCache.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      urlCache.current.clear();
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

  return {getUrl} as const;
}
