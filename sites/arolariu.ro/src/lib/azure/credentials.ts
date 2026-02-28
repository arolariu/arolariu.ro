/**
 * @fileoverview Centralized Azure credential singleton for server-side use only.
 *
 * DefaultAzureCredential handles token lifecycle internally — it caches tokens
 * and refreshes them ~5 min before expiry. The singleton never "expires".
 *
 * @module sites/arolariu.ro/src/lib/azure/credentials
 */

"use server";

import {DefaultAzureCredential, type TokenCredential} from "@azure/identity";

let cachedCredential: TokenCredential | null = null;

/**
 * Returns a singleton DefaultAzureCredential instance.
 * In production, uses AZURE_CLIENT_ID for User Assigned Managed Identity.
 * In development, falls back to Azure CLI / environment credentials.
 *
 * This function is server-only — enforced by "use server" directive.
 */
export function getAzureCredential(): TokenCredential {
  if (!cachedCredential) {
    const clientId = process.env["AZURE_CLIENT_ID"];
    cachedCredential = clientId
      ? new DefaultAzureCredential({managedIdentityClientId: clientId})
      : new DefaultAzureCredential();
  }
  return cachedCredential;
}
