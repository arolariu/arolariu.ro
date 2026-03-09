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

import {fetchConfigValue} from "@/lib/config/configProxy";
import {DEFAULT_FEATURE_FLAGS, type WebsiteFeatureFlags} from "@/lib/config/featureFlags.types";

export {DEFAULT_FEATURE_FLAGS, type WebsiteFeatureFlags} from "@/lib/config/featureFlags.types";

/**
 * Fetches website feature flags from the exp config proxy.
 *
 * Each flag is resolved via `fetchConfigValue(flagKey)`. When exp is
 * unavailable, returns {@link DEFAULT_FEATURE_FLAGS} so the website
 * always renders.
 *
 * @returns Resolved feature flags, or defaults on any failure.
 */
export async function getWebsiteFeatureFlags(): Promise<WebsiteFeatureFlags> {
  try {
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
