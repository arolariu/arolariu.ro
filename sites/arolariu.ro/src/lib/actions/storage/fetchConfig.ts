"use server";

import {CONFIG_STORE} from "@/lib/utils.generic";
import {AppConfigurationClient} from "@azure/app-configuration";

/**
 * Server action that fetches a configuration value from Azure App Configuration.
 * @param key The key of the configuration value to fetch.
 * @returns The value of the configuration value, if available.
 */
export default async function fetchConfigurationValue(key: string): Promise<string> {
  console.log("Trying to fetch the following key:", key);
  const client = new AppConfigurationClient(CONFIG_STORE);
  const setting = await client.getConfigurationSetting({key});
  return setting.value ?? "";
}
