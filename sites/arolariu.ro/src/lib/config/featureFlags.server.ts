/**
 * @fileoverview Server-only feature flag resolution via the exp config proxy.
 *
 * Feature flags are fetched as individual config values through the single-key
 * endpoint, not through the bulk run-time document. This keeps the config client
 * surface simple: every value goes through `fetchConfigValue(name)`.
 *
 * @module sites/arolariu.ro/src/lib/config/featureFlags.server
 */

// eslint-disable-next-line n/no-extraneous-import -- server-only is a Next.js build-time marker
import "server-only";

import {fetchConfigValue, invalidateConfigCache} from "@/lib/config/configProxy";
import {DEFAULT_FEATURE_FLAGS, type WebsiteFeatureFlags} from "@/lib/config/featureFlags.types";

export {DEFAULT_FEATURE_FLAGS, type WebsiteFeatureFlags} from "@/lib/config/featureFlags.types";

/** Feature flag key names — always fetched fresh (cache invalidated before each read). */
const FLAG_KEYS = ["website.commander.enabled", "website.web-vitals.enabled"] as const;

/**
 * Fetches website feature flags from the exp config proxy.
 *
 * Feature flags are always fetched fresh — the cache is invalidated before
 * each read so flag changes take effect on the next request without waiting
 * for the normal config TTL to expire.
 *
 * When exp is unavailable, returns {@link DEFAULT_FEATURE_FLAGS} so the
 * website always renders.
 *
 * @returns Resolved feature flags, or defaults on any failure.
 */
export async function getWebsiteFeatureFlags(): Promise<WebsiteFeatureFlags> {
  try {
    // Invalidate cached flag values so changes are picked up immediately.
    for (const key of FLAG_KEYS) {
      invalidateConfigCache(key);
    }

    const [commanderRaw, webVitalsRaw] = await Promise.all([
      fetchConfigValue("website.commander.enabled").catch(() => "false"),
      fetchConfigValue("website.web-vitals.enabled").catch(() => "false"),
    ]);

    return {
      commanderEnabled: commanderRaw === "true",
      webVitalsEnabled: webVitalsRaw === "true",
    };
  } catch {
    return DEFAULT_FEATURE_FLAGS;
  }
}
