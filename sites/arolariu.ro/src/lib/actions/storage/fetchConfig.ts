/**
 * @fileoverview Server action for reading configuration via the config proxy.
 * @module sites/arolariu.ro/src/lib/actions/storage/fetchConfig
 */

"use server";

import {fetchConfigValue} from "@/lib/config/configProxy";

/**
 * Server action that fetches a configuration value.
 * Delegates to the exp.arolariu.ro config proxy.
 * @param key - The key of the configuration value to fetch.
 * @returns The value of the configuration value, if available.
 */
export default async function fetchConfigurationValue(key: string): Promise<string> {
  return fetchConfigValue(key);
}
