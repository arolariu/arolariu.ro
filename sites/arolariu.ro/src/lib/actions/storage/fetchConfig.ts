/**
 * @fileoverview Server-only helper for reading a single configuration value via the config proxy.
 *
 * @remarks
 * This module intentionally does **not** carry a `"use server"` directive.
 * A `"use server"` file-level directive would register every exported function
 * as an RPC-callable Server Action, making it reachable from the browser and
 * creating an arbitrary config-relay attack surface.
 *
 * Consumers must call this helper exclusively from other server-side code
 * (Server Components, API Route Handlers, or other `server-only` modules).
 * The `server-only` import below enforces this at build time.
 *
 * @module sites/arolariu.ro/src/lib/actions/storage/fetchConfig
 */

// eslint-disable-next-line n/no-extraneous-import -- server-only is a Next.js build-time marker
import "server-only";

import {fetchConfigValue} from "@/lib/config/configProxy";

/**
 * Fetches a single configuration value from the exp config proxy.
 *
 * @param key - Config key to read (must be declared in the website exp registry).
 * @returns The string value for `key`, or an empty string if the key is
 *   optional and absent.
 * @throws When `key` is required and the proxy cannot resolve it.
 */
export default async function fetchConfigurationValue(key: string): Promise<string> {
  return fetchConfigValue(key);
}
