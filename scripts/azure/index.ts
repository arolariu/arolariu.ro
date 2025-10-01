import {DefaultAzureCredential} from "@azure/identity";
import {SecretClient} from "@azure/keyvault-secrets";

/**
 * This function checks if a given value is a Key Vault reference.
 * A Key Vault reference is expected to be a JSON string with a "uri" field
 * that contains the Key Vault URL, typically in the format:
 * "https://<vault-name>.vault.azure.net/secrets/<secret-name>/<version>".
 * @param value The value to check.
 * @returns True if the value is a Key Vault reference, false otherwise.
 */

export function isKeyVaultRef(value: string): boolean {
  try {
    const parsed = JSON.parse(value);
    return parsed?.uri?.includes("vault.azure.net");
  } catch {
    return false;
  }
}

/**
 * This function retrieves a secret from Azure Key Vault.
 * It expects the Key Vault URI to be in the format:
 * "https://<vault-name>.vault.azure.net/secrets/<secret-name>/<version>".
 * It extracts the secret name from the URI and uses the Azure SDK to fetch the secret value.
 * If the secret is not found or has no value, it throws an error.
 * @param uri The Key Vault URI in the format "https://<vault-name>.vault.azure.net/secrets/<secret-name>/<version>".
 * @throws Error if the URI is invalid or if the secret cannot be retrieved.
 * @returns The value of the secret as a string.
 * @example
 * const secretValue = await getSecretFromKeyVault("https://myvault.vault.azure.net/secrets/mysecret/1234567890abcdef");
 */
export async function getSecretFromKeyVault(uri: string): Promise<string> {
  const url = new URL(uri);
  const secretName = url.pathname.split("/")[2];
  if (!secretName) throw new Error(`Invalid Key Vault URI: ${uri}`);

  const vaultUrl = `${url.protocol}//${url.host}`;
  console.log(`🔑 Fetching secret ${secretName} from Key Vault at ${vaultUrl}...`);

  const credential = new DefaultAzureCredential();
  const client = new SecretClient(vaultUrl, credential);
  const secret = await client.getSecret(secretName);

  if (!secret.value) throw new Error(`Secret ${secretName} has no value`);
  return secret.value;
}

/**
 * This function checks if a given key is a secret key.
 * It looks for common patterns in the key name that indicate it is a secret,
 * such as: "SECRET", "KEY", "JWT", "TOKEN", "PASSWORD".
 * @param key The key to check.
 * @returns True if the key is a secret key, false otherwise.
 */
export function isSecretKey(key: string): boolean {
  const secretPatternsType = ["SECRET", "KEY", "JWT", "TOKEN", "PASSWORD"];
  return secretPatternsType.some((pattern) => key.includes(pattern));
}
