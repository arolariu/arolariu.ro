/**
 * @fileoverview Feature flag types and defaults shared between server and client.
 *
 * This module intentionally does NOT import "server-only" so it can be consumed
 * by both Server Components and Client Components. The actual flag resolution
 * lives in `featureFlags.server.ts` (server-only).
 *
 * @module sites/arolariu.ro/src/lib/config/featureFlags.types
 */

/** Default feature flag values used when exp is unavailable. */
export const DEFAULT_FEATURE_FLAGS: WebsiteFeatureFlags = {
  commanderEnabled: false,
  webVitalsEnabled: false,
};

/** Resolved feature flag state for the website. */
export type WebsiteFeatureFlags = {
  readonly commanderEnabled: boolean;
  readonly webVitalsEnabled: boolean;
};
