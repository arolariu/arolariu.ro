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
